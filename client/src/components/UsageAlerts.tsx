import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Phone, Clock } from 'lucide-react';

export function UsageAlerts() {
  const { toast } = useToast();
  const [lastAlertMinutes, setLastAlertMinutes] = useState<number | null>(null);
  const [lastAlertDays, setLastAlertDays] = useState<number | null>(null);

  useEffect(() => {
    const checkUsage = async () => {
      try {
        const response = await fetch('/api/trial/status', {
          credentials: 'include',
        });

        if (!response.ok) return;

        const data = await response.json();
        const { minutesUsed, minutesRemaining, daysRemaining } = data;

        // Alert thresholds for minutes: 75, 90, 100
        if (minutesUsed >= 100 && lastAlertMinutes !== 100) {
          toast({
            title: '🚨 Trial Minutes Depleted',
            description: 'You\'ve used all 100 free trial minutes. Upgrade now to continue service.',
            variant: 'destructive',
            duration: 10000,
          });
          setLastAlertMinutes(100);
        } else if (minutesUsed >= 90 && lastAlertMinutes !== 90) {
          toast({
            title: '⚠️ 90 Minutes Used',
            description: `Only ${minutesRemaining} minutes remaining. Upgrade to unlimited minutes.`,
            variant: 'destructive',
            duration: 8000,
          });
          setLastAlertMinutes(90);
        } else if (minutesUsed >= 75 && lastAlertMinutes !== 75) {
          toast({
            title: '📊 75% of Trial Minutes Used',
            description: `You have ${minutesRemaining} minutes left. Consider upgrading soon.`,
            duration: 6000,
          });
          setLastAlertMinutes(75);
        }

        // Alert thresholds for days: 3, 1, 0
        if (daysRemaining === 0 && lastAlertDays !== 0) {
          toast({
            title: '🚨 Trial Expired Today',
            description: 'Your free trial has ended. Upgrade now to maintain service.',
            variant: 'destructive',
            duration: 10000,
          });
          setLastAlertDays(0);
        } else if (daysRemaining === 1 && lastAlertDays !== 1) {
          toast({
            title: '⏰ Last Day of Trial',
            description: 'Your free trial ends tomorrow. Upgrade to avoid service interruption.',
            variant: 'destructive',
            duration: 8000,
          });
          setLastAlertDays(1);
        } else if (daysRemaining === 3 && lastAlertDays !== 3) {
          toast({
            title: '📅 3 Days Remaining',
            description: 'Your trial expires in 3 days. Upgrade now for uninterrupted service.',
            duration: 6000,
          });
          setLastAlertDays(3);
        }
      } catch (error) {
        console.error('Failed to check usage:', error);
      }
    };

    // Check immediately
    checkUsage();

    // Then check every minute
    const interval = setInterval(checkUsage, 60000);
    return () => clearInterval(interval);
  }, [toast, lastAlertMinutes, lastAlertDays]);

  return null; // This component doesn't render anything
}
