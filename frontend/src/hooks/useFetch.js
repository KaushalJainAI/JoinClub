import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";

// GET `url` (re-fetched when url changes). Pass null to skip.
export function useFetch(url, { initial = null } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      if (id === latest.current) setData(res.data);
    } catch (err) {
      if (id === latest.current) setError(errorMessage(err));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
