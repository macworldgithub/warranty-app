export interface TranscribeResponse {
  transcript: string;
  confidence?: number;
  duration?: number;
  language?: string;
  source?: 'deepgram' | 'mock' | 'local';
}

export interface VoiceStatusResponse {
  isConfigured: boolean;
  engine: string;
  model: string;
  language: string;
}
