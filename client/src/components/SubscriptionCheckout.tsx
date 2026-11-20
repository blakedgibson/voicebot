import { useState } from "react";
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, CreditCard, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  planName: string;
  planDescription: string;
  monthlyPrice: number;
  features: string[];
  maxPhoneNumbers: number;
  maxCallMinutes: number;
}

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SubscriptionCheckout({ plan, onSuccess, onCancel }: SubscriptionCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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

  const getPhoneNumberValue = (planName: string): number => {
    switch (planName) {
      case 'Basic': return 1; // 1 local number = $1
      case 'Professional': return 3; // 1 local + 1 toll-free = $3  
      case 'Enterprise': return 5; // 5 numbers mixed = ~$5
      default: return 0;
    }
  };

  const getPhoneNumberDescription = (planName: string): string => {
    switch (planName) {
      case 'Basic': return '1 local';
      case 'Professional': return '2 numbers';
      case 'Enterprise': return '5 numbers';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/subscription/success',
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment failed:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "There was an error processing your payment. Please try again.",
          variant: "destructive",
        });
      } else {
        // Payment succeeded
        toast({
          title: "Payment Successful!",
          description: `Welcome to ${plan.planName}! Your subscription is now active.`,
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="absolute top-4 left-4"
          data-testid="back-to-plans"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Plans
        </Button>
        
        <h1 className="text-2xl font-bold mb-2">Start Your Free Trial</h1>
        <p className="text-muted-foreground mb-3">
          You're starting a 14-day free trial of the {plan.planName} plan
        </p>
        {/* Free Trial Banner */}
        <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full border border-green-200 dark:border-green-700">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-sm">14-Day Free Trial • No charges during trial</span>
        </div>
      </div>

      {/* Plan Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{plan.planName} Plan</CardTitle>
              <CardDescription>{plan.planDescription}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              ${formatPrice(plan.monthlyPrice)}/mo
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Free Trial Notice */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 mb-4">
            <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200">14-Day Free Trial</h4>
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
              You'll get full access to all {plan.planName} features for 14 days at no cost.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              After your trial ends, you'll be charged ${formatPrice(plan.monthlyPrice)}/month. Cancel anytime during the trial.
            </p>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-4 bg-muted/50 rounded-lg border mb-4">
            <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              After Trial - Monthly Pricing
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{plan.planName} Base Features</span>
                <span>${(parseInt(formatPrice(plan.monthlyPrice)) - getPhoneNumberValue(plan.planName)).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Twilio Phone Numbers ({getPhoneNumberDescription(plan.planName)})
                </span>
                <span>+${getPhoneNumberValue(plan.planName)}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-base">
                <span>Total Monthly (after trial)</span>
                <span>${formatPrice(plan.monthlyPrice)}</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              📞 Phone numbers included at no extra charge - ${getPhoneNumberValue(plan.planName)}/month Twilio value
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="font-semibold">{plan.maxPhoneNumbers}</div>
              <div className="text-xs text-muted-foreground">Phone Numbers</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="font-semibold">{plan.maxCallMinutes}</div>
              <div className="text-xs text-muted-foreground">Minutes/Month</div>
            </div>
          </div>

          <div className="text-sm">
            <strong>Included features:</strong>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {formatFeatures(plan.features).slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-center">
                  <div className="w-1 h-1 bg-primary rounded-full mr-2" />
                  {feature}
                </li>
              ))}
              {formatFeatures(plan.features).length > 3 && (
                <li className="flex items-center">
                  <div className="w-1 h-1 bg-primary rounded-full mr-2" />
                  And {formatFeatures(plan.features).length - 3} more features...
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="payment-form">
            <PaymentElement 
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                }
              }}
            />

            {/* Security Notice */}
            <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Secure Payment</p>
                <p className="text-green-600">
                  Your payment information is encrypted and processed securely by Stripe.
                </p>
              </div>
            </div>

            {/* Phone Number Information */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Phone Number Included</p>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {plan.planName === 'Basic' && 'This plan includes 1 local phone number ($1/month value)'}
                {plan.planName === 'Professional' && 'This plan includes 2 phone numbers - local and toll-free ($3/month value)'}
                {plan.planName === 'Enterprise' && 'This plan includes 5 phone numbers with premium features ($5/month value)'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Phone numbers will be automatically provisioned after payment and configured with your AI receptionist
              </p>
            </div>

            {/* Billing Notice */}
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded">
              <p className="font-medium text-green-600 mb-2">
                🎉 Free Trial - No charges for 14 days
              </p>
              <p>
                • Your free trial starts immediately upon signup with full access to all features
              </p>
              <p>
                • After 14 days, you'll be charged ${formatPrice(plan.monthlyPrice)} and then monthly on this date
              </p>
              <p>
                • You can cancel anytime during your trial with no charges
              </p>
              <p>
                • All charges are processed in USD
              </p>
              <p>
                • Phone numbers are included in your subscription at no extra cost
              </p>
            </div>

            {/* Submit Button */}
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!stripe || !elements || isProcessing}
                data-testid="complete-payment"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    Start Free Trial
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={isProcessing}
                data-testid="cancel-checkout"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}