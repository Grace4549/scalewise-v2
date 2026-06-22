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

    // Once we have observed at least one identity value, check whether it has
    // changed to a *different* authenticated user. When that happens, flush the
    // entire cache so no data belonging to the previous account survives. We
    // re-seed the identity entry immediately so the auth context stays valid.
    if (prevId !== undefined && prevId !== currentId && currentId !== null) {
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
