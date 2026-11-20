import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to determine which user ID to use for dashboard data.
 * If viewing as a team member, returns the owner's ID.
 * Otherwise, returns the current user's ID.
 */
export function useActiveUserId() {
  const { user } = useAuth();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isViewingAsTeamMember, setIsViewingAsTeamMember] = useState(false);

  useEffect(() => {
    // Check if viewing someone else's dashboard as a team member
    const viewingOwnerId = localStorage.getItem('viewingOwnerId');

    if (viewingOwnerId && user?.id !== viewingOwnerId) {
      // Viewing as team member
      setActiveUserId(viewingOwnerId);
      setIsViewingAsTeamMember(true);
    } else {
      // Viewing own dashboard
      setActiveUserId(user?.id || null);
      setIsViewingAsTeamMember(false);

      // Clean up if there's a stored ownerId but it's the same as current user
      if (viewingOwnerId && user?.id === viewingOwnerId) {
        localStorage.removeItem('viewingOwnerId');
      }
    }
  }, [user?.id]);

  const switchToOwnDashboard = () => {
    localStorage.removeItem('viewingOwnerId');
    setActiveUserId(user?.id || null);
    setIsViewingAsTeamMember(false);
    window.location.reload();
  };

  const switchToOwnerDashboard = (ownerId: string) => {
    localStorage.setItem('viewingOwnerId', ownerId);
    setActiveUserId(ownerId);
    setIsViewingAsTeamMember(true);
    window.location.reload();
  };

  return {
    activeUserId,
    isViewingAsTeamMember,
    switchToOwnDashboard,
    switchToOwnerDashboard
  };
}
