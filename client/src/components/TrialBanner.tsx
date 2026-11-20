import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Phone, Zap } from 'lucide-react';

interface TrialBannerProps {
  variant?: 'sidebar' | 'billing' | 'inline';
  onUpgradeClick?: () => void;
}

export function TrialBanner({ variant = 'sidebar', onUpgradeClick }: TrialBannerProps) {
  const [, setLocation] = useLocation();
  const [trialData, setTrialData] = useState({
    daysRemaining: 14,
    totalDays: 14,
    minutesRemaining: 100,
    totalMinutes: 100,
    minutesUsed: 0,
  });

  // Fetch trial data from API
  useEffect(() => {
    const fetchTrialData = async () => {
      try {
        const response = await fetch('/api/trial/status', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTrialData(data);
        }
      } catch (error) {
        console.error('Failed to fetch trial data:', error);
      }
    };

    fetchTrialData();
    // Refresh every minute
    const interval = setInterval(fetchTrialData, 60000);
    return () => clearInterval(interval);
  }, []);

  const daysProgress = (trialData.daysRemaining / trialData.totalDays) * 100;
  const minutesProgress = (trialData.minutesRemaining / trialData.totalMinutes) * 100;

  // Determine urgency level and colors
  const getDaysUrgency = () => {
    if (daysProgress > 50) return { color: 'bg-green-500', textColor: 'text-green-600', urgent: false };
    if (daysProgress > 20) return { color: 'bg-orange-500', textColor: 'text-orange-600', urgent: true };
    return { color: 'bg-red-500', textColor: 'text-red-600', urgent: true };
  };

  const getMinutesUrgency = () => {
    if (minutesProgress > 25) return { color: 'bg-green-500', textColor: 'text-green-600', urgent: false };
    if (minutesProgress > 10) return { color: 'bg-orange-500', textColor: 'text-orange-600', urgent: true };
    return { color: 'bg-red-500', textColor: 'text-red-600', urgent: true };
  };

  const daysUrgency = getDaysUrgency();
  const minutesUrgency = getMinutesUrgency();
  const isUrgent = daysUrgency.urgent || minutesUrgency.urgent;

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setLocation('/subscription-plans');
    }
  };

  // Sidebar variant - compact
  if (variant === 'sidebar') {
    return (
      <div className={`rounded-lg border p-4 mb-4 ${isUrgent ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30' : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className={`h-4 w-4 ${isUrgent ? 'text-orange-500' : 'text-blue-500'}`} />
          <span className="text-xs font-semibold text-white">Free Trial</span>
        </div>

        {/* Days Remaining */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-gray-300">{trialData.daysRemaining} days left</span>
            </div>
            <span className={`font-semibold ${daysUrgency.textColor}`}>
              {Math.round(daysProgress)}%
            </span>
          </div>
          <Progress value={daysProgress} className="h-1.5" indicatorClassName={daysUrgency.color} />
        </div>

        {/* Minutes Remaining */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-gray-300">{trialData.minutesRemaining} min left</span>
            </div>
            <span className={`font-semibold ${minutesUrgency.textColor}`}>
              {Math.round(minutesProgress)}%
            </span>
          </div>
          <Progress value={minutesProgress} className="h-1.5" indicatorClassName={minutesUrgency.color} />
        </div>

        {/* Upgrade CTA */}
        <Button
          onClick={handleUpgrade}
          size="sm"
          className={`w-full text-xs font-semibold ${isUrgent ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'}`}
        >
          {isUrgent ? '🔥 Upgrade Now' : '⚡ Upgrade Now'}
        </Button>
      </div>
    );
  }

  // Billing variant - detailed
  if (variant === 'billing') {
    return (
      <div className={`rounded-xl border p-6 ${isUrgent ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30' : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'}`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={`h-5 w-5 ${isUrgent ? 'text-orange-500' : 'text-blue-500'}`} />
              <h3 className="text-lg font-bold text-white">14-Day Free Trial</h3>
            </div>
            <p className="text-sm text-gray-400">
              You have <span className={`font-semibold ${daysUrgency.textColor}`}>{trialData.daysRemaining} days</span> and{' '}
              <span className={`font-semibold ${minutesUrgency.textColor}`}>{trialData.minutesRemaining} minutes</span> remaining
            </p>
          </div>
          {isUrgent && (
            <div className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">Action Required</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Days Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-white">Trial Period</span>
              </div>
              <span className={`text-sm font-semibold ${daysUrgency.textColor}`}>
                {trialData.daysRemaining} / {trialData.totalDays} days
              </span>
            </div>
            <Progress value={daysProgress} className="h-2" indicatorClassName={daysUrgency.color} />
            <p className="text-xs text-gray-400">
              {daysProgress > 50
                ? 'Plenty of time to explore all features'
                : daysProgress > 20
                ? 'Trial ending soon - upgrade to keep your service active'
                : 'Trial expires in less than 3 days - upgrade now!'}
            </p>
          </div>

          {/* Minutes Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-white">Call Minutes</span>
              </div>
              <span className={`text-sm font-semibold ${minutesUrgency.textColor}`}>
                {trialData.minutesRemaining} / {trialData.totalMinutes} min
              </span>
            </div>
            <Progress value={minutesProgress} className="h-2" indicatorClassName={minutesUrgency.color} />
            <p className="text-xs text-gray-400">
              {trialData.minutesUsed} minutes used • {trialData.minutesRemaining} minutes remaining
            </p>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Button
            onClick={handleUpgrade}
            size="lg"
            className={`flex-1 font-semibold ${isUrgent ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'}`}
          >
            {isUrgent ? '🔥 Upgrade Now - Don\'t Lose Service' : '⚡ Upgrade to Unlimited'}
          </Button>
          <div className="text-xs text-gray-400 text-center sm:text-right">
            <p className="font-semibold text-white">Starting at $29/month</p>
            <p>Unlimited minutes • Advanced features</p>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant - banner style
  return (
    <div className={`rounded-lg border p-4 ${isUrgent ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30' : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              <span className={`font-semibold ${daysUrgency.textColor}`}>{trialData.daysRemaining} days</span> left
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              <span className={`font-semibold ${minutesUrgency.textColor}`}>{trialData.minutesRemaining} min</span> left
            </span>
          </div>
        </div>
        <Button
          onClick={handleUpgrade}
          size="sm"
          className={`font-semibold ${isUrgent ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'}`}
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}
