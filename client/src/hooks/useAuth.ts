import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    throwOnError: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasActiveSubscription: (user as any)?.hasActiveSubscription || false,
    isSubscribed: (user as any)?.isSubscribed || false,
    shouldRedirectToDashboard: (user as any)?.shouldRedirectToDashboard || false,
    authError: error,
  };
}
