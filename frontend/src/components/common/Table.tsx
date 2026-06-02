import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from './UI';

export interface Column<T> {
  key: string; header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}
interface TableProps<T> {
  columns: Column<T>[]; data: T[]; keyExtractor: (row: T) => string;
  loading?: boolean; emptyMessage?: string; onRowClick?: (row: T) => void;
}
export function Table<T>({ columns, data, keyExtractor, loading = false, emptyMessage = 'No records found.', onRowClick }: TableProps<T>) {
  if (loading) return <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>;
  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-slate-800">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700/50">
        <thead className="bg-white dark:bg-slate-800">
          <tr>
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${col.className||''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700/50">
          {data.length === 0
            ? <tr><td colSpan={columns.length} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</td></tr>
            : data.map(row => (
              <tr key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors duration-200' : 'hover:bg-slate-50/40 dark:hover:bg-slate-700/20 transition-colors duration-200'}>
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap ${col.className||''}`}>
                    {col.render
                      ? col.render((row as Record<string,unknown>)[col.key], row)
                      : String((row as Record<string,unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps { page: number; pages: number; total: number; limit: number; onChange: (page: number) => void }
export const Pagination: React.FC<PaginationProps> = ({ page, pages, total, limit, onChange }) => {
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">Showing <span className="font-medium">{from}–{to}</span> of <span className="font-medium">{total}</span></p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page-1)} disabled={page<=1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        {Array.from({ length: Math.min(pages,5) }, (_,i)=>i+1).map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200
              ${p===page ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page+1)} disabled={page>=pages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
};
