import { useState, useEffect, useCallback, type DependencyList } from "react";

type AsyncDataState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => void;
};

/**
 * Hook genérico para busca de dados assíncrona.
 * Elimina o padrão loading/error/data repetido em todas as pages.
 *
 * @example
 * const { data: users, loading, error, refetch } = useAsyncData(listUsers, []);
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList,
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchFn()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro inesperado.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch };
}
