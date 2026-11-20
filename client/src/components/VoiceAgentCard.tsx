import { Badge } from "@/components/ui/badge";
import AudioPlayer from "./AudioPlayer";
import { INDUSTRIES, type VoiceAgent, type Industry } from "@shared/schema";

interface VoiceAgentCardProps {
  agent: VoiceAgent;
  onClick?: () => void;
  className?: string;
}

export default function VoiceAgentCard({ agent, onClick, className = "" }: VoiceAgentCardProps) {
  const industryConfig = INDUSTRIES[agent.industry as Industry];
  
  const getStatusBadge = () => {
    if (agent.isPublic) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Private</Badge>;
  };

  return (
    <div
      className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${className}`}
      onClick={onClick}
      data-testid={`agent-card-${agent.id}`}
    >
      <div className="flex items-center space-x-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: industryConfig?.color || '#6366F1' }}
        >
          <i className={`${industryConfig?.icon || 'fas fa-robot'} text-sm`}></i>
        </div>
        <div>
          <p className="font-medium text-gray-900" data-testid={`agent-name-${agent.id}`}>
            {agent.name}
          </p>
          <p className="text-sm text-gray-500" data-testid={`agent-description-${agent.id}`}>
            {agent.description.length > 60 
              ? `${agent.description.substring(0, 60)}...` 
              : agent.description
            }
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {getStatusBadge()}
        {agent.audioUrl && (
          <AudioPlayer 
            audioUrl={agent.audioUrl} 
            sampleText={agent.sampleScript}
            className="w-8 h-8"
          />
        )}
      </div>
    </div>
  );
}
