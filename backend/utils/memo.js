// A tiny in-process cache for numbers that are the same for every visitor (site stats,
// category counts, the assistant's list of open openings). One server process, so
// there is nothing to share; a second instance just computes its own copy.
const store = new Map(); // key -> { at, value } | { promise }

// Off under the test runner so tests see their own writes; tests of the cache itself set
// MEMO_IN_TESTS=1.
const enabled = () => process.env.NODE_ENV !== "test" || process.env.MEMO_IN_TESTS === "1";

/** Returns fn()'s result, reusing it for ttlMs. Concurrent callers share one in-flight call. */
export async function memo(key, ttlMs, fn) {
  if (!enabled()) return fn();
  const hit = store.get(key);
  if (hit?.promise) return hit.promise;
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  const promise = fn().then(
    (value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    },
    (err) => {
      store.delete(key); // never cache a failure
      throw err;
    }
  );
  store.set(key, { promise });
  return promise;
}

/** Drops every cached entry whose key starts with `prefix` (all of them with no argument). */
export function invalidateMemo(prefix = "") {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
