import { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

// GET `url` (re-fetched when url changes). Pass null to skip.
//
// Backed by the shared query cache, so the same URL asked for twice makes one request and
// a page you come back to shows at once. The return shape is the one the pages were
// written against:
//   data      the last response (kept while the next URL loads, so lists don't blank out)
//   loading   true until the first response, and while a changed URL loads
//   setData   edit the cached response (a value, or a function of the old one)
//   reload    fetch it again now
export function useFetch(url, { initial = null } = {}) {
  const query = useQuery({
    queryKey: ["get", url],
    queryFn: async ({ signal }) => (await api.get(url, { signal })).data,
    enabled: Boolean(url),
    placeholderData: keepPreviousData,
  });

  const setData = useCallback(
    (next) => queryClient.setQueryData(["get", url], (old) => (typeof next === "function" ? next(old ?? initial) : next)),
    [url, initial]
  );
  const reload = useCallback(() => query.refetch(), [query.refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data: query.data ?? initial,
    setData,
    loading: Boolean(url) && (query.isPending || query.isPlaceholderData),
    error: query.error ? errorMessage(query.error) : null,
    reload,
  };
}

/**
 * A list that grows by "Load more". `url` is the endpoint with any filters already in it;
 * this adds ?page= and &limit=. `itemsKey` names the array in each response
 * ("openings", "applications", …). The server's contract is { <itemsKey>, total, page, pages }.
 *
 * A new url (a changed filter) starts again at page 1.
 *   items        every loaded item, in order
 *   meta         the newest page's response, for the extra fields it carries (total, counts…)
 *   patchItems   edit the loaded items in the cache, for optimistic updates
 */
export function usePaged(url, itemsKey, { pageSize = 20 } = {}) {
  const key = ["paged", url, pageSize];
  const separator = url.includes("?") ? "&" : "?";
  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => (await api.get(`${url}${separator}page=${pageParam}&limit=${pageSize}`, { signal })).data,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

  const pages = query.data?.pages || [];
  const patchItems = useCallback(
    (fn) => queryClient.setQueryData(key, (old) => old && { ...old, pages: old.pages.map((p) => ({ ...p, [itemsKey]: fn(p[itemsKey]) })) }),
    [url, pageSize, itemsKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    items: pages.flatMap((p) => p[itemsKey] || []),
    meta: pages.at(-1) || null,
    first: pages[0] || null,
    total: pages.at(-1)?.total ?? 0,
    loading: query.isPending || query.isPlaceholderData,
    loadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => query.fetchNextPage(),
    error: query.error ? errorMessage(query.error) : null,
    reload: () => query.refetch(),
    patchItems,
  };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
