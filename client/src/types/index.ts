export interface DashboardStats {
  totalAgents: number;
  totalInteractions: number;
  avgResponseTime: string;
  satisfaction: string;
  activeAgents: number;
}

export interface AudioPlayerProps {
  audioUrl?: string;
  sampleText?: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}

export interface VoiceAgentFormData {
  name: string;
  description: string;
  industry: string;
  voiceId: string;
  isPublic: boolean;
}

export interface GeneratedAgentData {
  persona: string;
  sampleScript: string;
  audioUrl: string;
}
