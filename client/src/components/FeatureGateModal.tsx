import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Lock, Zap, Check } from 'lucide-react';

interface FeatureGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
  benefits?: string[];
}

export function FeatureGateModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  benefits = [
    'Unlimited call minutes',
    'Advanced AI customization',
    'Priority support',
    'Custom integrations',
  ],
}: FeatureGateModalProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    onClose();
    setLocation('/subscription-plans');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-blue-500/30">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 rounded-full">
              <Lock className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold text-white">
            Unlock {featureName}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-300 mt-2">
            {featureDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Included in Paid Plans:
            </h4>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center text-xs text-gray-400">
            <p>Starting at <span className="font-semibold text-white">$29/month</span></p>
            <p>14-day free trial • Cancel anytime</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 font-semibold"
          >
            ⚡ Upgrade Now
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full text-gray-400 hover:text-white">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
