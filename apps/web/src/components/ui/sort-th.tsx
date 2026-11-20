import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type SortDir = "asc" | "desc";

type SortIconProps = {
  col: string;
  sortKey: string;
  sortDir: SortDir;
};

export function SortIcon({ col, sortKey, sortDir }: SortIconProps) {
  if (sortKey !== col) return <ArrowUpDown size={12} className="opacity-30 shrink-0" />;
  return sortDir === "asc"
    ? <ArrowUp size={12} className="text-indigo-600 shrink-0" />
    : <ArrowDown size={12} className="text-indigo-600 shrink-0" />;
}

type SortThProps<T extends string = string> = {
  col: T;
  label: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (col: T) => void;
};

export function SortTh<T extends string = string>({ col, label, sortKey, sortDir, onSort }: SortThProps<T>) {
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-3 border-b border-gray-100 cursor-pointer select-none whitespace-nowrap text-left text-xs font-semibold tracking-wider text-gray-500 uppercase hover:text-indigo-600 transition-colors"
    >
      <span className="flex items-center gap-1">
        {label} <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}
