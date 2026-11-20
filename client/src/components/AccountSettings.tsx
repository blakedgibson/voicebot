import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Mail, Lock, CreditCard, Phone, Bot } from "lucide-react";

interface AccountSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function AccountSettings({ open, onClose }: AccountSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  
  // Debug logging
  console.log('AccountSettings render:', { open, user });
  
  // Form states
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // General prompt state for agent behavior
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [originalGeneralPrompt, setOriginalGeneralPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  const handleEmailVerification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setEmailVerificationSent(true);
        toast({
          title: "Verification Email Sent",
          description: "Please check your email for the verification link.",
        });
      } else {
        throw new Error('Failed to send verification email');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async () => {
    if (!emailForm.newEmail || !emailForm.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: emailForm.newEmail,
          password: emailForm.password
        })
      });

      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Email Updated",
          description: "Your email address has been successfully updated.",
        });
        setEmailForm({ newEmail: '', password: '' });
      } else {
        throw new Error(result.message || 'Failed to update email');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(result.message || 'Failed to update password');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingPortal = () => {
    // Redirect to Stripe billing portal
    window.open('/api/billing/portal', '_blank');
  };

  const handleTwilioBilling = () => {
    // Redirect to Twilio console
    window.open('https://console.twilio.com/us1/billing', '_blank');
  };

  // Fetch general prompt when modal opens
  useEffect(() => {
    if (open) {
      fetchGeneralPrompt();
    }
  }, [open]);

  const fetchGeneralPrompt = async () => {
    setIsLoadingPrompt(true);
    try {
      const response = await fetch('/api/agent/general-prompt', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setGeneralPrompt(data.generalPrompt);
        setOriginalGeneralPrompt(data.generalPrompt);
      } else if (response.status === 404) {
        // No agent found yet - that's okay
        setGeneralPrompt('');
        setOriginalGeneralPrompt('');
      } else {
        throw new Error('Failed to fetch general prompt');
      }
    } catch (error: any) {
      console.error("Error fetching general prompt:", error);
      // Don't show error toast for 404s or initial load failures
      if (error.message !== 'Failed to fetch general prompt') {
        toast({
          title: "Error",
          description: "Failed to load agent prompt. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleGeneralPromptSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agent/general-prompt', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          generalPrompt
        })
      });

      const result = await response.json();
      if (response.ok) {
        setOriginalGeneralPrompt(generalPrompt); // Update original to match saved
        toast({
          title: "Agent Prompt Updated",
          description: "Your agent's general prompt has been successfully updated.",
        });
      } else {
        throw new Error(result.message || 'Failed to update general prompt');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update general prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = generalPrompt !== originalGeneralPrompt;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Account Settings</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="email" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">Email & Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="telephony">Telephony</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-6">
            {/* Email Verification Section */}
            <div className="flex items-center space-x-2 text-sm font-medium">
              <Mail className="w-4 h-4" />
              <span>Email Verification</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{(user as any)?.email}</p>
                <p className="text-xs text-gray-500">
                  {(user as any)?.emailVerified ?
                    "Your email is verified" :
                    "Your email is not verified"
                  }
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={(user as any)?.emailVerified ? "default" : "destructive"}>
                  {(user as any)?.emailVerified ? "Verified" : "Unverified"}
                </Badge>
                {!(user as any)?.emailVerified && (
                  <Button
                    size="sm"
                    onClick={handleEmailVerification}
                    disabled={isLoading || emailVerificationSent}
                    data-testid="button-verify-email"
                  >
                    {emailVerificationSent ? "Sent" : "Verify Email"}
                  </Button>
                )}
              </div>
            </div>

            {/* Change Email Section */}
            <div className="flex items-center space-x-2 text-sm font-medium">
              <Mail className="w-4 h-4" />
              <span>Change Email</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                placeholder="Enter new email address"
                data-testid="input-new-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-password">Current Password</Label>
              <Input
                id="email-password"
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm({...emailForm, password: e.target.value})}
                placeholder="Enter your current password"
                data-testid="input-email-password"
              />
            </div>
            <Button
              onClick={handleEmailChange}
              disabled={isLoading}
              data-testid="button-change-email"
            >
              {isLoading ? "Updating..." : "Update Email"}
            </Button>

            {/* Change Password Section */}
            <div className="flex items-center space-x-2 text-sm font-medium">
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                placeholder="Enter your current password"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                placeholder="Enter new password (min. 8 characters)"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={isLoading}
              data-testid="button-change-password"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            {/* Subscription Management */}
            <div className="flex items-center space-x-2 text-sm font-medium">
              <CreditCard className="w-4 h-4" />
              <span>Subscription Management</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Current Plan: Professional</p>
                <p className="text-xs text-gray-500">
                  Manage your subscription, billing information, and payment methods
                </p>
              </div>
              <Button
                onClick={handleBillingPortal}
                variant="outline"
                data-testid="button-billing-portal"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Billing
              </Button>
            </div>
            <div className="border-t my-4"></div>
            <div className="text-xs text-gray-500">
              <p>• Update payment methods</p>
              <p>• View billing history</p>
              <p>• Download invoices</p>
              <p>• Cancel or modify your subscription</p>
            </div>
          </TabsContent>

          <TabsContent value="telephony" className="space-y-6">
            {/* Twilio Billing */}
            <div className="flex items-center space-x-2 text-sm font-medium">
              <Phone className="w-4 h-4" />
              <span>Telephony Billing</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Twilio Phone Services</p>
                <p className="text-xs text-gray-500">
                  Manage your phone number charges and call costs
                </p>
              </div>
              <Button
                onClick={handleTwilioBilling}
                variant="outline"
                data-testid="button-twilio-billing"
              >
                <Phone className="w-4 h-4 mr-2" />
                View Twilio Billing
              </Button>
            </div>
            <div className="border-t my-4"></div>
            <div className="text-xs text-gray-500">
              <p>• Phone number monthly fees ($1-$5/month)</p>
              <p>• Incoming call charges ($0.0085/minute)</p>
              <p>• Recording costs ($0.0025/minute)</p>
              <p>• Speech-to-text processing fees</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Twilio charges are separate from your VoiceBot subscription and are billed directly by Twilio based on actual usage.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6">
            {/* Agent General Prompt Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Bot className="w-4 h-4" />
                  <span>Agent General Prompt</span>
                </div>

                {isLoadingPrompt ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading agent prompt...</div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="general-prompt">General Prompt</Label>
                      <Textarea
                        id="general-prompt"
                        value={generalPrompt}
                        onChange={(e) => setGeneralPrompt(e.target.value)}
                        placeholder="Enter your agent's general prompt that will guide its behavior during calls..."
                        className="min-h-[300px] resize-y font-mono text-sm"
                        data-testid="textarea-general-prompt"
                      />
                      <p className="text-xs text-gray-500">
                        This prompt instructs your AI agent on how to behave, what information to provide, and how to handle customer interactions.
                      </p>
                    </div>

                    {hasUnsavedChanges && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md p-3">
                        <p className="text-sm text-amber-800">
                          You have unsaved changes
                        </p>
                        <Button
                          onClick={handleGeneralPromptSave}
                          disabled={isLoading}
                          data-testid="button-save-general-prompt"
                          size="sm"
                        >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-close-settings">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}