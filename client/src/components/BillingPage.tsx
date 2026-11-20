import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard, Download, ExternalLink, AlertCircle, CheckCircle, Clock, Calendar, AlertTriangle, XCircle, Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OVERAGE_RATE_PER_MINUTE } from "@shared/constants";
import { useToast } from "@/hooks/use-toast";

interface BillingPageProps {
  userSubscription: any;
  currentPlan: any;
  stats: any;
  usagePercentage: number;
  hasOverage: boolean;
  overageMinutes: number;
  overageCharges: number;
  handleManageSubscription: () => void;
  isLoadingBillingPortal: boolean;
}

export default function BillingPage({
  userSubscription,
  currentPlan,
  stats,
  usagePercentage,
  hasOverage,
  overageMinutes,
  overageCharges,
  handleManageSubscription,
  isLoadingBillingPortal,
}: BillingPageProps) {
  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: isLoadingPaymentMethods } = useQuery<{
    paymentMethods: any[];
    defaultPaymentMethodId?: string;
  }>({
    queryKey: ['/api/billing/payment-methods'],
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery<{
    invoices: any[];
  }>({
    queryKey: ['/api/billing/invoices'],
  });

  // Fetch subscription details
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery<{
    subscription: any;
    planDetails: {
      amount: number;
      currency: string;
      interval: string;
      intervalCount: number;
      planName: string;
      minutes: number | null;
      overageRate: number | null;
    } | null;
  }>({
    queryKey: ['/api/billing/subscription'],
  });

  // Fetch notification preferences
  const { data: notificationPrefsData } = useQuery<{
    usageWarning: boolean;
    paymentReceipts: boolean;
    monthlyInvoice: boolean;
    paymentFailed: boolean;
    subscriptionCancelled: boolean;
    renewalReminder: boolean;
    cardExpiring: boolean;
    stopServiceAtLimit: boolean;
  }>({
    queryKey: ['/api/billing/notification-preferences'],
  });

  const { toast } = useToast();

  // Check if user is on free trial
  const isFreeTrial = userSubscription?.status === 'trialing';

  const [billingNotifications, setBillingNotifications] = useState({
    usageWarning: notificationPrefsData?.usageWarning ?? true,
    paymentReceipts: notificationPrefsData?.paymentReceipts ?? true,
    monthlyInvoice: notificationPrefsData?.monthlyInvoice ?? true,
    paymentFailed: notificationPrefsData?.paymentFailed ?? true,
    subscriptionCancelled: notificationPrefsData?.subscriptionCancelled ?? true,
    renewalReminder: notificationPrefsData?.renewalReminder ?? true,
    cardExpiring: notificationPrefsData?.cardExpiring ?? true,
    stopServiceAtLimit: isFreeTrial ? true : (notificationPrefsData?.stopServiceAtLimit ?? false), // Always true for free trial
  });

  // Update local state when preferences are loaded
  React.useEffect(() => {
    if (notificationPrefsData) {
      const newState = {
        usageWarning: notificationPrefsData.usageWarning,
        paymentReceipts: notificationPrefsData.paymentReceipts,
        monthlyInvoice: notificationPrefsData.monthlyInvoice,
        paymentFailed: notificationPrefsData.paymentFailed,
        subscriptionCancelled: notificationPrefsData.subscriptionCancelled,
        renewalReminder: notificationPrefsData.renewalReminder,
        cardExpiring: notificationPrefsData.cardExpiring,
        stopServiceAtLimit: isFreeTrial ? true : (notificationPrefsData.stopServiceAtLimit ?? false),
      };
      setBillingNotifications(newState);
    }
  }, [notificationPrefsData, isFreeTrial]);

  // Mutation to save notification preferences
  const updateNotificationsMutation = useMutation({
    mutationFn: async (newPrefs: typeof billingNotifications) => {
      const response = await apiRequest('PUT', '/api/billing/notification-preferences', newPrefs);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['/api/billing/notification-preferences'], variables);
      toast({
        title: "Preferences Saved",
        description: "Your billing notification preferences have been updated.",
      });
    },
    onError: (error) => {
      console.error('Failed to save notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Save preferences when changed
  const handleNotificationChange = async (key: string, value: boolean) => {
    // Prevent changing stopServiceAtLimit for free trial users
    if (key === 'stopServiceAtLimit' && isFreeTrial) {
      toast({
        title: "Free Trial Restriction",
        description: "Free trial users must have 'Stop Service at Limit' enabled to prevent unexpected charges. This setting cannot be changed during the free trial.",
        variant: "destructive",
      });
      return;
    }

    const newPrefs = { ...billingNotifications, [key]: value };
    setBillingNotifications(newPrefs);
    updateNotificationsMutation.mutate(newPrefs);
  };

  // Checkout session state
  const [checkoutPlanSlug, setCheckoutPlanSlug] = useState<string | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ name: string; slug: string; price: number; minutes: number; overageRate: number } | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async (planSlug: string) => {
      const response = await apiRequest('POST', '/api/checkout/create-session', { planSlug });
      return response.json();
    },
    onSuccess: (data) => {
      setCheckoutPlanSlug(null);
      if (data.planSwitched) {
        toast({
          title: "Plan updated",
          description: `You've been switched to the ${data.planName} plan.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/receptionist'] });
        queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Could not create checkout session. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setCheckoutPlanSlug(null);
      console.error('Failed to create checkout session:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePlanClick = (plan: { name: string; slug: string; price: number; minutes: number; overageRate: number }) => {
    // Check if user is already on this plan
    if (plan.name.toLowerCase() === displayPlanName.toLowerCase()) {
      toast({
        title: "Current Plan",
        description: `You are already subscribed to the ${plan.name} plan.`,
      });
      return;
    }

    // Show confirmation dialog
    setPendingPlan(plan);
    setShowConfirmDialog(true);
  };

  const handleConfirmPlanChange = () => {
    if (!pendingPlan) return;

    setCheckoutPlanSlug(pendingPlan.slug);
    checkoutMutation.mutate(pendingPlan.slug);
    setShowConfirmDialog(false);
    setPendingPlan(null);
  };

  const handleCancelPlanChange = () => {
    setShowConfirmDialog(false);
    setPendingPlan(null);
  };

  const paymentMethods = paymentMethodsData?.paymentMethods || [];

  const invoices = invoicesData?.invoices || [];
  const subscription = subscriptionData?.subscription;
  const stripePlanDetails = subscriptionData?.planDetails;

  // Trial information (isFreeTrial already declared above)
  const trialEnd = userSubscription?.trialEnd ? new Date(userSubscription.trialEnd) : null;
  const daysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Helper function for currency formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  // Helper function to determine plan name from price amount
  const getPlanNameFromAmount = (amount: number | undefined): string | null => {
    if (!amount) return null;
    const cents = amount;
    if (cents === 9900) return 'Small';
    if (cents === 29900) return 'Medium';
    if (cents === 49900) return 'Large';
    return null;
  };

  // Use Stripe plan details if available, otherwise fall back to currentPlan prop
  // Override for free trial users
  const planNameFromStripe = stripePlanDetails?.planName && stripePlanDetails.planName !== 'Unknown'
    ? stripePlanDetails.planName
    : null;
  const planNameFromAmount = getPlanNameFromAmount(stripePlanDetails?.amount);
  const planNameFromSubscription = userSubscription?.plan;

  const displayPlanName = isFreeTrial
    ? 'Free Trial'
    : (planNameFromStripe || planNameFromAmount || planNameFromSubscription || 'Medium');

  const displayPlanPrice = isFreeTrial
    ? 'Free'
    : (stripePlanDetails?.amount ? formatCurrency(stripePlanDetails.amount) : currentPlan.price);
  const displayMinutes = isFreeTrial ? 100 : (stripePlanDetails?.minutes || currentPlan.minutes);
  const displayOverageRate = stripePlanDetails?.overageRate || currentPlan.overageRate || OVERAGE_RATE_PER_MINUTE;

  // Calculate renewal date — check Stripe subscription first, then DB subscription
  const renewalDateRaw = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : userSubscription?.current_period_end
    ? new Date(userSubscription.current_period_end)
    : userSubscription?.trialEnd
    ? new Date(userSubscription.trialEnd)
    : null;

  const renewalDate = renewalDateRaw
    ? renewalDateRaw.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  // Recalculate usage metrics with correct plan limits
  const actualUsagePercentage = displayMinutes > 0 ? (stats.phoneMinutesThisMonth / displayMinutes) * 100 : 0;
  const actualHasOverage = stats.phoneMinutesThisMonth > displayMinutes;
  const actualOverageMinutes = Math.max(0, stats.phoneMinutesThisMonth - displayMinutes);
  const actualOverageCharges = (actualOverageMinutes * displayOverageRate).toFixed(2);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      paid: { label: 'Paid', className: 'bg-green-900/20 text-green-400 border-green-800', icon: CheckCircle },
      open: { label: 'Due', className: 'bg-yellow-900/20 text-yellow-400 border-yellow-800', icon: Clock },
      draft: { label: 'Draft', className: 'bg-gray-900/20 text-gray-400 border-gray-800', icon: Clock },
      void: { label: 'Void', className: 'bg-gray-900/20 text-gray-400 border-gray-800', icon: AlertCircle },
      uncollectible: { label: 'Uncollectible', className: 'bg-red-900/20 text-red-400 border-red-800', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const minutesRemaining = Math.max(0, displayMinutes - stats.phoneMinutesThisMonth);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Payment Failure and Suspension Banners */}
      {userSubscription?.serviceStatus === 'suspended' && (
        <Alert variant="destructive" className="border-red-600 bg-red-950/50">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Service Suspended - Payment Required</AlertTitle>
          <AlertDescription className="mt-2">
            Your AI voice agents have been suspended due to payment failure. Please update your payment method below to reactivate your service immediately.
            {userSubscription.gracePeriodEndsAt && (
              <span className="block mt-2 text-sm">
                Grace period expired on: {new Date(userSubscription.gracePeriodEndsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {userSubscription?.serviceStatus === 'grace_period' && (
        <Alert className="border-yellow-600 bg-yellow-950/30">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <AlertTitle className="text-lg font-semibold text-yellow-500">Payment Issue - Action Required</AlertTitle>
          <AlertDescription className="mt-2 text-yellow-100/90">
            We're having trouble processing your payment. Your service is currently active, but will be suspended if payment is not received by:{' '}
            <strong className="text-yellow-400">
              {userSubscription.gracePeriodEndsAt
                ? new Date(userSubscription.gracePeriodEndsAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'soon'}
            </strong>
            . Please update your payment method below to avoid service interruption.
            {userSubscription.paymentFailureCount > 0 && (
              <span className="block mt-2 text-sm">
                Payment attempts: {userSubscription.paymentFailureCount}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Current Plan & Usage Overview (Top Section) */}
      <Card className="premium-card border-0">
        <CardContent className="space-y-6 pt-6">
          {/* Plan Name and Details */}
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold text-white">
              {displayPlanName}
            </h3>
            {!isFreeTrial && (
              <>
                <p className="text-xl text-gray-300">{displayPlanPrice}/month</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Renews on {renewalDate}</span>
                </div>
              </>
            )}
          </div>

          {/* Usage Metrics */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-4xl font-bold text-white">
                  {stats.phoneMinutesThisMonth} <span className="text-2xl text-gray-400">/ {displayMinutes}</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">Minutes Used</p>
              </div>
              {/* Show additional minutes if over limit, hide if Stop Service at Limit is on */}
              {actualHasOverage && !billingNotifications.stopServiceAtLimit && (
                <div className="text-right">
                  <p className="text-2xl font-semibold text-red-400">{actualOverageMinutes}</p>
                  <p className="text-sm text-gray-400">additional minutes</p>
                </div>
              )}
            </div>

            {/* Custom progress bar with overage divider */}
            {(() => {
              const totalMinutes = stats.phoneMinutesThisMonth;
              const limit = displayMinutes;
              const isOverage = totalMinutes > limit && !billingNotifications.stopServiceAtLimit;
              const totalRepresented = isOverage ? totalMinutes : limit;
              const includedFillPct = Math.min((totalMinutes / Math.max(totalRepresented, 1)) * 100, 100);
              const limitLinePct = isOverage ? (limit / totalMinutes) * 100 : 100;
              const barColor = isOverage
                ? 'bg-blue-500'
                : actualUsagePercentage >= 100
                ? 'bg-red-500'
                : actualUsagePercentage >= 80
                ? 'bg-yellow-400'
                : 'bg-blue-500';

              return (
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                  {/* Included minutes fill */}
                  <div
                    className={`absolute top-0 left-0 h-full rounded-l-full ${isOverage ? 'bg-blue-500' : barColor} transition-all`}
                    style={{ width: `${includedFillPct}%` }}
                  />
                  {/* Overage minutes fill (red, shown only when stopServiceAtLimit is OFF) */}
                  {isOverage && (
                    <div
                      className="absolute top-0 h-full bg-red-500"
                      style={{ left: `${limitLinePct}%`, width: `${100 - limitLinePct}%` }}
                    />
                  )}
                  {/* White divider line at the included-minutes boundary */}
                  {isOverage && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white z-10"
                      style={{ left: `${limitLinePct}%` }}
                    />
                  )}
                </div>
              );
            })()}

            {actualHasOverage && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-semibold">
                      Over limit: +{actualOverageMinutes} minutes
                    </p>
                    <p className="text-red-300 text-sm mt-1">
                      Additional charges: ${actualOverageCharges} (${displayOverageRate.toFixed(2)}/minute)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!actualHasOverage && actualUsagePercentage > 80 && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 font-semibold">
                      Approaching limit
                    </p>
                    <p className="text-yellow-300 text-sm mt-1">
                      You've used {actualUsagePercentage.toFixed(0)}% of your monthly minutes. Consider upgrading to avoid overage charges.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            className="w-full border-gray-800 text-gray-300 hover:bg-gray-800 py-6 text-lg"
            onClick={handleManageSubscription}
            disabled={isLoadingBillingPortal}
          >
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Plans - Separate Card */}
      <Card className="premium-card border-0">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Small Plan */}
            <div
              className={`relative bg-gray-800/50 rounded-lg p-4 border transition-all cursor-pointer group ${checkoutMutation.isPending ? 'opacity-70 pointer-events-none' : ''} ${displayPlanName.toLowerCase() === 'small' ? 'border-blue-500 ring-1 ring-blue-500/40 bg-blue-900/10' : 'border-gray-700 hover:border-blue-500'}`}
              onClick={() => !checkoutMutation.isPending && handlePlanClick({ name: 'Small', slug: 'small', price: 99, minutes: 250, overageRate: 0.50 })}
              data-testid="plan-card-small"
            >
              {checkoutPlanSlug === 'small' && checkoutMutation.isPending ? (
                <div className="absolute top-2 right-2"><Loader2 className="w-5 h-5 text-blue-400 animate-spin" /></div>
              ) : displayPlanName.toLowerCase() === 'small' ? (
                <Badge className="absolute top-2 right-2 bg-blue-500 text-white border-0 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Current Plan
                </Badge>
              ) : null}
              <h4 className="text-lg font-semibold text-white mb-2">Small</h4>
              <p className="text-2xl font-bold text-blue-400 mb-1">$99<span className="text-sm text-gray-400 font-normal">/mo</span></p>
              <p className="text-sm text-gray-400 mb-1">250 minutes/mo</p>
              <p className="text-xs text-gray-500">$0.50 per additional minute</p>
            </div>
            
            {/* Medium Plan */}
            <div
              className={`relative bg-gray-800/50 rounded-lg p-4 border transition-all cursor-pointer group ${checkoutMutation.isPending ? 'opacity-70 pointer-events-none' : ''} ${displayPlanName.toLowerCase() === 'medium' ? 'border-blue-500 ring-1 ring-blue-500/40 bg-blue-900/10' : 'border-gray-700 hover:border-blue-500'}`}
              onClick={() => !checkoutMutation.isPending && handlePlanClick({ name: 'Medium', slug: 'medium', price: 299, minutes: 800, overageRate: 0.45 })}
              data-testid="plan-card-medium"
            >
              {checkoutPlanSlug === 'medium' && checkoutMutation.isPending ? (
                <div className="absolute top-2 right-2"><Loader2 className="w-5 h-5 text-blue-400 animate-spin" /></div>
              ) : displayPlanName.toLowerCase() === 'medium' ? (
                <Badge className="absolute top-2 right-2 bg-blue-500 text-white border-0 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Current Plan
                </Badge>
              ) : null}
              <h4 className="text-lg font-semibold text-white mb-2">Medium</h4>
              <p className="text-2xl font-bold text-blue-400 mb-1">$299<span className="text-sm text-gray-400 font-normal">/mo</span></p>
              <p className="text-sm text-gray-400 mb-1">800 minutes/mo</p>
              <p className="text-xs text-gray-500">$0.45 per additional minute</p>
            </div>
            
            {/* Large Plan */}
            <div
              className={`relative bg-gray-800/50 rounded-lg p-4 border transition-all cursor-pointer group ${checkoutMutation.isPending ? 'opacity-70 pointer-events-none' : ''} ${displayPlanName.toLowerCase() === 'large' ? 'border-blue-500 ring-1 ring-blue-500/40 bg-blue-900/10' : 'border-gray-700 hover:border-blue-500'}`}
              onClick={() => !checkoutMutation.isPending && handlePlanClick({ name: 'Large', slug: 'large', price: 499, minutes: 1800, overageRate: 0.40 })}
              data-testid="plan-card-large"
            >
              {checkoutPlanSlug === 'large' && checkoutMutation.isPending ? (
                <div className="absolute top-2 right-2"><Loader2 className="w-5 h-5 text-blue-400 animate-spin" /></div>
              ) : displayPlanName.toLowerCase() === 'large' ? (
                <Badge className="absolute top-2 right-2 bg-blue-500 text-white border-0 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Current Plan
                </Badge>
              ) : null}
              <h4 className="text-lg font-semibold text-white mb-2">Large</h4>
              <p className="text-2xl font-bold text-blue-400 mb-1">$499<span className="text-sm text-gray-400 font-normal">/mo</span></p>
              <p className="text-sm text-gray-400 mb-1">1,800 minutes/mo</p>
              <p className="text-xs text-gray-500">$0.40 per additional minute</p>
            </div>
            
            {/* Custom Plan */}
            <div 
              className="relative bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-all cursor-pointer group"
              onClick={() => {
                toast({
                  title: "Contact Sales",
                  description: "Please contact our sales team for custom plan options.",
                });
              }}
              data-testid="plan-card-custom"
            >
              <h4 className="text-lg font-semibold text-white mb-2">Custom</h4>
              <p className="text-2xl font-bold text-purple-400 mb-1">Contact</p>
              <p className="text-sm text-gray-400 mb-1">Custom minutes</p>
              <p className="text-xs text-gray-500">Priority support</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Notifications */}
      <Card className="premium-card border-0">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="usage-warning" className="text-white font-medium">
                Usage Warnings
              </Label>
              <p className="text-xs text-gray-400 mt-1">
                Notify when reaching 80% usage
              </p>
            </div>
            <Switch
              id="usage-warning"
              checked={billingNotifications.usageWarning}
              onCheckedChange={(checked) => handleNotificationChange('usageWarning', checked)}
              disabled={updateNotificationsMutation.isPending}
              data-testid="switch-usage-warning"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="stop-at-limit" className="text-white font-medium">
                Stop Service at Limit {isFreeTrial && <span className="text-xs text-blue-400 ml-2">(Required for Free Trial)</span>}
              </Label>
              <p className="text-xs text-gray-400 mt-1">
                {isFreeTrial
                  ? "Required during free trial to prevent unexpected charges. Voicebots automatically turn off when 100 minutes are exhausted."
                  : "Automatically turn off voicebots when minutes are exhausted"
                }
              </p>
            </div>
            <Switch
              id="stop-at-limit"
              checked={billingNotifications.stopServiceAtLimit}
              onCheckedChange={(checked) => handleNotificationChange('stopServiceAtLimit', checked)}
              disabled={updateNotificationsMutation.isPending || isFreeTrial}
              data-testid="switch-stop-at-limit"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan Change Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Plan Change</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {pendingPlan && (
                <>
                  <p>
                    You are about to switch to the <strong className="text-white">{pendingPlan.name}</strong> plan.
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Price:</span>
                      <span className="text-white font-semibold">${pendingPlan.price}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Included Minutes:</span>
                      <span className="text-white font-semibold">{pendingPlan.minutes.toLocaleString()} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overage Rate:</span>
                      <span className="text-white font-semibold">${pendingPlan.overageRate.toFixed(2)}/min</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Your plan will be updated immediately. Any prorated charges or credits will be calculated automatically.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPlanChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPlanChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// Shield icon component (in case it's not imported)
function Shield({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
