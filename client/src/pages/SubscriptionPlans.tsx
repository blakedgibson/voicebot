import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Phone, Clock, Zap, Star, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { SubscriptionCheckout } from "@/components/SubscriptionCheckout";

// Production build uses live keys; development always uses test keys.
const isProduction = import.meta.env.MODE === 'production';
const key = isProduction
  ? import.meta.env.VITE_STRIPE_PUBLIC_KEY_LIVE
  : (import.meta.env.VITE_STRIPE_PUBLIC_KEY_TEST ?? import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Validate key format
const isLiveKey = key?.startsWith('pk_live_');
const isTestKey = key?.startsWith('pk_test_');

if (!key || (!isLiveKey && !isTestKey)) {
  throw new Error(`Missing or invalid Stripe key. Expected ${isProduction ? 'VITE_STRIPE_PUBLIC_KEY_LIVE' : 'VITE_STRIPE_PUBLIC_KEY_TEST'}`);
}

// Log which mode we're using
const keyMode = isLiveKey ? 'LIVE' : 'TEST';
console.log(`✅ Using Stripe ${keyMode} keys (MODE=${import.meta.env.MODE})`);

const stripePromise = loadStripe(key);

interface SubscriptionPlan {
  id: string;
  planName: string;
  stripePriceId: string;
  planDescription: string;
  monthlyPrice: number;
  features: string[];
  maxPhoneNumbers: number;
  maxCallMinutes: number;
  planType: string;
  displayOrder: number;
}

interface CurrentSubscription {
  id: string;
  status: string;
  plan: SubscriptionPlan;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

const planIcons: Record<string, any> = {
  'Small': Phone,
  'Medium': Zap,
  'Large': Crown
};

const planColors: Record<string, string> = {
  'Small': 'border-blue-200 hover:border-blue-300',
  'Medium': 'border-purple-200 hover:border-purple-300',
  'Large': 'border-amber-200 hover:border-amber-300 ring-2 ring-amber-100'
};

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription/plans'],
  });

  // Fetch current subscription
  const { data: currentSubscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription/current'],
  });

  const currentSubscription = (currentSubscriptionData as any)?.subscription as CurrentSubscription | null;

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/subscription/create', { planId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setShowCheckout(true);
      } else if (data.subscription) {
        toast({
          title: "Subscription Active",
          description: data.message || "You already have an active subscription.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (currentSubscription?.status === 'active') {
      toast({
        title: "Already Subscribed",
        description: "You already have an active subscription. Cancel your current subscription to change plans.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlan(plan);
    createSubscriptionMutation.mutate(plan.id);
  };

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(0);
  };

  const formatFeatures = (featuresJson: string[]): string[] => {
    if (Array.isArray(featuresJson)) {
      return featuresJson;
    }
    try {
      return JSON.parse(featuresJson as any);
    } catch {
      return [];
    }
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  if (showCheckout && selectedPlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Elements stripe={stripePromise}>
            <SubscriptionCheckout
              plan={selectedPlan}
              onSuccess={() => {
                setShowCheckout(false);
                queryClient.invalidateQueries({ queryKey: ['/api/subscription/current'] });
                toast({
                  title: "Subscription Activated!",
                  description: `Welcome to ${selectedPlan.planName}! Your AI phone receptionist is now active.`,
                });
              }}
              onCancel={() => setShowCheckout(false)}
            />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
          Power your restaurant with AI-driven phone reception. Handle reservations, 
          answer questions, and never miss a call again.
        </p>
        {/* Free Trial Banner */}
        <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-6 py-3 rounded-full border border-green-200 dark:border-green-700">
          <Star className="w-5 h-5 text-green-600" />
          <span className="font-semibold">🎉 All plans include a 14-day free trial</span>
          <Star className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <div className="mb-8">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">
                    Current Plan: {currentSubscription.plan.planName}
                  </h3>
                  <p className="text-green-600">
                    Status: {currentSubscription.status}
                    {currentSubscription.cancelAtPeriodEnd && " (Cancels at period end)"}
                  </p>
                  <p className="text-sm text-green-600">
                    Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {(plans as SubscriptionPlan[])?.map((plan: SubscriptionPlan) => {
          const IconComponent = planIcons[plan.planName] || Phone;
          const isCurrentPlan = currentSubscription?.plan.id === plan.id;
          const isPopular = plan.planName === 'Large';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${planColors[plan.planName]} ${isPopular ? 'transform scale-105' : ''}`}
              data-testid={`plan-card-${plan.planName.toLowerCase()}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-600 hover:bg-amber-700">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.planName}</CardTitle>
                <CardDescription className="text-sm">{plan.planDescription}</CardDescription>
                
                {/* Free Trial Badge */}
                <div className="mt-3 mb-3">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs px-3 py-1">
                    14-Day Free Trial
                  </Badge>
                </div>
                
                <div className="mt-4">
                  <span className="text-4xl font-bold">${formatPrice(plan.monthlyPrice)}</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                  <p className="text-xs text-muted-foreground mt-1">after free trial</p>
                </div>
              </CardHeader>

              <CardContent>
                {/* Featured Phone Number Section */}
                <div className="mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-cyan-400">📞 Phone Number Included</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get your dedicated business phone number instantly upon payment. Automatically configured with SMS support and emergency services.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium">{plan.maxPhoneNumbers}</div>
                      <div className="text-xs text-muted-foreground">Phone Numbers</div>
                    </div>
                    <div className="text-center">
                      <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-medium">{plan.maxCallMinutes}</div>
                      <div className="text-xs text-muted-foreground">Minutes/Month</div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {formatFeatures(plan.features).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <Button
                  type="button"
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan || createSubscriptionMutation.isPending}
                  data-testid={`select-plan-${plan.planName.toLowerCase()}`}
                >
                  {isCurrentPlan ? 'Current Plan' : 
                   createSubscriptionMutation.isPending ? 'Processing...' : 
                   'Start Free Trial'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-2">What happens if I go over my call minutes?</h3>
            <p className="text-muted-foreground text-sm">
              You'll be charged $1.00 per additional minute. We'll notify you when you reach 80% of your limit.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
            <p className="text-muted-foreground text-sm">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Do I need a contract?</h3>
            <p className="text-muted-foreground text-sm">
              No long-term contracts required. All plans are month-to-month and you can cancel anytime.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What happens when I subscribe?</h3>
            <p className="text-muted-foreground text-sm">
              Your dedicated phone number is automatically provisioned upon payment, complete with emergency services and SMS support. You'll be ready to take calls immediately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground text-sm">
              We accept all major credit cards (Visa, MasterCard, American Express) through secure Stripe processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}