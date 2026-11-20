import { useState, useEffect } from "react";
import { setPageMeta } from '@/lib/pageMeta';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Eye, EyeOff, Mail, Lock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { handleSignupCompletion } from "@/lib/signupProgressManager";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";

type AuthMode = 'login' | 'signup' | 'google-setup';

export default function Auth() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_setup') === 'true') return 'google-setup';
    return window.location.pathname === '/signup' ? 'signup' : 'login';
  });

  // Sync browser title, meta, and URL state with mode
  useEffect(() => {
    if (mode === 'google-setup') {
      setPageMeta({ title: 'Set Up Your Agent | VoiceBot' });
    } else if (mode === 'signup') {
      setPageMeta({
        title: 'Sign Up | VoiceBot',
        description: 'Create your VoiceBot account and set up an AI receptionist for your business in minutes.',
        canonical: 'https://voicebot.one/signup',
      });
      if (window.location.pathname !== '/signup') window.history.replaceState({}, '', '/signup');
    } else {
      setPageMeta({
        title: 'Sign In | VoiceBot',
        description: 'Sign in to your VoiceBot account to manage your AI receptionist.',
        canonical: 'https://voicebot.one/login',
      });
      if (window.location.pathname !== '/login') window.history.replaceState({}, '', '/login');
    }
  }, [mode]);

  // --- Shared state ---
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // --- Invite state ---
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<{ businessName: string; role: string; inviterEmail: string; email: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviteLoading, setIsInviteLoading] = useState(false);

  // --- Signup state ---
  const [signupData, setSignupData] = useState({ fullName: '', email: '', password: '' });
  const [websiteInput, setWebsiteInput] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isGoogleSignupLoading, setIsGoogleSignupLoading] = useState(false);

  // --- Login state ---
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showIncompleteSignupModal, setShowIncompleteSignupModal] = useState(false);
  const [incompleteSignupData, setIncompleteSignupData] = useState<any>(null);
  const [showEmailNotVerifiedModal, setShowEmailNotVerifiedModal] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  // Check for URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const website = urlParams.get('website');
    const token = urlParams.get('token');

    // ── Invite token flow ──────────────────────────────────────────────────
    if (token && window.location.pathname === '/signup') {
      setInviteToken(token);
      setIsInviteLoading(true);
      fetch(`/api/team/verify-invite?token=${encodeURIComponent(token)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.invitation) {
            setInvitationInfo({
              businessName: data.invitation.businessName || 'the team',
              role: data.invitation.role || 'member',
              inviterEmail: data.invitation.inviterEmail || '',
              email: data.invitation.email || ''
            });
            setSignupData(prev => ({ ...prev, email: data.invitation.email || '' }));
            setAgreedToTerms(true);
          } else {
            setInviteError(data.message || 'This invitation link is invalid or has expired.');
          }
        })
        .catch(() => setInviteError('Failed to verify invitation. Please try again.'))
        .finally(() => setIsInviteLoading(false));
      // Clean token from URL bar without losing the page
      window.history.replaceState({}, document.title, '/signup');
      return;
    }

    if (error === 'oauth_failed') {
      toast({
        title: "Authentication Failed",
        description: mode === 'signup'
          ? "Google authentication failed. Please try again or use email signup."
          : "Google authentication failed. Please try again or use email login.",
        variant: "destructive"
      });
    }

    if (website) {
      setWebsiteInput(decodeURIComponent(website));
    } else if (urlParams.get('google_setup') === 'true') {
      // Fallback: read website from localStorage if it was stored during the landing page flow
      try {
        const stored = localStorage.getItem('pendingWebsiteData');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.url) setWebsiteInput(parsed.url);
        }
      } catch { /* ignore parse errors */ }
    }

    if (error || website) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // google_setup param is already handled via useState initializer; clean the URL
    if (urlParams.get('google_setup') === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ── SIGNUP HANDLERS ──────────────────────────────────────────────────────

  const handleDirectSignup = async () => {
    setIsSignupLoading(true);
    try {
      const website = inviteToken ? null : (websiteInput.trim() || null);

      const body: Record<string, any> = {
        fullName: signupData.fullName.trim() || undefined,
        email: signupData.email.trim(),
        password: signupData.password,
        website
      };
      if (inviteToken) body.inviteToken = inviteToken;

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create account');
      }

      // ── Invitation accepted ────────────────────────────────────────────
      if (result.success && result.inviteAccepted) {
        toast({
          title: "Welcome to the team!",
          description: `You've joined ${invitationInfo?.businessName || 'the organization'} as ${result.role || invitationInfo?.role || 'a member'}.`,
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await new Promise(resolve => setTimeout(resolve, 300));
        const dashboardUrl = result.ownerId
          ? `/dashboard?inviteAccepted=true&ownerId=${result.ownerId}`
          : '/dashboard';
        setLocation(dashboardUrl);
        return;
      }

      if (result.success && result.emailSent) {
        toast({
          title: "Verification Email Sent!",
          description: "Please check your email to verify your account.",
        });
        localStorage.setItem('signupEmail', signupData.email.trim());
        setTimeout(() => setLocation('/verify-email-sent'), 500);
        return;
      }

      if (result.success) {
        localStorage.setItem('signupEmail', signupData.email.trim());
        if (signupData.fullName.trim()) {
          localStorage.setItem('signupName', signupData.fullName.trim());
        }

        if (result.existingUser) {
          try {
            const loginResponse = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: signupData.email.trim(), password: signupData.password }),
              credentials: 'include'
            });
            const loginResult = await loginResponse.json();
            if (loginResponse.ok && loginResult.success) {
              toast({ title: "Welcome Back!", description: "Checking your signup progress..." });
              const redirectPath = await handleSignupCompletion().catch(() => null);
              setTimeout(() => setLocation(redirectPath || '/dashboard'), 800);
              return;
            } else {
              toast({
                title: "Account Exists with Different Password",
                description: "An account with this email already exists but the password is incorrect. Please try logging in instead.",
                variant: "destructive"
              });
              setIsSignupLoading(false);
              return;
            }
          } catch {
            toast({
              title: "Email Already Exists",
              description: "An account with this email already exists. Please try logging in instead.",
              variant: "destructive"
            });
            setIsSignupLoading(false);
            return;
          }
        } else {
          toast({ title: "Account Created!", description: "Welcome to VoiceBot. Setting up your business..." });

          if (result.user?.id) {
            await fetch('/api/signup-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: result.user.id,
                currentStep: 'account-created',
                stepData: { fullName: signupData.fullName, email: signupData.email },
                completedSteps: ['account-created'],
                isCompleted: false
              })
            }).catch(console.error);
          }
        }

        localStorage.setItem('accountInfo', JSON.stringify({
          fullName: signupData.fullName,
          email: signupData.email,
          userId: result.user?.id,
          existingUser: false
        }));

        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await new Promise(resolve => setTimeout(resolve, 300));
        setLocation('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSignupLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setIsGoogleSignupLoading(true);
    const website = websiteInput.trim();
    const url = website
      ? `/api/auth/google?signup=true&website=${encodeURIComponent(website)}`
      : "/api/auth/google?signup=true";
    window.location.href = url;
  };

  // ── LOGIN HANDLERS ───────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoginLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginData.email, password: loginData.password }),
        credentials: 'include'
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({ title: "Login Successful!", description: "Welcome back to VoiceBot!" });

        // Check subscription status
        try {
          const userResponse = await fetch('/api/auth/user', { credentials: 'include' });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.hasActiveSubscription || userData.isSubscribed) {
              window.location.href = '/dashboard';
              return;
            }
          }
        } catch { /* continue */ }

        // Check team membership
        try {
          const membershipResponse = await fetch('/api/team/my-membership', { credentials: 'include' });
          if (membershipResponse.ok) {
            const membershipData = await membershipResponse.json();
            if (membershipData.success && membershipData.isTeamMember) {
              localStorage.setItem('viewingOwnerId', membershipData.ownerId);
              window.location.href = '/dashboard';
              return;
            }
          }
        } catch { /* continue */ }

        // Check incomplete signup
        if (result.user?.id) {
          try {
            const progressResponse = await fetch(`/api/signup-progress?userId=${result.user.id}`, { credentials: 'include' });
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData && !progressData.isCompleted) {
                try {
                  const phoneResponse = await fetch('/api/user/phone-number', { credentials: 'include' });
                  if (phoneResponse.ok) {
                    const phoneData = await phoneResponse.json();
                    if (phoneData?.phoneNumber) {
                      window.location.href = '/dashboard';
                      return;
                    }
                  }
                } catch { /* continue */ }
                setIncompleteSignupData(progressData);
                setShowIncompleteSignupModal(true);
                setIsLoginLoading(false);
                return;
              }
            }
          } catch { /* continue */ }
        }

        window.location.href = '/subscription/plans';
      } else {
        if (result.message?.toLowerCase().includes('email not verified') || result.error?.toLowerCase().includes('email not verified')) {
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
    } catch {
      toast({ title: "Login Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoginLoading(true);
    window.location.href = "/api/auth/google";
  };

  // ── GOOGLE SETUP HANDLER ─────────────────────────────────────────────────

  const handleCreateVoicebot = async () => {
    let website = websiteInput.trim();
    if (!website) {
      toast({
        title: "Website Required",
        description: "Please enter a valid website URL to continue.",
        variant: "destructive"
      });
      return;
    }
    // Auto-normalize URL — add https:// if missing
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      website = `https://${website}`;
      setWebsiteInput(website);
    }
    setIsSignupLoading(true);
    try {
      const response = await fetch('/api/auth/google-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ website })
      });
      const result = await response.json();
      if (response.status === 401) {
        // Session expired between OAuth redirect and form submit — send back to signup
        toast({
          title: "Session Expired",
          description: "Your session expired. Please sign in with Google again.",
          variant: "destructive"
        });
        setTimeout(() => { window.location.href = '/signup'; }, 1500);
        return;
      }
      if (!response.ok) throw new Error(result.message || 'Failed to start setup');
      if (result.success) {
        localStorage.removeItem('pendingWebsiteData');
        toast({ title: "Setup Started!", description: "Setting up your AI voice agent..." });
        setTimeout(() => setLocation(`/loading-dashboard?userId=${result.userId}`), 500);
      }
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to start setup. Please try again.",
        variant: "destructive"
      });
      setIsSignupLoading(false);
    }
  };

  const handleContinueSignup = () => {
    window.location.href = '/dashboard';
  };

  const sendVerificationEmail = async () => {
    setIsSendingVerification(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginData.email }),
        credentials: 'include'
      });
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link.",
      });
    } catch { /* silent */ } finally {
      setIsSendingVerification(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────

  const inputClass = "bg-transparent border-gray-800 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="h-screen text-white overflow-auto" style={{ backgroundColor: '#0D0D0D' }}>
      <div className="h-full flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="VoiceBot Logo" className="h-16 w-16 object-cover" />
          </div>

          {/* Google Setup Mode — "One Last Step" */}
          {mode === 'google-setup' && (
            <>
              <div className="flex justify-center mb-8">
                <h2 className="text-lg lg:text-xl font-bold text-white">One Last Step</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="website-input" className="block text-gray-300 font-medium text-sm">
                    Website
                  </label>
                  <input
                    id="website-input"
                    type="text"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateVoicebot()}
                    placeholder="https://yourbusiness.com"
                    className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="input-website"
                  />
                </div>
                <Button
                  onClick={handleCreateVoicebot}
                  disabled={isSignupLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
                  data-testid="button-create-voicebot"
                >
                  {isSignupLoading ? (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Setting up...
                    </span>
                  ) : 'Create Voicebot'}
                </Button>
                <div className="text-center pt-2">
                  <p className="text-gray-400 text-sm">
                    Your AI agent will be customized based on your website content, industry, and business information.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Login / Signup Heading */}
          {mode !== 'google-setup' && (
            <div className="flex justify-center mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-white">
                {inviteToken ? 'Accept Your Invitation' : (mode === 'signup' ? 'Create an Account' : 'Welcome Back')}
              </h2>
            </div>
          )}

          {/* Invitation Banner */}
          {inviteToken && mode === 'signup' && (
            <div className="mb-6">
              {isInviteLoading && (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-gray-800 bg-gray-900 text-gray-400 text-sm">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Verifying invitation...</span>
                </div>
              )}
              {!isInviteLoading && invitationInfo && (
                <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        You've been invited to join <span className="text-blue-400">{invitationInfo.businessName}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Role: <span className="text-gray-300 capitalize">{invitationInfo.role}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Create your account below to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {!isInviteLoading && inviteError && (
                <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-300">Invalid Invitation</p>
                      <p className="text-xs text-gray-400 mt-1">{inviteError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form (login / signup only) */}
          {mode !== 'google-setup' && (
          <div className="space-y-6">
            {/* Google Auth Button — hidden in invite mode */}
            {!inviteToken && (
              <div className="space-y-2">
                <Button
                  onClick={mode === 'signup' ? handleGoogleSignup : handleGoogleLogin}
                  disabled={mode === 'signup' ? isGoogleSignupLoading : isLoginLoading}
                  className="w-full bg-transparent hover:bg-gray-800 text-gray-300 border border-gray-800 font-medium py-3 rounded-lg transition-all duration-300 disabled:opacity-50 relative"
                  data-testid="button-google-auth"
                >
                  <i className="fab fa-google absolute left-4 top-1/2 -translate-y-1/2"></i>
                  <span>{(mode === 'signup' ? isGoogleSignupLoading : isLoginLoading) ? 'Signing in...' : 'Continue with Google'}</span>
                </Button>
                {mode === 'signup' && (
                  <p className="text-center text-xs text-gray-500">
                    By clicking "Continue with Google", I agree to the{" "}
                    <a href="/terms" className="text-blue-500 hover:text-blue-400 underline">Terms of Service</a>
                  </p>
                )}
              </div>
            )}

            {/* Divider — hidden in invite mode */}
            {!inviteToken && <div className="w-full border-t border-gray-800"></div>}

{/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-medium">
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={mode === 'signup' ? signupData.email : loginData.email}
                  onChange={(e) =>
                    inviteToken ? undefined : (
                      mode === 'signup'
                        ? setSignupData(prev => ({ ...prev, email: e.target.value }))
                        : setLoginData(prev => ({ ...prev, email: e.target.value }))
                    )
                  }
                  onKeyDown={mode === 'login' ? (e) => e.key === 'Enter' && handleLogin() : undefined}
                  readOnly={!!inviteToken}
                  className={`${inputClass} ${inviteToken ? 'opacity-70 cursor-not-allowed pr-10' : ''}`}
                  data-testid="input-email"
                  required
                />
                {inviteToken && (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            {/* Signup-only: Website — hidden in invite mode */}
            {mode === 'signup' && !inviteToken && (
              <div className="space-y-2">
                <Label htmlFor="website-input" className="text-gray-300 font-medium">
                  Website
                </Label>
                <Input
                  id="website-input"
                  type="text"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={mode === 'signup' ? signupData.password : loginData.password}
                  onChange={(e) =>
                    mode === 'signup'
                      ? setSignupData(prev => ({ ...prev, password: e.target.value }))
                      : setLoginData(prev => ({ ...prev, password: e.target.value }))
                  }
                  onKeyDown={mode === 'login' ? (e) => e.key === 'Enter' && handleLogin() : undefined}
                  className={`${inputClass} pr-10`}
                  data-testid="input-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Signup-only: Terms checkbox */}
            {mode === 'signup' && (
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded border border-gray-800 cursor-pointer flex items-center justify-center transition-colors ${agreedToTerms ? 'bg-blue-600 border-blue-600' : 'bg-transparent'}`}
                >
                  {agreedToTerms && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                  I agree to the{" "}
                  <a href="/terms" className="text-blue-500 hover:text-blue-400 underline" onClick={(e) => e.stopPropagation()}>
                    Terms of Service
                  </a>
                </label>
              </div>
            )}

            {/* Primary Action Button */}
            {mode === 'signup' ? (
              <Button
                onClick={handleDirectSignup}
                disabled={isSignupLoading || !agreedToTerms || isInviteLoading || !!inviteError}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-signup"
              >
                {isSignupLoading ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating Account...
                  </span>
                ) : inviteToken ? 'Join Team' : 'Create Account'}
              </Button>
            ) : (
              <Button
                onClick={handleLogin}
                disabled={isLoginLoading || !loginData.email || !loginData.password}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-login"
              >
                {isLoginLoading ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Signing In...
                  </span>
                ) : 'Sign In'}
              </Button>
            )}

            {/* Mode Toggle Link */}
            <div className="text-center pt-2">
              {mode === 'signup' && !inviteToken ? (
                <p className="text-xs text-gray-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode('login'); setShowPassword(false); }}
                    className="text-blue-500 hover:text-blue-400 underline"
                  >
                    Sign in here
                  </button>
                </p>
              ) : mode === 'signup' && inviteToken ? null : (
                <p className="text-xs text-gray-500">
                  Don't have an account?{" "}
                  <button
                    onClick={() => { setMode('signup'); setShowPassword(false); }}
                    className="text-blue-500 hover:text-blue-400 underline"
                  >
                    Sign up here
                  </button>
                </p>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Incomplete Signup Modal (login only) */}
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
              onClick={() => { setShowIncompleteSignupModal(false); setIncompleteSignupData(null); }}
              className="w-full bg-gray-800 text-white hover:bg-gray-700 border-gray-700"
              data-testid="button-dismiss-signup"
            >
              No, Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Not Verified Modal (login only) */}
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
              onClick={() => setShowEmailNotVerifiedModal(false)}
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
