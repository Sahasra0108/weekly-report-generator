"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** GET a path and track loading/error state. Refetches when `path` changes. */
export function useQuery<T>(path: string | null): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refetch };
}

interface MutationState<TArgs, TResult> {
  mutate: (args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  reset: () => void;
}

/** Wrap a write operation with loading and error state, including per-field errors. */
export function useMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
): MutationState<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutate = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setLoading(true);
      setError(null);
      setFieldErrors({});
      try {
        return await fn(args);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          setFieldErrors(err.fieldErrors ?? {});
        } else {
          setError("Something went wrong");
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { mutate, loading, error, fieldErrors, reset };
}