import fetch from 'node-fetch';
import FormData from 'form-data';
import { openaiService } from './openaiService';

class SpeechToTextService {
  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(audioBuffer: Buffer, filename: string = 'audio.mp3'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, filename);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Default to English, can be made dynamic

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Whisper API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as { text: string };
      return result.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Download audio from URL and transcribe
   */
  async transcribeFromUrl(audioUrl: string): Promise<string> {
    try {
      // For Twilio URLs, add basic authentication
      const isUrlFetch = audioUrl.startsWith('http');
      const headers: Record<string, string> = {};
      
      if (isUrlFetch && audioUrl.includes('api.twilio.com')) {
        // Twilio requires basic auth for audio downloads
        const accountSid = process.env.TWILIO_LIVE_SID || process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_LIVE_AUTH || process.env.TWILIO_AUTH_TOKEN;
        
        if (accountSid && authToken) {
          const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
          console.log('🔐 Using Twilio auth for audio download');
        } else {
          console.warn('⚠️ Missing Twilio credentials for audio download');
        }
      }

      // Download audio file with authentication
      const response = await fetch(audioUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const audioBuffer = await response.buffer();
      
      // Determine correct file extension based on URL or default to wav for Twilio recordings
      let filename = audioUrl.split('/').pop() || 'audio.wav';
      
      // Twilio recordings are typically WAV format - ensure proper extension
      if (audioUrl.includes('api.twilio.com') && !filename.includes('.')) {
        filename = filename + '.wav';
      } else if (audioUrl.includes('api.twilio.com') && !filename.match(/\.(wav|mp3|mp4|m4a|flac|ogg|webm)$/i)) {
        // If the filename doesn't have a recognized audio extension, assume WAV
        filename = filename.replace(/\.[^.]*$/, '.wav') || 'audio.wav';
      }
      
      console.log(`🎵 Processing audio file: ${filename} from ${audioUrl}`);
      
      return await this.transcribeAudio(audioBuffer, filename);
    } catch (error) {
      console.error('Error transcribing from URL:', error);
      throw error;
    }
  }

  /**
   * Process restaurant call transcription with context
   */
  async processRestaurantCall(
    transcription: string, 
    restaurantData: any,
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
  ): Promise<{ response: string; action: string; confidence: number; sentiment?: string; sentimentScore?: number }> {
    try {
      const systemPrompt = `You are an AI receptionist for ${restaurantData.businessName || 'a restaurant'}. 

Restaurant Information:
- Name: ${restaurantData.businessName || 'Restaurant'}
- Address: ${restaurantData.address || 'Not available'}
- Phone: ${restaurantData.phone || 'Not available'}
- Hours: ${restaurantData.hours || 'Please call for hours'}
- Specialties: ${restaurantData.menuItems?.slice(0, 5).join(', ') || 'Various dishes'}

Your Role:
- Be friendly, professional, and helpful
- Handle reservations, takeout orders, questions about menu/hours
- If you can't help with something, offer to transfer to a human staff member
- Keep responses conversational and under 35 words for faster speech synthesis
- Always maintain a warm, welcoming tone

Current customer said: "${transcription}"

Based on the conversation, provide a JSON response with:
1. An appropriate response (under 35 words)
2. What action should be taken
3. Your confidence level (0-100)
4. Customer sentiment analysis

IMPORTANT: You must respond with valid JSON only. No other text.

{
  "response": "Your spoken response to the customer",
  "action": "reservation|order|info|transfer|end_call",
  "confidence": 85,
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.8
}`;

      // Limit conversation history to last 3 exchanges for faster processing
      const recentHistory = conversationHistory.slice(-6); // 3 user + 3 assistant messages

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...recentHistory,
        { role: 'user' as const, content: transcription }
      ];

      const completion = await openaiService.createChatCompletion({
        model: 'gpt-4o-mini', // Faster model for 60-80% speed improvement
        messages: messages,
        max_tokens: 120, // Reduced for shorter responses
        temperature: 0.6, // Slightly lower for more consistent responses
        response_format: { type: "json_object" } // Enforce JSON output
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsedResponse = JSON.parse(responseText);
        return {
          response: parsedResponse.response,
          action: parsedResponse.action || 'info',
          confidence: parsedResponse.confidence || 70,
          sentiment: parsedResponse.sentiment || 'neutral',
          sentimentScore: parsedResponse.sentimentScore || 0.5
        };
      } catch (parseError) {
        console.warn('JSON parsing failed, using fallback response');
        // More structured fallback
        return {
          response: "How can I help you today?",
          action: 'info',
          confidence: 30,
          sentiment: 'neutral',
          sentimentScore: 0.5
        };
      }
    } catch (error) {
      console.error('Error processing restaurant call:', error);
      // Fallback response
      return {
        response: "I'm sorry, I didn't catch that. Could you please repeat your question?",
        action: 'info',
        confidence: 0,
        sentiment: 'neutral',
        sentimentScore: 0.5
      };
    }
  }

  /**
   * Analyze call sentiment
   */
  async analyzeSentiment(transcription: string): Promise<{ sentiment: 'positive' | 'neutral' | 'negative'; score: number }> {
    try {
      const prompt = `Analyze the sentiment of this customer interaction and respond with JSON:
      
      Customer said: "${transcription}"
      
      Respond in JSON format:
      {
        "sentiment": "positive|neutral|negative",
        "score": 0.85
      }
      
      Score should be 0-1 where 1 is very positive/negative and 0.5 is neutral.`;

      const completion = await openaiService.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.3
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return { sentiment: 'neutral', score: 0.5 };
      }

      try {
        const parsed = JSON.parse(responseText);
        return {
          sentiment: parsed.sentiment || 'neutral',
          score: parsed.score || 0.5
        };
      } catch {
        return { sentiment: 'neutral', score: 0.5 };
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { sentiment: 'neutral', score: 0.5 };
    }
  }
}

export const speechToTextService = new SpeechToTextService();