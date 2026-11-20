import { storage } from "../storage";
import type { InsertVoicePreset } from "@shared/schema";

interface GenerateMockAudioRequest {
  text: string;
  voiceId: string;
  agentId: string;
}

class VoiceService {
  async initializeVoicePresets(): Promise<void> {
    try {
      const presets: InsertVoicePreset[] = [
        {
          id: "sarah-professional",
          name: "Sarah",
          description: "Professional Female",
          gender: "female",
          ageRange: "30-40",
          personality: ["warm", "clear", "trustworthy"],
          sampleUrl: "/audio/sarah-sample.mp3",
        },
        {
          id: "marcus-authoritative",
          name: "Marcus", 
          description: "Professional Male",
          gender: "male",
          ageRange: "35-45",
          personality: ["confident", "authoritative", "calm"],
          sampleUrl: "/audio/marcus-sample.mp3",
        },
        {
          id: "emma-friendly",
          name: "Emma",
          description: "Friendly Female", 
          gender: "female",
          ageRange: "25-35",
          personality: ["energetic", "approachable", "youthful"],
          sampleUrl: "/audio/emma-sample.mp3",
        },
        {
          id: "david-mature",
          name: "David",
          description: "Mature Male",
          gender: "male", 
          ageRange: "45-55",
          personality: ["wise", "reassuring", "experienced"],
          sampleUrl: "/audio/david-sample.mp3",
        },
        {
          id: "maya-conversational", 
          name: "Maya",
          description: "Conversational Female",
          gender: "female",
          ageRange: "28-38", 
          personality: ["natural", "conversational", "relatable"],
          sampleUrl: "/audio/maya-sample.mp3",
        },
        {
          id: "alex-neutral",
          name: "Alex",
          description: "Neutral Voice",
          gender: "neutral",
          ageRange: "25-45",
          personality: ["neutral", "clear", "versatile"],
          sampleUrl: "/audio/alex-sample.mp3",
        },
      ];

      // Upsert all presets
      for (const preset of presets) {
        await storage.upsertVoicePreset(preset);
      }

      console.log("Voice presets initialized successfully");
    } catch (error) {
      console.error("Error initializing voice presets:", error);
    }
  }

  async generateMockAudio({ text, voiceId, agentId }: GenerateMockAudioRequest): Promise<string> {
    try {
      // Use the real audio generation if ElevenLabs API key is available
      if (process.env.ELEVENLABS_API_KEY) {
        return await this.generateRealAudio({ text, voiceId });
      }
      
      // Fallback to mock URL for development
      const mockAudioUrl = `/audio/generated/${agentId}-${voiceId}-${Date.now()}.mp3`;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAudioUrl;
    } catch (error) {
      console.error("Error generating audio:", error);
      throw new Error("Failed to generate audio");
    }
  }

  async generateRealAudio({ text, voiceId }: { text: string; voiceId: string }): Promise<string> {
    // Placeholder for ElevenLabs integration
    // When ready to integrate, replace this method with actual ElevenLabs API call
    try {
      // const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      //   method: 'POST',
      //   headers: {
      //     'Accept': 'audio/mpeg',
      //     'Content-Type': 'application/json',
      //     'xi-api-key': process.env.ELEVENLABS_API_KEY
      //   },
      //   body: JSON.stringify({
      //     text,
      //     model_id: 'eleven_monolingual_v1',
      //     voice_settings: {
      //       stability: 0.5,
      //       similarity_boost: 0.5
      //     }
      //   })
      // });
      
      // const audioBuffer = await response.arrayBuffer();
      // // Save to storage and return URL
      // return savedAudioUrl;
      
      // For now, return mock URL directly (avoid recursion)
      const mockAudioUrl = `/audio/generated/real_${Date.now()}-${voiceId}-${Date.now()}.mp3`;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAudioUrl;
    } catch (error) {
      console.error("Error generating real audio:", error);
      throw new Error("Failed to generate audio with ElevenLabs");
    }
  }
}

export const voiceService = new VoiceService();
