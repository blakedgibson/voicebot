import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface InvitationSignupModalProps {
  open: boolean;
  inviteToken: string;
  onSwitchToLogin?: () => void;
}

export function InvitationSignupModal({ open, inviteToken, onSwitchToLogin }: InvitationSignupModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim() || undefined,
          email: formData.email.trim(),
          password: formData.password
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create account');
      }

      if (result.success) {
        toast({
          title: "Account Created!",
          description: "Accepting invitation...",
        });

        // Wait a bit for session to establish
        await new Promise(resolve => setTimeout(resolve, 500));

        // Accept the invitation
        const inviteResponse = await fetch('/api/team/accept-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: inviteToken }),
          credentials: 'include'
        });

        const inviteData = await inviteResponse.json();

        if (inviteData.success) {
          // Clear tokens
          sessionStorage.removeItem('inviteToken');
          sessionStorage.removeItem('showSignupModal');

          // Store owner ID to view their dashboard
          if (inviteData.ownerId) {
            localStorage.setItem('viewingOwnerId', inviteData.ownerId);
          }

          toast({
            title: "Welcome to the team!",
            description: `You've successfully joined ${inviteData.businessName || 'the team'}.`,
          });

          // Reload to show owner's dashboard
          window.location.reload();
        } else {
          throw new Error(inviteData.message || 'Failed to accept invitation');
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Redirect to Google OAuth with invitation token
    window.location.href = `/api/auth/google?signup=true&inviteToken=${inviteToken}`;
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* Can't close */}}>
      <DialogContent
        className="bg-gray-900/80 border-gray-700 text-white max-w-md backdrop-blur-lg [&>button]:hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <Card className="bg-transparent border-0">
          <CardHeader className="text-center pb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-user-plus text-black text-2xl"></i>
            </div>
            <CardTitle className="text-3xl font-display font-bold text-white mb-2">
              Create Account to Continue
            </CardTitle>
            <p className="text-gray-400">
              Complete your account to accept the team invitation
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="modal-email" className="text-gray-300 font-medium">
              Email Address
            </Label>
            <Input
              id="modal-email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="modal-password" className="text-gray-300 font-medium">
              Password
            </Label>
            <Input
              id="modal-password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <Label htmlFor="modal-confirm-password" className="text-gray-300 font-medium">
              Confirm Password
            </Label>
            <Input
              id="modal-confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Sign Up Button */}
          <Button
            onClick={handleSignup}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creating Account...
              </span>
            ) : (
              'Create Account & Join'
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
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-800 font-medium py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            <i className="fab fa-google mr-3"></i>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          {/* Sign In Link */}
          <div className="text-center pt-4">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <button
                onClick={() => {
                  if (onSwitchToLogin) {
                    onSwitchToLogin();
                  }
                }}
                className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer bg-transparent border-none"
                type="button"
              >
                Sign in here
              </button>
            </p>
          </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
