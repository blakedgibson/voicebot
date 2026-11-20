import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import logoImage from '@assets/logo Background Removed-2_1757304575816.png';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Extract token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setStatus('error');
          setErrorMessage('Invalid verification link. Please try again.');
          return;
        }

        // Call verification endpoint
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for session management
          body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setUserId(result.userId);

          // Store the one-time payment token so StripePayment/PhoneNumberSuccessModal
          // can authenticate after the Stripe redirect without bypassing password auth.
          if (result.paymentToken) {
            localStorage.setItem('paymentToken', result.paymentToken);
          }

          // Wait a moment then redirect to loading dashboard
          setTimeout(() => {
            setLocation(`/loading-dashboard?userId=${result.userId}`);
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Verification failed. Please try again.');
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setErrorMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [setLocation]);

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

          {status === 'verifying' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Verifying Your Email
              </h1>
              <p className="text-gray-400">
                Please wait while we verify your account...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-green-600/20 rounded-full p-6">
                  <svg
                    className="w-16 h-16 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Email Verified!
              </h1>
              <p className="text-gray-400">
                Redirecting you to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-red-600/20 rounded-full p-6">
                  <svg
                    className="w-16 h-16 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Verification Failed
              </h1>
              <p className="text-gray-400 mb-8">
                {errorMessage}
              </p>
              <button
                onClick={() => setLocation('/signup')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-300"
                data-testid="button-back-to-signup"
              >
                Back to Signup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
