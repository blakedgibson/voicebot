import { useState, useEffect } from 'react';
import { 
  Elements,
  useStripe, 
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { stripePromise } from '@/lib/stripe';

interface PaymentFormProps {
  plan: {
    name: string;
    price: string;
    period: string;
    description: string;
  };
  onBack: () => void;
}

// Stripe Elements styling
const elementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'transparent',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
    },
  },
};

function InlinePaymentForm({ plan, onBack }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  // Provisioning status tracking
  const [provisioningStatus, setProvisioningStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed' | 'error'>('pending');
  const [provisioningData, setProvisioningData] = useState<{
    agentId?: string;
    phoneNumber?: string;
    knowledgeBaseId?: string;
  }>({});
  const [pollCount, setPollCount] = useState(0);

  // Get user email from authenticated user or fallback to stored email
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    // If user is authenticated, use their data
    if (user && (user as any)?.email) {
      setUserEmail((user as any).email);
      const firstName = (user as any)?.firstName;
      const lastName = (user as any)?.lastName;
      setUserName(firstName && lastName ? 
        `${firstName} ${lastName}` : 
        (firstName || ''));
    } else {
      // Try to get email from localStorage (from signup process)
      const storedEmail = localStorage.getItem('signupEmail') || localStorage.getItem('userEmail');
      const storedName = localStorage.getItem('signupName') || localStorage.getItem('userName');
      
      if (storedEmail) {
        setUserEmail(storedEmail);
        setUserName(storedName || '');
        
        // Attempt to auto-login the user
        tryAutoLogin(storedEmail);
      }
    }
  }, [user]);

  const tryAutoLogin = async (email: string) => {
    try {
      console.log('🔄 Attempting auto-login for payment access...');
      const paymentToken = localStorage.getItem('paymentToken');
      if (!paymentToken) {
        console.log('No payment token found, skipping auto-login');
        return;
      }
      const loginResponse = await apiRequest('POST', '/api/auth/login', {
        email: email,
        loginAfterPayment: true,
        paymentToken,
      });

      if (loginResponse.ok) {
        console.log('✅ Auto-login successful');
        localStorage.removeItem('paymentToken');
        // Refresh the auth state by refetching user data
        window.location.reload();
      }
    } catch (error) {
      console.log('Auto-login failed, continuing with stored email');
    }
  };

  // Poll provisioning status after payment succeeds
  useEffect(() => {
    if (!paymentSucceeded || !userEmail) return;

    let pollInterval: NodeJS.Timeout;

    const checkProvisioningStatus = async () => {
      try {
        console.log(`🔍 Polling provisioning status (attempt ${pollCount + 1})...`);

        const response = await fetch(`/api/subscription/provisioning-status?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();

        console.log('═══════════════════════════════════════');
        console.log('📊 PROVISIONING STATUS CHECK:');
        console.log('   data.completed:', data.completed);
        console.log('   data.status:', data.status);
        console.log('   data.agentId:', data.agentId);
        console.log('   data.phoneNumber:', data.phoneNumber);
        console.log('   data.knowledgeBaseId:', data.knowledgeBaseId);
        console.log('═══════════════════════════════════════');

        setProvisioningStatus(data.status);
        setProvisioningData({
          agentId: data.agentId,
          phoneNumber: data.phoneNumber,
          knowledgeBaseId: data.knowledgeBaseId
        });

        // Redirect when provisioning is completed OR when we have a phone number
        const shouldRedirect = data.completed || (data.status === 'completed') || (data.phoneNumber && data.agentId);

        console.log('🔍 Should redirect?', shouldRedirect);
        console.log('   - data.completed:', data.completed);
        console.log('   - status === completed:', data.status === 'completed');
        console.log('   - has phone & agent:', !!(data.phoneNumber && data.agentId));

        if (shouldRedirect) {
          console.log('🚀🚀🚀 REDIRECTING TO DASHBOARD NOW! 🚀🚀🚀');
          clearInterval(pollInterval);

          toast({
            title: "Setup Complete! 🎉",
            description: "Your AI receptionist is ready. Redirecting to dashboard...",
          });

          console.log('⏰ Redirecting in 500ms...');
          setTimeout(() => {
            console.log('🌐 Executing redirect to /dashboard');
            window.location.href = '/dashboard';
          }, 500);
        } else {
          console.log('⏳ Not ready yet, continuing to poll...');
        }

        setPollCount(prev => prev + 1);
      } catch (error) {
        console.error('Error polling provisioning status:', error);
        // Don't stop polling on network errors - just continue trying
      }
    };

    // Start polling immediately, then every 2 seconds
    checkProvisioningStatus();
    pollInterval = setInterval(checkProvisioningStatus, 2000);

    // Cleanup on unmount
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [paymentSucceeded, userEmail, pollCount, toast]);

  const email = userEmail;
  const name = userName;

  // Get plan-specific features to match pricing demo page
  const getPlanFeatures = (planName: string) => {
    const planFeatures: Record<string, string[]> = {
      'Small': [
        '250 phone minutes per month',
        '$0.50 per extra minute overage'
      ],
      'Medium': [
        '800 phone minutes per month', 
        '$0.45 per extra minute overage'
      ],
      'Large': [
        '1,800 phone minutes per month',
        '$0.40 per extra minute overage'
      ]
    };
    return planFeatures[planName] || planFeatures['Small'];
  };

  // Map plan names to slugs for secure server-side pricing
  const getPlanSlug = (planName: string): string => {
    const planMap: Record<string, string> = {
      'Small': 'small',
      'Medium': 'medium', 
      'Large': 'large'
    };
    return planMap[planName] || 'small';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: "Stripe is not loaded. Please refresh and try again.",
      });
      return;
    }

    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please complete signup first to continue with payment.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Ensure Stripe customer exists
      console.log('🏪 Ensuring Stripe customer for:', email);
      const customerResponse = await apiRequest('POST', '/api/billing/ensure-customer', {
        email
      });
      const customerData = await customerResponse.json();
      
      if (!customerData.customerId) {
        throw new Error('Failed to create customer');
      }

      console.log('✅ Customer ensured:', customerData.customerId);

      // Step 2: Create payment method from card details
      console.log('💳 Creating payment method and charging subscription...');
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name,
          email,
        },
      });

      if (error) {
        console.error('❌ Payment method creation failed:', error);
        throw new Error(error.message || 'Failed to create payment method');
      }

      console.log('✅ Payment method created:', paymentMethod.id);

      // Step 3: Create subscription and charge immediately
      const planSlug = getPlanSlug(plan.name);
      const subscriptionResponse = await apiRequest('POST', '/api/billing/create-subscription-intent', {
        planSlug,
        email,
        customerId: customerData.customerId,
        paymentMethodId: paymentMethod.id
      });
      const subscriptionData = await subscriptionResponse.json();

      if (subscriptionData.success) {
        console.log('🎉 Subscription created and charged successfully!');
        console.log('🔄 Starting provisioning status polling...');
        setPaymentSucceeded(true);

        // Update signup progress to payment-completed
        if (user && (user as any)?.id) {
          try {
            await fetch('/api/signup-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                userId: (user as any).id,
                currentStep: 'payment-completed',
                stepData: {
                  subscription: subscriptionData
                },
                completedSteps: ['account-created', 'business-info', 'business-confirmed', 'payment-completed'],
                isCompleted: true
              })
            });
            console.log('✅ Signup progress marked as payment-completed');
          } catch (progressError) {
            console.warn('⚠️ Failed to update signup progress (non-blocking):', progressError);
          }
        }

        toast({
          title: "Payment Successful! 🎉",
          description: `Welcome to VoiceBot ${plan.name}! Setting up your AI receptionist...`,
        });

        // Polling will start automatically via useEffect
        // No immediate redirect - wait for provisioning to complete
      } else {
        console.error('❌ Subscription response missing success flag:', subscriptionData);
        throw new Error('Failed to create and charge subscription - no success confirmation');
      }

    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment. Please try again.",
      });
      setIsProcessing(false);
    }
  };

  // Success state with provisioning progress
  if (paymentSucceeded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0D0D0D', zIndex: 9999 }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Start Your Free Trial
          </CardTitle>
          
          {/* Free Trial Banner */}
          <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg border border-green-200 dark:border-green-700 text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <i className="fas fa-gift text-green-600"></i>
              <span className="font-semibold text-sm">14-Day Free Trial • No charges during trial</span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400">
              Full access to {plan.name} features for 14 days at no cost
            </p>
          </div>
          
          <div className="text-center">
            <span className="text-3xl font-bold text-cyan-400">{plan.price}</span>
            <span className="text-gray-400 ml-2">/ {plan.period}</span>
            <p className="text-xs text-gray-500 mt-1">after free trial</p>
          </div>
          <p className="text-gray-300 text-center text-sm">
            {plan.description}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Plan Features */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white">What's included:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              {getPlanFeatures(plan.name).map((feature, index) => (
                <li key={index} className="flex items-center">
                  <i className="fas fa-check text-green-400 mr-3"></i>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Information */}
            <div className="space-y-4">
              <Label className="text-white">Payment Information</Label>
              
              <div>
                <Label htmlFor="card-number" className="text-sm text-gray-300">Card Number</Label>
                <div className="mt-1 p-3 bg-gray-700 border border-gray-800 rounded-md">
                  <CardNumberElement 
                    id="card-number"
                    options={elementOptions}
                    data-testid="card-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card-expiry" className="text-sm text-gray-300">MM / YY</Label>
                  <div className="mt-1 p-3 bg-gray-700 border border-gray-800 rounded-md">
                    <CardExpiryElement 
                      id="card-expiry"
                      options={elementOptions}
                      data-testid="card-expiry"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="card-cvc" className="text-sm text-gray-300">CVC</Label>
                  <div className="mt-1 p-3 bg-gray-700 border border-gray-800 rounded-md">
                    <CardCvcElement 
                      id="card-cvc"
                      options={elementOptions}
                      data-testid="card-cvc"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isProcessing || !stripe}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
              data-testid="button-checkout"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing Payment...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <i className="fas fa-gift mr-2"></i>
                  Start Free Trial
                </span>
              )}
            </Button>

            <Button
              type="button"
              onClick={onBack}
              variant="ghost"
              disabled={isProcessing}
              className="w-full text-gray-400 hover:text-white"
              data-testid="button-back"
            >
              ← Back to Plans
            </Button>
          </form>

          {/* Trust Indicators */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex justify-center space-x-6 text-xs text-gray-500">
              <span className="flex items-center">
                <i className="fas fa-shield-alt mr-1"></i>
                SSL Secured
              </span>
              <span className="flex items-center">
                <i className="fas fa-lock mr-1"></i>
                256-bit Encryption
              </span>
              <span className="flex items-center">
                <i className="fab fa-stripe mr-1"></i>
                Powered by Stripe
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component wrapper with Elements provider
export default function StripePayment({ plan, onBack }: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <InlinePaymentForm plan={plan} onBack={onBack} />
    </Elements>
  );
}