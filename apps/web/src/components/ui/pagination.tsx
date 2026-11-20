import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  pageSizeOptions?: number[];
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  setPage,
  setPageSize,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2 flex-wrap">
      <span className="text-sm text-gray-500">
        {from}-{to} de {total}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span>Itens por página:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-indigo-400 cursor-pointer"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm text-gray-600 px-1">{page}/{totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
