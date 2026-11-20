import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Eye, EyeOff, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showIncompleteSignupModal, setShowIncompleteSignupModal] = useState(false);
  const [incompleteSignupData, setIncompleteSignupData] = useState<any>(null);
  const [showEmailNotVerifiedModal, setShowEmailNotVerifiedModal] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const { toast } = useToast();

  // Check for OAuth error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error === 'oauth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Google authentication failed. Please try again or use email login.",
        variant: "destructive"
      });
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Login Successful!",
          description: "Welcome back to VoiceBot!",
          variant: "default"
        });

        // Check subscription status FIRST - subscribed users should go straight to dashboard
        try {
          const userResponse = await fetch('/api/auth/user', {
            credentials: 'include'
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('User data after login:', userData);
            
            if (userData.hasActiveSubscription || userData.isSubscribed) {
              // User has active subscription - redirect to dashboard immediately
              console.log('✅ User has active subscription, redirecting to dashboard');
              window.location.href = '/dashboard';
              return; // Exit early for subscribed users
            }
          }
        } catch (userError) {
          console.error('Error checking user subscription status:', userError);
        }

        // Check if user is a team member - they can access owner's dashboard without their own subscription
        try {
          const membershipResponse = await fetch('/api/team/my-membership', {
            credentials: 'include'
          });
          
          if (membershipResponse.ok) {
            const membershipData = await membershipResponse.json();
            console.log('Team membership data:', membershipData);
            
            if (membershipData.success && membershipData.isTeamMember) {
              // User is a team member - set viewingOwnerId and redirect to dashboard
              console.log('✅ User is team member, accessing owner dashboard');
              localStorage.setItem('viewingOwnerId', membershipData.ownerId);
              window.location.href = '/dashboard';
              return; // Exit early for team members
            }
          }
        } catch (membershipError) {
          console.error('Error checking team membership:', membershipError);
        }

        // Only check for incomplete signup if user is NOT subscribed and NOT a team member
        if (result.user && result.user.id) {
          try {
            const progressResponse = await fetch(`/api/signup-progress?userId=${result.user.id}`, {
              credentials: 'include'
            });

            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              console.log('Signup progress data:', progressData);

              // Check if user has incomplete signup progress
              if (progressData && !progressData.isCompleted) {
                // ADDITIONAL CHECK: Verify user hasn't been provisioned yet
                // If user has phone numbers or agents, they've completed signup even if flag says otherwise
                try {
                  const phoneResponse = await fetch('/api/user/phone-number', {
                    credentials: 'include'
                  });

                  if (phoneResponse.ok) {
                    const phoneData = await phoneResponse.json();
                    if (phoneData && phoneData.phoneNumber) {
                      // User has been provisioned - signup is actually complete
                      console.log('✅ User has phone number provisioned - signup considered complete');
                      window.location.href = '/dashboard';
                      return;
                    }
                  }
                } catch (phoneError) {
                  console.log('Could not check phone provisioning status:', phoneError);
                }

                // User has incomplete signup and no provisioning - show modal
                setIncompleteSignupData(progressData);
                setShowIncompleteSignupModal(true);
                setIsLoading(false);
                return;
              }
            } else if (progressResponse.status === 404) {
              // No signup progress found - this is normal for users who completed signup
              console.log('No signup progress found - user completed signup normally');
            } else {
              // Other error
              console.log('Signup progress check failed:', progressResponse.status);
            }
          } catch (progressError) {
            console.log('Error checking signup progress:', progressError);
          }
        }

        // If not subscribed, not a team member, and no incomplete signup, redirect to subscription plans
        console.log('⚠️ User does not have active subscription or team access, redirecting to plans');
        window.location.href = '/subscription/plans';
      } else {
        // Check if the error is due to unverified email
        if (result.message && (result.message.toLowerCase().includes('email not verified') || result.error && result.error.toLowerCase().includes('email not verified'))) {
          // Show email verification modal and automatically send verification email
          setShowEmailNotVerifiedModal(true);
          await sendVerificationEmail();
        } else {
          toast({
            title: "Login Failed",
            description: result.message || result.error || "Invalid email or password.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setIsLoading(true);
    
    // Use backend OAuth flow (no signup parameter for login)
    window.location.href = "/api/auth/google";
  };

  const handleContinueSignup = () => {
    if (!incompleteSignupData) return;

    // Redirect to appropriate step based on saved progress
    const currentStep = incompleteSignupData.currentStep;
    
    // Redirect to dashboard for all cases since onboarding pages are removed
    window.location.href = '/dashboard';
  };

  const handleDismissModal = () => {
    setShowIncompleteSignupModal(false);
    setIncompleteSignupData(null);
  };

  const sendVerificationEmail = async () => {
    setIsSendingVerification(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox and click the verification link.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleCloseEmailNotVerifiedModal = () => {
    setShowEmailNotVerifiedModal(false);
  };

  return (
    <div className="h-screen text-white overflow-auto" style={{ backgroundColor: '#0D0D0D' }}>
      {/* Main Content */}
      <div className="h-full flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="VoiceBot Logo" className="h-16 w-16 object-cover" />
          </div>

          {/* Heading */}
          <div className="flex justify-center mb-8">
            <h2 className="text-lg lg:text-xl font-bold text-white">Welcome Back</h2>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Google Auth Button */}
            <Button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-800 font-medium py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
              data-testid="button-google-auth"
            >
              <i className="fab fa-google mr-3"></i>
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            {/* Divider */}
            <div className="w-full border-t border-gray-700"></div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                data-testid="input-email"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500 pr-10"
                  data-testid="input-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              onClick={handleLogin}
              disabled={isLoading || !formData.email || !formData.password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-login"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Sign Up Link */}
            <div className="text-center pt-2">
              <p className="text-gray-400 text-sm">
                Don't have an account?{" "}
                <a href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Incomplete Signup Modal */}
      <AlertDialog open={showIncompleteSignupModal} onOpenChange={setShowIncompleteSignupModal}>
        <AlertDialogContent className="premium-card text-white border-gray-700 max-w-lg">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-white text-xl text-center">
              Incomplete Signup Process
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-base text-center pt-2">
              You have not completed the sign up process. Would you like to continue to sign up?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-col gap-3 sm:gap-3">
            <AlertDialogAction
              onClick={handleContinueSignup}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-continue-signup"
            >
              Yes, Continue Signup
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={handleDismissModal}
              className="w-full bg-gray-800 text-white hover:bg-gray-700 border-gray-800"
              data-testid="button-dismiss-signup"
            >
              No, Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Not Verified Modal */}
      <AlertDialog open={showEmailNotVerifiedModal} onOpenChange={setShowEmailNotVerifiedModal}>
        <AlertDialogContent className="premium-card text-white border-gray-700 max-w-lg">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <Mail className="w-12 h-12 text-blue-500" />
            </div>
            <AlertDialogTitle className="text-white text-xl text-center">
              Email Not Verified Yet
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-base text-center pt-2">
              {isSendingVerification ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending verification email...
                </span>
              ) : (
                "We've sent a new verification email to your inbox. Please check your email and click the verification link to activate your account."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-col gap-3 sm:gap-3">
            <AlertDialogAction
              onClick={handleCloseEmailNotVerifiedModal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-close-email-modal"
            >
              Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
