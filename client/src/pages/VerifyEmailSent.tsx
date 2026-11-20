import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import logoImage from '@assets/logo Background Removed-2_1757304575816.png';

export default function VerifyEmailSent() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const signupEmail = localStorage.getItem('signupEmail');
    if (signupEmail) {
      setEmail(signupEmail);

      // Start provisioning in background
      fetch('/api/auth/start-provisioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: signupEmail })
      })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            console.log('✅ Provisioning started in background:', result.message);
          } else {
            console.warn('⚠️ Failed to start provisioning:', result.error);
          }
        })
        .catch(error => {
          console.error('❌ Error starting provisioning:', error);
        });
    }
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (result.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        console.error('Failed to resend verification email');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-screen text-white overflow-auto" style={{ backgroundColor: '#0D0D0D' }}>
      <div className="h-full flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={logoImage} 
              alt="VoiceBot Logo" 
              className="h-20 w-20 object-cover"
            />
          </div>

          {/* Main Message */}
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-6">
            Email Verification Sent
          </h1>

          {/* Description */}
          <p className="text-gray-300 text-lg mb-4">
            We've sent a verification email to
          </p>
          <p className="text-blue-400 font-semibold mb-8">
            {email || 'your email address'}
          </p>

          <div className="space-y-4 mb-8">
            <p className="text-gray-400 text-sm">
              Please check your inbox and click the verification link to activate your account.
            </p>
          </div>

          {/* Resend Button */}
          <Button
            onClick={handleResendEmail}
            disabled={isResending || resendSuccess}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-300 disabled:opacity-50 mb-4"
            data-testid="button-resend-email"
          >
            {isResending ? 'Sending...' : resendSuccess ? 'Email Sent!' : 'Resend'}
          </Button>

          {/* Back to Login */}
          <Button
            onClick={() => setLocation('/login')}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-gray-800 font-medium py-3 rounded-lg transition-all duration-300"
            data-testid="button-back-to-login"
          >
            Back to Login
          </Button>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs">
              Didn't receive the email? Check your spam folder or click "Resend"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
