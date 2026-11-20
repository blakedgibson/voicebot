import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AudioPlayer from "./AudioPlayer";
import logoImage from "@assets/Screenshot_2025-09-07_at_12.57.13_PM-removebg-preview_1757268155334.png";

interface AgentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentData: {
    name: string;
    persona: string;
    sampleScript: string;
    audioUrl: string;
  };
  onSave: (isPublic: boolean) => void;
  isLoading?: boolean;
}

export default function AgentPreviewModal({
  isOpen,
  onClose,
  agentData,
  onSave,
  isLoading = false,
}: AgentPreviewModalProps) {
  const [isPublic, setIsPublic] = useState(false);

  const handleSave = () => {
    onSave(isPublic);
  };

  const getSampleConversation = () => {
    if (agentData.sampleScript) {
      // Try to parse if it's a conversation format
      const lines = agentData.sampleScript.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        return lines.map((line, index) => ({
          speaker: index % 2 === 0 ? 'Customer' : agentData.name,
          text: line.replace(/^(Customer|Agent|Patient|Client):\s*/, ''),
          isAgent: index % 2 === 1,
        }));
      }
    }
    
    // Default conversation
    return [
      {
        speaker: 'Customer',
        text: 'Hello, I need some assistance.',
        isAgent: false,
      },
      {
        speaker: agentData.name,
        text: agentData.sampleScript || "Hello! I'm here to help you. How can I assist you today?",
        isAgent: true,
      }
    ];
  };

  const conversation = getSampleConversation();

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="agent-preview-modal">
        <DialogHeader>
          <DialogTitle>Your Voice Agent is Ready!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Agent Header */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <img src={logoImage} alt="VoiceBot Logo" className="w-8 h-8 object-contain" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900" data-testid="agent-preview-name">
              {agentData.name}
            </h4>
            <p className="text-gray-600">AI Voice Agent</p>
          </div>

          {/* Generated Persona */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">AI-Generated Persona</h5>
            <p className="text-sm text-gray-700" data-testid="agent-preview-persona">
              {agentData.persona}
            </p>
          </div>

          {/* Audio Preview */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-3">Voice Preview</h5>
            <div className="flex items-center space-x-4">
              <AudioPlayer 
                audioUrl={agentData.audioUrl}
                sampleText={agentData.sampleScript}
                className="w-12 h-12"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600" data-testid="agent-preview-sample">
                  "{agentData.sampleScript.length > 100 
                    ? `${agentData.sampleScript.substring(0, 100)}...`
                    : agentData.sampleScript
                  }"
                </p>
              </div>
            </div>
          </div>

          {/* Sample Conversation */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Sample Conversation</h5>
            <div className="space-y-3 text-sm">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border-l-4 ${
                    message.isAgent
                      ? 'bg-green-50 border-green-400'
                      : 'bg-blue-50 border-blue-400'
                  }`}
                  data-testid={`conversation-${index}`}
                >
                  <strong>{message.speaker}:</strong> {message.text}
                </div>
              ))}
            </div>
          </div>

          {/* Visibility Setting */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="make-public" className="text-sm font-medium">
                Make agent public
              </Label>
              <p className="text-xs text-gray-500">
                Allow others to discover and duplicate your agent
              </p>
            </div>
            <Switch
              id="make-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              data-testid="switch-make-public"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1" 
              onClick={handleSave}
              disabled={isLoading}
              data-testid="button-save-agent"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save Agent
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
              data-testid="button-edit-agent"
            >
              <i className="fas fa-edit mr-2"></i>
              Edit Agent
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                navigator.share?.({
                  title: agentData.name,
                  text: agentData.persona,
                  url: window.location.href,
                });
              }}
              disabled={isLoading}
              data-testid="button-share-agent"
            >
              <i className="fas fa-share-alt"></i>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
