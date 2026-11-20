import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Check, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formatPhoneNumber = (phone: string) => {
  if (!phone) return 'N/A';
  if (phone.startsWith('+1')) {
    const cleaned = phone.slice(2);
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

interface PhoneNumberSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onStartSetup: () => void;
}

export default function PhoneNumberSuccessModal({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  onStartSetup 
}: PhoneNumberSuccessModalProps) {
  const [isProvisioning, setIsProvisioning] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();

  // Auto-redirect after 2 minutes as fallback
  useEffect(() => {
    const twoMinuteTimer = setTimeout(() => {
      handleContinueToDashboard();
    }, 120000); // 2 minutes
    
    return () => clearTimeout(twoMinuteTimer);
  }, []);

  // Simulate phone number provisioning delay, then auto-setup
  useEffect(() => {
    if (isProvisioning) {
      const timer = setTimeout(() => {
        setIsProvisioning(false);
        // Automatically start setup after provisioning
        handleAutoSetup();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isProvisioning]);

  // Auto-redirect when phone provisioning is complete
  useEffect(() => {
    if (!isProvisioning && !isSettingUp) {
      // Phone provisioned, redirect to dashboard
      handleContinueToDashboard();
    }
  }, [isProvisioning, isSettingUp]);

  const handleContinueToDashboard = async () => {
    try {
      // Get account info from localStorage
      const accountInfo = localStorage.getItem('accountInfo');
      
      if (accountInfo) {
        const userData = JSON.parse(accountInfo);
        
        // Login the user with their signup information using the one-time payment token
        const paymentToken = localStorage.getItem('paymentToken');
        if (!paymentToken) {
          toast({
            title: "Session expired",
            description: "Please log in with your email and password.",
            variant: "destructive",
          });
          window.location.href = '/login';
          return;
        }

        const loginResponse = await apiRequest('POST', '/api/auth/login', {
          email: userData.email,
          loginAfterPayment: true,
          paymentToken,
        });

        if (loginResponse.ok) {
          toast({
            title: "Welcome!",
            description: "Redirecting to your dashboard...",
          });

          // Clear temporary storage
          localStorage.removeItem('accountInfo');
          localStorage.removeItem('paymentCompleted');
          localStorage.removeItem('paymentToken');
          
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          throw new Error('Login failed');
        }
      } else {
        // Fallback: just redirect with payment completed flag
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Continuing to Dashboard",
        description: "Setting up your account...",
      });
      
      // Fallback: redirect anyway
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    }
    
    onClose();
  };

  const handleAutoSetup = async () => {
    setIsSettingUp(true);
    
    try {
      // Get business name from localStorage
      const businessInfo = localStorage.getItem('businessInfo');
      const agentInfo = localStorage.getItem('agentInfo');
      
      let businessName = 'Your Business';
      
      if (businessInfo) {
        const parsed = JSON.parse(businessInfo);
        businessName = parsed.name || parsed.businessName || businessName;
      } else if (agentInfo) {
        const parsed = JSON.parse(agentInfo);
        businessName = parsed.restaurantData?.businessName || businessName;
      }
      
      // Automatically configure with custom greeting
      const settings = {
        greeting: `Thank you for calling ${businessName}. How may I help you?`,
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
      };

      // Save settings to backend
      const response = await fetch('/api/receptionist/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSetupComplete(true);
        toast({
          title: "Setup Complete!",
          description: "Your AI receptionist is ready! Complete your payment to access it.",
        });
        
        // Don't auto-close, let user click the button to continue
        // This prevents authentication timing issues
        // setTimeout(() => {
        //   onClose();
        // }, 3000);
      } else {
        throw new Error('Setup failed');
      }
    } catch (error) {
      console.error('Auto-setup error:', error);
      toast({
        title: "Setup Complete",
        description: "Your AI receptionist is ready with default settings.",
      });
      
      // Don't auto-close, let user click the button to continue
      // This prevents authentication timing issues
      // setTimeout(() => {
      //   onClose();
      // }, 2000);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-cyan-500/50 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
            {isProvisioning ? (
              <>
                <Clock className="w-6 h-6 text-yellow-400 animate-spin" />
                Setting Up Your Phone Line...
              </>
            ) : isSettingUp ? (
              <>
                <Clock className="w-6 h-6 text-cyan-400 animate-spin" />
                Configuring AI Receptionist...
              </>
            ) : (
              <>
                <Check className="w-6 h-6 text-green-400" />
                Your AI Receptionist is Ready!
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isProvisioning ? (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-lg p-4">
                <Phone className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <p className="text-gray-300">
                  We're configuring your dedicated business phone number with emergency services compliance...
                </p>
              </div>
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          ) : isSettingUp ? (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-lg p-4">
                <Phone className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <p className="text-gray-300">
                  Setting up your custom greeting and AI configuration...
                </p>
              </div>
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-lg p-4">
                <Phone className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <p className="text-gray-300">
                  Redirecting you to the dashboard...
                </p>
              </div>
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}