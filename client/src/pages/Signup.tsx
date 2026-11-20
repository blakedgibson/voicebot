import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { handleSignupCompletion } from "@/lib/signupProgressManager";
import { queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Mail, Building2 } from "lucide-react";
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";

interface InvitationInfo {
  email: string;
  role: string;
  inviterName?: string;
  businessName?: string;
  expiresAt?: string;
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [websiteInput, setWebsiteInput] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const website = urlParams.get('website');
    const token = urlParams.get('token');

    if (error === 'oauth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Google authentication failed. Please try again or use email signup.",
        variant: "destructive"
      });
    }

    if (website) {
      setWebsiteInput(decodeURIComponent(website));
    }

    if (token) {
      setInviteToken(token);
      fetchInvitationInfo(token);
    } else {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const fetchInvitationInfo = async (token: string) => {
    setIsLoadingInvite(true);
    try {
      const response = await fetch(`/api/team/verify-invite?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      if (data.success && data.invitation) {
        setInvitationInfo(data.invitation);
        setFormData(prev => ({ ...prev, email: data.invitation.email }));
      } else {
        setInviteError(data.message || "This invitation link is invalid or has expired.");
      }
    } catch {
      setInviteError("Unable to load invitation details. Please try again.");
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDirectSignup = async () => {
    setIsSignupLoading(true);
    try {
      const website = websiteInput.trim() || null;

      const body: Record<string, any> = {
        fullName: formData.fullName.trim() || undefined,
        email: formData.email.trim(),
        password: formData.password,
      };

      if (inviteToken) {
        body.inviteToken = inviteToken;
      } else if (website) {
        body.website = website;
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create account');
      }

      // ── Invitation accepted: go straight to dashboard ──────────────────────
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

      // ── Normal flow: verification email sent ──────────────────────────────
      if (result.success && result.emailSent) {
        toast({
          title: "Verification Email Sent!",
          description: "Please check your email to verify your account.",
        });
        localStorage.setItem('signupEmail', formData.email.trim());
        setTimeout(() => setLocation('/verify-email-sent'), 500);
        return;
      }

      if (result.success) {
        localStorage.setItem('signupEmail', formData.email.trim());
        if (formData.fullName.trim()) {
          localStorage.setItem('signupName', formData.fullName.trim());
        }

        if (result.existingUser) {
          try {
            const loginResponse = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
              credentials: 'include'
            });
            const loginResult = await loginResponse.json();
            if (loginResponse.ok && loginResult.success) {
              toast({ title: "Welcome Back!", description: "Checking your signup progress..." });
              const redirectPath = await handleSignupCompletion();
              setTimeout(() => setLocation(redirectPath || '/dashboard'), 800);
              return;
            } else {
              toast({ title: "Account Exists with Different Password", description: "An account with this email already exists but the password is incorrect. Please try logging in instead.", variant: "destructive" });
              setIsSignupLoading(false);
              return;
            }
          } catch {
            toast({ title: "Email Already Exists", description: "An account with this email already exists. Please try logging in instead.", variant: "destructive" });
            setIsSignupLoading(false);
            return;
          }
        } else {
          toast({ title: "Account Created!", description: "Welcome to VoiceBot. Setting up your business..." });
          if (result.user?.id) {
            try {
              await fetch('/api/signup-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: result.user.id, currentStep: 'account-created', stepData: { fullName: formData.fullName, email: formData.email }, completedSteps: ['account-created'], isCompleted: false })
              });
            } catch {}
          }
        }

        localStorage.setItem('accountInfo', JSON.stringify({ fullName: formData.fullName, email: formData.email, userId: result.user?.id, existingUser: false }));
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await new Promise(resolve => setTimeout(resolve, 300));
        setLocation("/dashboard");
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ title: "Signup Failed", description: error.message || "Failed to create account. Please try again.", variant: "destructive" });
    } finally {
      setIsSignupLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    const params = new URLSearchParams({ signup: 'true' });
    if (inviteToken) params.set('inviteToken', inviteToken);
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const roleLabel = (role?: string) => {
    const map: Record<string, string> = { owner: 'Owner', manager: 'Manager', employee: 'Employee', custom: 'Team Member' };
    return map[role || ''] || 'Team Member';
  };

  return (
    <div className="h-screen text-white overflow-auto" style={{ backgroundColor: '#0D0D0D' }}>
      <div className="h-full flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="VoiceBot Logo" className="h-16 w-16 object-cover" />
          </div>

          {/* Heading */}
          <div className="flex justify-center mb-6">
            <h2 className="text-lg lg:text-xl font-bold text-white">
              {inviteToken ? "Accept Your Invitation" : "Create an Account"}
            </h2>
          </div>

          {/* Invitation Banner */}
          {isLoadingInvite && (
            <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center text-sm text-blue-300">
              Loading invitation details...
            </div>
          )}

          {inviteError && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
              <p className="font-semibold mb-1">Invitation Issue</p>
              <p>{inviteError}</p>
            </div>
          )}

          {invitationInfo && !inviteError && (
            <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    You've been invited to join{" "}
                    <span className="text-blue-400">{invitationInfo.businessName || "the team"}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {invitationInfo.inviterName ? `${invitationInfo.inviterName} invited you` : "You were invited"} as a{" "}
                    <span className="text-gray-200 font-medium">{roleLabel(invitationInfo.role)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* Google Auth — hide when coming from an invite (email is fixed) */}
            {!inviteToken && (
              <>
                <Button
                  onClick={handleGoogleAuth}
                  disabled={isGoogleLoading}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-800 font-medium py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
                  data-testid="button-google-auth"
                >
                  <i className="fab fa-google mr-3"></i>
                  {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
                <div className="w-full border-t border-gray-700"></div>
              </>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-300 font-medium">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Jane Smith"
                className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                data-testid="input-full-name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-medium">
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => !inviteToken && handleInputChange('email', e.target.value)}
                  readOnly={!!inviteToken}
                  className={`bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500 ${inviteToken ? 'opacity-70 cursor-not-allowed pr-10' : ''}`}
                  data-testid="input-email"
                  required
                />
                {inviteToken && (
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                )}
              </div>
              {inviteToken && (
                <p className="text-xs text-gray-500">This email is set by your invitation and cannot be changed.</p>
              )}
            </div>

            {/* Website — hidden for invited users */}
            {!inviteToken && (
              <div className="space-y-2">
                <Label htmlFor="website-input" className="text-gray-300 font-medium">
                  Website
                </Label>
                <Input
                  id="website-input"
                  type="text"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  className="bg-gray-800 border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
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
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500 pr-10"
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

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer">
                I agree to the{" "}
                <a href="/terms" className="text-blue-500 hover:text-blue-400 underline">
                  Terms and Conditions
                </a>
              </label>
            </div>

            {/* Submit */}
            <Button
              onClick={handleDirectSignup}
              disabled={isSignupLoading || !agreedToTerms || isLoadingInvite || !!inviteError}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-signup"
            >
              {isSignupLoading ? (
                <span className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {inviteToken ? 'Joining team...' : 'Creating Account...'}
                </span>
              ) : (
                inviteToken ? 'Join Team' : 'Create Account'
              )}
            </Button>

            {/* Sign In Link */}
            <div className="text-center pt-2">
              <p className="text-gray-400 text-sm">
                Already have an account?{" "}
                <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
