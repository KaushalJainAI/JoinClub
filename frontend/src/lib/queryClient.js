import { QueryClient } from "@tanstack/react-query";

// One cache for every GET the pages make (see hooks/useFetch.js).
//
// - staleTime: going Home -> Clubs -> Home shows the cached page at once instead of
//   refetching, and two components asking for the same URL share one request.
// - no retries and no refetch on window focus: errors show straight away, and the app
//   never changes data behind the reader's back.
// Anything a student or admin changes goes through api.js, which drops the whole cache
// after a successful write, so a cached list is never shown after it has been edited.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
  },
});
