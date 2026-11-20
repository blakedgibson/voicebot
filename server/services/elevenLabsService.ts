import axios from 'axios';
import FormData from 'form-data';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
}

class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private audioCache = new Map<string, Buffer>();

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ELEVENLABS_API_KEY not configured - TTS functionality disabled');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(
    text: string, 
    voiceId: string = 'EXAVITQu4vr4xnSDxMaL', 
    stability: number = 0.5, 
    similarityBoost: number = 0.75
  ): Promise<Buffer> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      console.log(`🎵 Converting text to speech: "${text.substring(0, 50)}..."`);
      
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      const audioBuffer = Buffer.from(response.data);
      console.log(`✅ Generated audio: ${audioBuffer.length} bytes`);
      
      return audioBuffer;
    } catch (error: any) {
      console.error('❌ ElevenLabs TTS error:', error.response?.data || error.message);
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices || [];
    } catch (error: any) {
      console.error('❌ Error fetching voices:', error.message);
      throw error;
    }
  }

  /**
   * Cache audio for reuse
   */
  async cacheAudio(key: string, audioBuffer: Buffer): Promise<void> {
    this.audioCache.set(key, audioBuffer);
    console.log(`💾 Cached audio: ${key}`);
  }

  /**
   * Get cached audio
   */
  async getCachedAudio(key: string): Promise<Buffer | null> {
    const cached = this.audioCache.get(key);
    if (cached) {
      console.log(`⚡ Cache hit: ${key}`);
      return cached;
    }
    console.log(`💨 Cache miss: ${key}`);
    return null;
  }

  /**
   * Clear audio cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.audioCache.delete(key);
      console.log(`🧹 Cleared cache: ${key}`);
    } else {
      this.audioCache.clear();
      console.log(`🧹 Cleared all audio cache`);
    }
  }
}

export const elevenLabsService = new ElevenLabsService();