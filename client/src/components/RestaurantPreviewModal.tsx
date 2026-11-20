import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "./AudioPlayer";
import logoImage from "@assets/Screenshot_2025-09-07_at_12.57.13_PM-removebg-preview_1757268155334.png";

interface RestaurantPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentData: {
    agent: any;
    restaurantData: any;
    persona: string;
    sampleScript: string;
    audioUrl: string;
  };
  restaurantData?: {
    businessName: string;
    address?: string;
    phone?: string;
    website?: string;
    hours?: Record<string, string>;
    menuItems?: Array<{ name: string; price?: string; description?: string }>;
    services?: string[];
    reservationInfo?: string;
  };
}

export default function RestaurantPreviewModal({
  isOpen,
  onClose,
  agentData,
  restaurantData,
}: RestaurantPreviewModalProps) {
  const handleComplete = () => {
    onClose();
    // Redirect to dashboard
    window.location.href = "/";
  };

  const getSampleConversation = () => {
    // Create a realistic restaurant conversation
    return [
      {
        speaker: 'Customer',
        text: 'Hi, I\'d like to make a reservation for tonight.',
        isAgent: false,
      },
      {
        speaker: agentData.agent.name.replace(' Receptionist', ''),
        text: agentData.sampleScript || "Hello! I'd be happy to help you with a reservation. What time were you thinking, and how many people will be joining you?",
        isAgent: true,
      },
      {
        speaker: 'Customer',
        text: 'For 4 people at 7 PM if possible.',
        isAgent: false,
      },
      {
        speaker: agentData.agent.name.replace(' Receptionist', ''),
        text: 'Let me check our availability for 7 PM for a party of 4. May I get your name and phone number to confirm the reservation?',
        isAgent: true,
      }
    ];
  };

  const conversation = getSampleConversation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="restaurant-preview-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <i className="fas fa-utensils text-orange-500"></i>
            <span>Your Restaurant Voice Receptionist is Ready!</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restaurant Information */}
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-utensils text-white"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900" data-testid="restaurant-name">
                    {restaurantData?.businessName || agentData.restaurantData.businessName}
                  </h3>
                  <p className="text-sm text-gray-600">Restaurant Information</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {restaurantData?.address && (
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-map-marker-alt text-orange-500 mt-0.5"></i>
                    <span>{restaurantData.address}</span>
                  </div>
                )}
                
                {restaurantData?.phone && (
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-phone text-orange-500"></i>
                    <span>{restaurantData.phone}</span>
                  </div>
                )}

                {restaurantData?.website && (
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-globe text-orange-500"></i>
                    <a href={restaurantData.website} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}

                {restaurantData?.services && restaurantData.services.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <i className="fas fa-concierge-bell text-orange-500"></i>
                      <span className="font-medium">Services:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {restaurantData.services.map(service => (
                        <Badge key={service} variant="secondary" className="bg-orange-100 text-orange-800">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {restaurantData?.hours && Object.keys(restaurantData.hours).length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <i className="fas fa-clock text-orange-500"></i>
                      <span className="font-medium">Hours:</span>
                    </div>
                    <div className="text-xs space-y-1">
                      {Object.entries(restaurantData.hours).slice(0, 3).map(([day, time]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize">{day}:</span>
                          <span>{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Preview */}
            {restaurantData?.menuItems && restaurantData.menuItems.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-utensils mr-2 text-gray-600"></i>
                  Sample Menu Items
                </h4>
                <div className="space-y-2 text-sm">
                  {restaurantData.menuItems.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="font-medium">{item.name}</span>
                      {item.price && <span className="text-green-600">{item.price}</span>}
                    </div>
                  ))}
                  {restaurantData.menuItems.length > 4 && (
                    <p className="text-gray-500 text-xs">
                      +{restaurantData.menuItems.length - 4} more items
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Agent Information */}
          <div className="space-y-6">
            {/* Agent Header */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <img src={logoImage} alt="VoiceBot Logo" className="w-8 h-8 object-contain" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900" data-testid="agent-name">
                {agentData.agent.name}
              </h4>
              <p className="text-gray-600">AI Voice Receptionist</p>
            </div>

            {/* Generated Persona */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">AI-Generated Personality</h5>
              <p className="text-sm text-gray-700" data-testid="agent-persona">
                {agentData.persona}
              </p>
            </div>

            {/* Audio Preview */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Voice Preview</h5>
              <div className="flex items-center space-x-4">
                <AudioPlayer 
                  audioUrl={agentData.audioUrl}
                  sampleText={agentData.sampleScript}
                  className="w-12 h-12"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600" data-testid="sample-script">
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
              <h5 className="font-medium text-gray-900 mb-3">Sample Restaurant Conversation</h5>
              <div className="space-y-3 text-sm max-h-64 overflow-y-auto">
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
            onClick={handleComplete}
            data-testid="button-complete"
          >
            <i className="fas fa-check mr-2"></i>
            Complete Setup
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              navigator.share?.({
                title: agentData.agent.name,
                text: `AI Voice Receptionist for ${restaurantData?.businessName}`,
                url: window.location.href,
              });
            }}
            data-testid="button-share"
          >
            <i className="fas fa-share-alt mr-2"></i>
            Share Agent
          </Button>
        </div>

        {/* Integration Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start space-x-2">
            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
            <div className="text-sm">
              <h6 className="font-medium text-blue-900 mb-1">Next Steps:</h6>
              <p className="text-blue-800">
                Your voice receptionist is ready! To connect it to your phone system, 
                you can integrate with Twilio for call handling, or contact our support team 
                for custom integration assistance.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}