import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Phone, 
  Clock, 
  TrendingUp, 
  Download, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface SubscriptionPlan {
  id: string;
  planName: string;
  stripePriceId: string;
  planDescription: string;
  monthlyPrice: number;
  features: string[];
  maxPhoneNumbers: number;
  maxCallMinutes: number;
}

interface CurrentSubscription {
  id: string;
  status: string;
  plan: SubscriptionPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  phoneNumberAssignments: PhoneNumberAssignment[];
  trialEnd: string | null;
}

interface PhoneNumberAssignment {
  id: string;
  phoneNumber: string;
  phoneNumberType: string;
  monthlyCost: number;
  status: string;
  assignedAt: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export default function BillingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch current subscription
  const { data: currentSubscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription/current'],
  });

  // Fetch payment history
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/subscription/payments'],
  });

  const currentSubscription = (currentSubscriptionData as any)?.subscription as CurrentSubscription | null;

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (cancelAtPeriodEnd: boolean) => {
      const response = await apiRequest('POST', '/api/subscription/cancel', { cancelAtPeriodEnd });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!currentSubscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
            <p className="text-muted-foreground mb-6">
              You don't have an active subscription yet. Choose a plan to get started with VoiceBot.
            </p>
            <Button asChild data-testid="view-plans">
              <Link href="/subscription/plans">
                View Subscription Plans
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate usage metrics (mock data for now)
  const currentUsage = {
    callMinutes: Math.floor(Math.random() * currentSubscription.plan.maxCallMinutes),
    phoneNumbers: currentSubscription.phoneNumberAssignments.length,
  };

  const usagePercent = (currentUsage.callMinutes / currentSubscription.plan.maxCallMinutes) * 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Usage</h1>
        <p className="text-muted-foreground">
          Manage your subscription, view usage, and download invoices.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    Current Plan
                    <Badge className={`ml-2 ${getStatusColor(currentSubscription.status)}`}>
                      {currentSubscription.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Your subscription details and current usage
                  </CardDescription>
                </div>
                <Button variant="outline" asChild size="sm" data-testid="change-plan">
                  <Link href="/subscription/plans">
                    Change Plan
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trial Status Banner (if in trial) */}
              {currentSubscription.status === 'trialing' && currentSubscription.trialEnd && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-300">Free Trial Active</p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Your 14-day free trial ends on {formatDate(currentSubscription.trialEnd)}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Enjoy full access to all features at no cost during your trial period!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Info */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg">{currentSubscription.plan.planName}</h3>
                  <p className="text-muted-foreground">{currentSubscription.plan.planDescription}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentSubscription.status === 'trialing' 
                      ? `Trial ends: ${formatDate(currentSubscription.trialEnd || currentSubscription.currentPeriodEnd)}`
                      : `Next billing: ${formatDate(currentSubscription.currentPeriodEnd)}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${formatPrice(currentSubscription.plan.monthlyPrice)}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                  {currentSubscription.status === 'trialing' && (
                    <div className="text-xs text-muted-foreground">after trial</div>
                  )}
                </div>
              </div>

              {/* Usage Metrics */}
              <div>
                <h4 className="font-medium mb-4">Current Usage</h4>
                <div className="space-y-4">
                  {/* Call Minutes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary" />
                        <span className="text-sm font-medium">Call Minutes</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {currentUsage.callMinutes} / {currentSubscription.plan.maxCallMinutes}
                      </span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                    {usagePercent > 80 && (
                      <p className="text-xs text-yellow-600 mt-1">
                        You're approaching your monthly limit. Consider upgrading your plan.
                      </p>
                    )}
                  </div>

                  {/* Phone Numbers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-primary" />
                        <span className="text-sm font-medium">Phone Numbers</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {currentUsage.phoneNumbers} / {currentSubscription.plan.maxPhoneNumbers}
                      </span>
                    </div>
                    <Progress 
                      value={(currentUsage.phoneNumbers / currentSubscription.plan.maxPhoneNumbers) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>

              {/* Cancellation Warning */}
              {currentSubscription.cancelAtPeriodEnd && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="font-medium text-red-800">Subscription Ending</p>
                      <p className="text-sm text-red-600">
                        Your subscription will be cancelled on {formatDate(currentSubscription.currentPeriodEnd)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Payment History
              </CardTitle>
              <CardDescription>
                View and download your billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading payment history...</p>
                </div>
              ) : (payments as PaymentRecord[])?.length > 0 ? (
                <div className="space-y-3">
                  {(payments as PaymentRecord[]).map((payment: PaymentRecord) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <p className="font-medium">{payment.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <p className="font-medium">${formatPrice(payment.amount)}</p>
                          <p className="text-sm text-muted-foreground capitalize">{payment.status}</p>
                        </div>
                        {payment.receiptUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/subscription/plans">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Link>
              </Button>
              
              {!currentSubscription.cancelAtPeriodEnd ? (
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={() => setShowCancelDialog(true)}
                  data-testid="cancel-subscription"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Subscription
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-green-600 hover:text-green-700"
                  onClick={() => cancelSubscriptionMutation.mutate(false)}
                  disabled={cancelSubscriptionMutation.isPending}
                  data-testid="reactivate-subscription"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reactivate Subscription
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          {currentSubscription.phoneNumberAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Phone Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentSubscription.phoneNumberAssignments.map((phone) => (
                    <div key={phone.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{phone.phoneNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {phone.phoneNumberType} • ${formatPrice(phone.monthlyCost)}/mo
                        </p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">Cancel Subscription</CardTitle>
              <CardDescription>
                Are you sure you want to cancel your subscription?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your subscription will remain active until {formatDate(currentSubscription.currentPeriodEnd)}, 
                and you'll continue to have access to all features until then.
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => cancelSubscriptionMutation.mutate(true)}
                  disabled={cancelSubscriptionMutation.isPending}
                  className="flex-1"
                  data-testid="confirm-cancel"
                >
                  {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1"
                  data-testid="keep-subscription"
                >
                  Keep Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}