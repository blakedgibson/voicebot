import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useInvitationHandler(isAuthenticated: boolean) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleInvitation = async () => {
      if (!isAuthenticated) return;

      // Check if there's an invitation token in sessionStorage
      const inviteToken = sessionStorage.getItem('inviteToken');
      if (!inviteToken) return;

      try {
        // Accept the invitation
        const response = await apiRequest('POST', '/api/team/accept-invite', {
          token: inviteToken
        });

        const data = await response.json();

        if (data.success) {
          // Clear the token from storage
          sessionStorage.removeItem('inviteToken');

          // Store the owner ID to view their dashboard
          if (data.ownerId) {
            localStorage.setItem('viewingOwnerId', data.ownerId);
          }

          toast({
            title: "Welcome to the team!",
            description: `You've successfully joined ${data.businessName || 'the team'} as a ${data.role}.`,
          });

          // Redirect to the owner's dashboard
          setLocation('/dashboard');

          // Force a page reload to load the owner's data
          window.location.href = '/dashboard';
        } else {
          toast({
            title: "Couldn't accept invitation",
            description: data.message || "An error occurred while accepting the invitation",
            variant: "destructive"
          });

          // Clear invalid token
          sessionStorage.removeItem('inviteToken');
        }
      } catch (error: any) {
        console.error('Error accepting invitation:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to accept invitation",
          variant: "destructive"
        });

        // Clear token on error
        sessionStorage.removeItem('inviteToken');
      }
    };

    handleInvitation();
  }, [isAuthenticated, toast, setLocation]);
}
