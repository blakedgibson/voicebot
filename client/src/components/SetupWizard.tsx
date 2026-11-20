import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, ArrowLeft, Check, Clock, Settings } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

export default function SetupWizard({ isOpen, onClose, phoneNumber }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    greeting: `Thank you for calling! I'm your AI assistant. How can I help you today?`,
    voiceId: 'joanna',
    businessHours: {
      enabled: true,
      monday: { start: '09:00', end: '17:00', closed: false },
      tuesday: { start: '09:00', end: '17:00', closed: false },
      wednesday: { start: '09:00', end: '17:00', closed: false },
      thursday: { start: '09:00', end: '17:00', closed: false },
      friday: { start: '09:00', end: '17:00', closed: false },
      saturday: { start: '10:00', end: '16:00', closed: false },
      sunday: { start: '10:00', end: '16:00', closed: true }
    },
    callForwarding: {
      enabled: false,
      number: '',
      afterRings: '4'
    }
  });

  const voices = [
    { id: 'joanna', name: 'Joanna - Professional Female' },
    { id: 'matthew', name: 'Matthew - Professional Male' },
    { id: 'amy', name: 'Amy - Friendly Female' },
    { id: 'brian', name: 'Brian - Friendly Male' }
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Save settings to backend
      const response = await fetch('/api/receptionist/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setIsComplete(true);
        toast({
          title: "Setup Complete!",
          description: "Your AI receptionist is now configured and ready to take calls.",
        });
        
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const steps = [
    { number: 1, title: "Greeting & Voice", icon: Settings },
    { number: 2, title: "Business Hours", icon: Clock },
    { number: 3, title: "Call Forwarding", icon: ArrowRight }
  ];

  if (isComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-cyan-500/50 text-white max-w-md">
          <div className="text-center space-y-6 py-6">
            <Check className="w-16 h-16 text-green-400 mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2">All Set!</h3>
              <p className="text-gray-300">Your AI receptionist is now live and ready to handle calls.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-cyan-500/50 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Quick Setup for {phoneNumber}</DialogTitle>
          <div className="flex justify-between mt-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  currentStep >= step.number 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {step.number}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= step.number ? 'text-white' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentStep === 1 && (
            <Card className="bg-gray-800/50 border-gray-700 p-6 space-y-4">
              <h3 className="text-lg font-semibold">Greeting & Voice</h3>
              
              <div className="space-y-2">
                <Label htmlFor="greeting">Custom Greeting</Label>
                <Textarea
                  id="greeting"
                  value={settings.greeting}
                  onChange={(e) => setSettings({...settings, greeting: e.target.value})}
                  placeholder="Enter your custom greeting message..."
                  className="bg-gray-700 border-gray-800 text-white"
                  data-testid="input-greeting"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice">Voice Selection</Label>
                <Select 
                  value={settings.voiceId} 
                  onValueChange={(value) => setSettings({...settings, voiceId: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-800 text-white" data-testid="select-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-800">
                    {voices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="bg-gray-800/50 border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Business Hours</h3>
                <Switch
                  checked={settings.businessHours.enabled}
                  onCheckedChange={(checked) => 
                    setSettings({
                      ...settings, 
                      businessHours: {...settings.businessHours, enabled: checked}
                    })
                  }
                  data-testid="switch-business-hours"
                />
              </div>
              
              {settings.businessHours.enabled && (
                <div className="space-y-3">
                  {Object.entries(settings.businessHours).map(([day, hours]) => {
                    if (day === 'enabled') return null;
                    const dayHours = hours as { start: string; end: string; closed: boolean };
                    
                    return (
                      <div key={day} className="flex items-center space-x-3">
                        <div className="w-20 text-sm capitalize">{day}</div>
                        <Switch
                          checked={!dayHours.closed}
                          onCheckedChange={(checked) => 
                            setSettings({
                              ...settings,
                              businessHours: {
                                ...settings.businessHours,
                                [day]: {...dayHours, closed: !checked}
                              }
                            })
                          }
                        />
                        {!dayHours.closed && (
                          <>
                            <Input
                              type="time"
                              value={dayHours.start}
                              onChange={(e) => 
                                setSettings({
                                  ...settings,
                                  businessHours: {
                                    ...settings.businessHours,
                                    [day]: {...dayHours, start: e.target.value}
                                  }
                                })
                              }
                              className="w-24 bg-gray-700 border-gray-800 text-white"
                            />
                            <span className="text-gray-400">to</span>
                            <Input
                              type="time"
                              value={dayHours.end}
                              onChange={(e) => 
                                setSettings({
                                  ...settings,
                                  businessHours: {
                                    ...settings.businessHours,
                                    [day]: {...dayHours, end: e.target.value}
                                  }
                                })
                              }
                              className="w-24 bg-gray-700 border-gray-800 text-white"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="bg-gray-800/50 border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Call Forwarding</h3>
                <Switch
                  checked={settings.callForwarding.enabled}
                  onCheckedChange={(checked) => 
                    setSettings({
                      ...settings, 
                      callForwarding: {...settings.callForwarding, enabled: checked}
                    })
                  }
                  data-testid="switch-call-forwarding"
                />
              </div>
              
              {settings.callForwarding.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forward-number">Forward to Number</Label>
                    <Input
                      id="forward-number"
                      type="tel"
                      value={settings.callForwarding.number}
                      onChange={(e) => 
                        setSettings({
                          ...settings,
                          callForwarding: {...settings.callForwarding, number: e.target.value}
                        })
                      }
                      placeholder="+1 (555) 123-4567"
                      className="bg-gray-700 border-gray-800 text-white"
                      data-testid="input-forward-number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="after-rings">Forward after rings</Label>
                    <Select 
                      value={settings.callForwarding.afterRings}
                      onValueChange={(value) => 
                        setSettings({
                          ...settings,
                          callForwarding: {...settings.callForwarding, afterRings: value}
                        })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-800">
                        <SelectItem value="2">2 rings</SelectItem>
                        <SelectItem value="4">4 rings</SelectItem>
                        <SelectItem value="6">6 rings</SelectItem>
                        <SelectItem value="8">8 rings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="border-gray-800 text-gray-300 hover:bg-gray-800"
            data-testid="button-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            data-testid="button-next"
          >
            {currentStep === 3 ? 'Complete Setup' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}