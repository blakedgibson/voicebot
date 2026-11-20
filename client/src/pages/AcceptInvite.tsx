import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, LogIn } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";

interface InviteVerifyResponse {
  success: boolean;
  invitation: {
    email: string;
    role: string;
    inviterName?: string;
    inviterEmail?: string;
    businessName?: string;
    expiresAt?: string;
  };
  message?: string;
}

export default function AcceptInvite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [autoAcceptAttempted, setAutoAcceptAttempted] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Get token from URL and store in localStorage for persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      // Store token in localStorage for persistence across refreshes
      localStorage.setItem('pendingInviteToken', urlToken);
      setToken(urlToken);
    } else {
      // Check if we have a stored token
      const storedToken = localStorage.getItem('pendingInviteToken');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Verify invitation token
  const { data: invitation, isLoading: isVerifying, error: verifyError } = useQuery<InviteVerifyResponse>({
    queryKey: [`/api/team/verify-invite?token=${token}`],
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/team/accept-invite', { token });
    },
    onSuccess: (data: any) => {
      // Clear the stored token
      localStorage.removeItem('pendingInviteToken');

      toast({
        title: "Invitation Accepted!",
        description: `You've been added to ${data.businessName || 'the team'}`,
      });

      // Redirect to dashboard
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to accept invitation";

      // Provide more helpful error messages
      let description = errorMessage;
      if (errorMessage.includes("different email")) {
        description = "This invitation was sent to a different email address. Please logout and sign in with the correct email.";
      }

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }
      
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Account Created!",
        description: "Now accepting your invitation...",
      });
      
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Accept the invitation
      acceptInviteMutation.mutate();
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Logged In!",
        description: "Now accepting your invitation...",
      });
      
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Accept the invitation
      acceptInviteMutation.mutate();
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !firstName || !lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    // Use the invitation email if available
    const emailToUse = invitation?.success ? invitation.invitation.email : email;
    
    signupMutation.mutate({
      email: emailToUse,
      password,
      firstName,
      lastName,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ email, password });
  };

  const handleGoogleAuth = () => {
    // Redirect to Google OAuth with invitation token
    window.location.href = `/api/auth/google?inviteToken=${token}`;
  };

  // Pre-fill email from invitation
  useEffect(() => {
    if (invitation?.success && invitation.invitation.email) {
      setEmail(invitation.invitation.email);
    }
  }, [invitation]);

  // Auto-accept for already logged-in users - but check email match first
  useEffect(() => {
    if (isAuthenticated && invitation?.success && !autoAcceptAttempted && !acceptInviteMutation.isPending && user) {
      setAutoAcceptAttempted(true);

      // Check if logged-in email matches invitation email
      const userEmail = (user as any)?.email;
      const invitationEmail = invitation.invitation.email;

      if (userEmail && invitationEmail && userEmail.toLowerCase() !== invitationEmail.toLowerCase()) {
        // Email mismatch - don't auto-accept
        console.log('Email mismatch detected:', { userEmail, invitationEmail });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Accepting your invitation...",
      });

      // Automatically accept the invitation
      acceptInviteMutation.mutate();
    }
  }, [isAuthenticated, invitation, autoAcceptAttempted, acceptInviteMutation, user]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D0D0D' }}>
        <Card className="w-full max-w-md bg-gray-900/60 border-gray-800/30">
          <CardHeader>
            <CardTitle className="text-red-400">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              No invitation token found. Please check your invitation email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isVerifying || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{isAuthLoading ? 'Checking authentication...' : 'Verifying invitation...'}</span>
        </div>
      </div>
    );
  }

  // Show loading state while auto-accepting for logged-in users
  if (isAuthenticated && invitation?.success && acceptInviteMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
        <Card className="w-full max-w-md bg-gray-900/60 border-gray-800/30">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-white">Accepting Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              Adding you to the team...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verifyError || !invitation?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D0D0D' }}>
        <Card className="w-full max-w-md bg-gray-900/60 border-gray-800/30">
          <CardHeader>
            <CardTitle className="text-red-400">Invitation Error</CardTitle>
            <CardDescription className="text-gray-400">
              {invitation?.message || 'This invitation is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-go-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inviteInfo = invitation.invitation;
  const isPending = signupMutation.isPending || loginMutation.isPending || acceptInviteMutation.isPending;

  // If user is already authenticated, check for email mismatch
  if (isAuthenticated && user) {
    const userEmail = (user as any)?.email;
    const invitationEmail = invitation?.success ? invitation.invitation.email : '';
    const emailMismatch = userEmail && invitationEmail && userEmail.toLowerCase() !== invitationEmail.toLowerCase();

    if (emailMismatch) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D0D0D' }}>
          <Card className="w-full max-w-md bg-gray-900/60 border-gray-800/30">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={logoImage} alt="VoiceBot Logo" className="h-16 w-16 object-cover" />
              </div>
              <CardTitle className="text-yellow-400">Email Mismatch</CardTitle>
              <CardDescription className="text-gray-300 space-y-3 pt-3">
                <p>
                  This invitation was sent to <span className="text-blue-400 font-medium">{invitationEmail}</span>
                </p>
                <p>
                  You're currently logged in as <span className="text-blue-400 font-medium">{userEmail}</span>
                </p>
                <p className="text-sm text-gray-400 pt-2">
                  To accept this invitation, please log out and sign in with the email address {invitationEmail}
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    // Redirect to the accept-invite page (which will show login/signup forms)
                    window.location.href = `/accept-invite?token=${token}`;
                  } catch (error) {
                    console.error('Logout failed:', error);
                    toast({
                      title: "Error",
                      description: "Failed to logout. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Logout and Sign In
              </Button>
              <Button
                onClick={() => setLocation('/dashboard')}
                variant="outline"
                className="w-full border-gray-800 text-gray-300 hover:bg-gray-800"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D0D0D' }}>
        <Card className="w-full max-w-md bg-gray-900/60 border-gray-800/30">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoImage} alt="VoiceBot Logo" className="h-16 w-16 object-cover" />
            </div>
            <CardTitle className="text-white">Already Logged In</CardTitle>
            <CardDescription className="text-gray-400">
              You're already signed in. The invitation is being processed automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D0D0D' }}>
      <Card className="w-full max-w-2xl bg-gray-900/60 border border-gray-800/30 shadow-2xl rounded-3xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="VoiceBot Logo" className="h-16 w-16 object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            VoiceBot
          </h1>
          <CardTitle className="text-2xl text-white">You're Invited!</CardTitle>
          <CardDescription className="text-gray-400 space-y-2 pt-2">
            <p>
              <span className="text-blue-400 font-medium">{inviteInfo.inviterName || inviteInfo.inviterEmail}</span> has invited you to join{' '}
              <span className="text-blue-400 font-medium">{inviteInfo.businessName}</span>
            </p>
            <p className="text-sm">
              Role: <span className="text-blue-400 font-medium capitalize">{inviteInfo.role}</span>
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-800/60 rounded-lg">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="button-mode-signup"
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              Sign Up
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="button-mode-login"
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              Log In
            </button>
          </div>

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border-gray-800 text-gray-300"
                  disabled
                  data-testid="input-signup-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-transparent border-gray-800 text-gray-300"
                  data-testid="input-signup-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-transparent border-gray-800 text-gray-300"
                  data-testid="input-signup-lastname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-gray-800 text-gray-300"
                  data-testid="input-signup-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                disabled={isPending}
                data-testid="button-signup-submit"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Accept'
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                </div>
              </div>

              {/* Google Auth Button */}
              <Button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isPending}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isPending ? 'Signing up...' : 'Sign up with Google'}
              </Button>
            </form>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent border-gray-800 text-gray-300"
                  data-testid="input-login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-gray-800 text-gray-300"
                  data-testid="input-login-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                disabled={isPending}
                data-testid="button-login-submit"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Logging In...
                  </>
                ) : (
                  'Log In & Accept'
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                </div>
              </div>

              {/* Google Auth Button */}
              <Button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isPending}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isPending ? 'Logging in...' : 'Log in with Google'}
              </Button>
            </form>
          )}

          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-gray-500 text-sm">
              This invitation expires on {inviteInfo.expiresAt ? new Date(inviteInfo.expiresAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
