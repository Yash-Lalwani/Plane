"use client";

import { useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api";

const PROTECTED_PREFIXES = ["/projects", "/settings"];

// A 401 after the automatic refresh means the session is over. On signed-in pages, send the
// user to login and bring them back afterwards. Public pages handle 401 themselves.
function handleSessionExpired(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  const { pathname, search } = window.location;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
  // A full page load (not client navigation) so no data from the ended session survives.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?returnTo=${encodeURIComponent(pathname + search)}`);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleSessionExpired }),
        mutationCache: new MutationCache({ onError: handleSessionExpired }),
        defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster theme="light" richColors />
    </QueryClientProvider>
  );
}
