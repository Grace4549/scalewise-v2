import { ReactNode, useEffect, useRef } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { AuthContext } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      // Re-verify identity whenever the user returns to the tab so stale or
      // expired server sessions are detected promptly.
      refetchOnWindowFocus: true,
    },
  });

  // Track the previously-observed user ID. `undefined` is the "not yet
  // observed" sentinel; `null` means "observed, but no user (logged out)".
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    const currentId = user?.id ?? null;
    const prevId = prevUserIdRef.current;

    // Only clear the cache when switching from one authenticated user to a
    // *different* authenticated user (e.g. user A logs out and user B logs in
    // within the same tab). Logging in from a logged-out state (prevId === null)
    // does NOT need a cache flush — the previous cache only held public data.
    if (prevId !== undefined && prevId !== null && prevId !== currentId && currentId !== null) {
      const meData = queryClient.getQueryData(getGetMeQueryKey());
      queryClient.clear();
      queryClient.setQueryData(getGetMeQueryKey(), meData);
    }

    prevUserIdRef.current = currentId;
  }, [user?.id, queryClient]);

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}
