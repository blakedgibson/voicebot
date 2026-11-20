/**
 * React hook to fetch and cache the user's classified industry
 * Used to display industry-specific call types and analytics
 */

import { useQuery } from '@tanstack/react-query';
import type { Industry } from '@shared/industryConfig';

interface UserIndustryResponse {
  industry: Industry;
}

interface UseUserIndustryOptions {
  enabled?: boolean;
}

export function useUserIndustry(options?: UseUserIndustryOptions) {
  return useQuery<UserIndustryResponse>({
    queryKey: ['/api/user/industry'],
    queryFn: async () => {
      const response = await fetch('/api/user/industry', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user industry');
      }

      return response.json();
    },
    enabled: options?.enabled !== false, // Default to true if not specified
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
