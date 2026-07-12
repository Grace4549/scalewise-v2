import { ReactNode, useState } from "react";
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

  const currentId = user?.id ?? null;

  // `isolatedForId` tracks the user ID whose cache state we last isolated.
  // undefined = initial mount (no prior user observed yet).
  const [isolatedForId, setIsolatedForId] = useState<number | null | undefined>(undefined);

  // Synchronous render-phase identity guard.
  //
  // Clear the query cache on ANY identity boundary change after the initial
  // mount observation.  This covers every transition that can leak private
  // data across user sessions:
  //   • A → B  (direct switch between two authenticated users)
  //   • A → null  (logout: discard A's private data immediately)
  //   • null → B  (login after logout: discard any cache from the prior session)
  //
  // Doing this during render rather than in a useEffect means children never
  // receive a committed render where the auth context reflects the new identity
  // but the query cache still holds the previous identity's private data.
  //
  // Calling setState during render causes React to discard the current render
  // output and immediately re-render with the updated state.  On that
  // re-render, isolatedForId === currentId so the guard does not fire again and
  // children render normally — but now with a clean cache.
  if (isolatedForId !== currentId) {
    const prevId = isolatedForId;
    // Update tracking first so the next render sees the new ID and skips this
    // branch, preventing an infinite re-render loop.
    setIsolatedForId(currentId);

    // Skip only on initial mount (prevId === undefined) since there is no prior
    // session to clear.  Every subsequent identity change — including logout and
    // login-after-logout — gets a full cache flush.
    if (prevId !== undefined) {
      const meData = queryClient.getQueryData(getGetMeQueryKey());
      queryClient.clear();
      // Restore /me so the re-render's useGetMe call finds the current user
      // immediately without waiting for a network round-trip.
      queryClient.setQueryData(getGetMeQueryKey(), meData);
    }
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}
