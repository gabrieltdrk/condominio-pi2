import { useState, useMemo } from "react";

type PaginationResult<T> = {
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  pageItems: T[];
  totalPages: number;
  total: number;
};

/**
 * Hook genérico de paginação em memória.
 * Elimina o padrão `page/pageSize/paginated` repetido em Financeiro, Garagem, Avisos, Usuários etc.
 *
 * @example
 * const { pageItems, page, setPage, totalPages } = usePagination(sortedUsers, 10);
 */
export function usePagination<T>(items: T[], defaultPageSize = 10): PaginationResult<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  function setPage(p: number) {
    setPageRaw(Math.max(1, Math.min(p, totalPages)));
  }

  function setPageSize(s: number) {
    setPageSizeRaw(s);
    setPageRaw(1);
  }

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageItems,
    totalPages,
    total: items.length,
  };
}
