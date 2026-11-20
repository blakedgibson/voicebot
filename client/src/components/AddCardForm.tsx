import { useState } from 'react';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2 } from 'lucide-react';

const elementStyle = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'transparent',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

function CardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const setupRes = await apiRequest('POST', '/api/billing/setup-intent', {});
      const { clientSecret } = await setupRes.json();

      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) throw new Error('Card element not found');

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardNumber },
      });

      if (error) throw new Error(error.message);

      await apiRequest('POST', '/api/billing/attach-payment-method', {
        paymentMethodId: setupIntent!.payment_method,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/billing/payment-methods'] });

      toast({ title: 'Card Added', description: 'Your payment method has been saved.' });
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to add card. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Card Number</label>
        <div className="border border-gray-800 rounded-lg px-3 py-3 bg-gray-800/60 focus-within:border-blue-500 transition-colors">
          <CardNumberElement options={elementStyle} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Expiry</label>
          <div className="border border-gray-800 rounded-lg px-3 py-3 bg-gray-800/60 focus-within:border-blue-500 transition-colors">
            <CardExpiryElement options={elementStyle} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">CVC</label>
          <div className="border border-gray-800 rounded-lg px-3 py-3 bg-gray-800/60 focus-within:border-blue-500 transition-colors">
            <CardCvcElement options={elementStyle} />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <span>🔒</span> Secured by Stripe
      </p>
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isProcessing || !stripe}
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" /> Save Card</>
          )}
        </Button>
      </div>
    </form>
  );
}

export function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  return (
    <Elements stripe={stripePromise}>
      <CardForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
