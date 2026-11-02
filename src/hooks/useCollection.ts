"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listDocs, type QueryOptions } from "@/lib/data/store";
import { describeError } from "@/lib/utils/cn";
import type { CollectionName } from "@/types";

export interface UseCollectionOptions extends QueryOptions {
  /** Disable the query (e.g. while a dependent filter is not chosen yet). */
  enabled?: boolean;
}

export interface UseCollectionResult<T> {
  rows: T[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Paginated collection loader.
 *
 * Deliberately *not* a real-time listener: dashboards fetch a bounded page on
 * mount and on explicit reload, which keeps Firestore reads predictable on the
 * Spark plan.
 */
export function useCollection<T>(name: CollectionName, options: UseCollectionOptions = {}): UseCollectionResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);

  // Stable serialisation so object-identity changes in `options` don't refetch.
  const signature = JSON.stringify({ name, ...options, nonce });

  useEffect(() => {
    if (options.enabled === false) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    let active = true;
    setLoading(true);
    setError(null);

    const { enabled: _enabled, ...query } = options;
    listDocs<T>(name, query)
      .then((result) => {
        if (!active || id !== requestId.current) return;
        setRows(result.rows);
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .catch((cause: unknown) => {
        if (!active || id !== requestId.current) return;
        setRows([]);
        setTotal(0);
        setError(describeError(cause));
      })
      .finally(() => {
        if (active && id === requestId.current) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { rows, total, hasMore, loading, error, reload };
}

export function useDocument<T>(name: CollectionName, id: string | null) {
  const [doc, setDoc] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!id) {
      setDoc(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    import("@/lib/data/store")
      .then(({ getDocById }) => getDocById<T>(name, id))
      .then((found) => {
        if (active) setDoc(found);
      })
      .catch((cause: unknown) => {
        if (active) setError(describeError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [name, id, nonce]);

  return { doc, loading, error, reload: () => setNonce((value) => value + 1), setDoc };
}
