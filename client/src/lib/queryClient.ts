import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Add viewAsUserId parameter if team member is viewing owner's dashboard
  // BUT exclude authentication endpoints - those should always return the actual user's info
  const isAuthEndpoint = url.includes('/api/auth/') || url.includes('/api/user/profile');
  const viewingOwnerId = localStorage.getItem('viewingOwnerId');

  if (viewingOwnerId && !isAuthEndpoint) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}viewAsUserId=${viewingOwnerId}`;
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Helper function to add viewAsUserId parameter to any URL
 * Use this for custom fetch calls in queryFn
 * Excludes authentication endpoints
 */
export function addViewAsUserIdParam(url: string): string {
  const isAuthEndpoint = url.includes('/api/auth/') || url.includes('/api/user/profile');
  const viewingOwnerId = localStorage.getItem('viewingOwnerId');

  if (viewingOwnerId && !isAuthEndpoint) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}viewAsUserId=${viewingOwnerId}`;
  }
  return url;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Ensure all parts of queryKey are strings before joining
    const stringParts = queryKey.map(part => 
      typeof part === 'string' ? part : String(part)
    );
    let url = stringParts.join("/");

    // Add viewAsUserId parameter if team member is viewing owner's dashboard
    // BUT exclude authentication endpoints - those should always return the actual user's info
    const isAuthEndpoint = typeof url === 'string' && (url.includes('/api/auth/') || url.includes('/api/user/profile'));
    const viewingOwnerId = localStorage.getItem('viewingOwnerId');

    if (viewingOwnerId && !isAuthEndpoint) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}viewAsUserId=${viewingOwnerId}`;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
