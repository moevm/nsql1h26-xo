import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface ServerPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: ServerPagination;
}

function buildPageList(currentPage: number, totalPages: number) {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'Нет данных',
  onRowClick,
  pagination,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [localPage, setLocalPage] = useState(1);
  const localPageSize = 10;
  const isServerPaginated = Boolean(pagination);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (isServerPaginated || !sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, isServerPaginated, sortKey, sortOrder]);

  const page = pagination?.page ?? localPage;
  const pageSize = pagination?.pageSize ?? localPageSize;
  const total = pagination?.total ?? sortedData.length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(sortedData.length / localPageSize));
  const visibleData = isServerPaginated
    ? sortedData
    : sortedData.slice((localPage - 1) * localPageSize, localPage * localPageSize);

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    if (pagination) pagination.onPageChange(safePage);
    else setLocalPage(safePage);
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const pageList = buildPageList(page, totalPages);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 hover:text-gray-700"
                      title={isServerPaginated ? 'Сортировка применяется к текущей странице' : undefined}
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleData.map((row, index) => (
              <tr
                key={(row.id as string | undefined) ?? index}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {total > 0 ? (
              <>Показано {startIndex}-{endIndex} из {total}</>
            ) : (
              <>Нет записей</>
            )}
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 flex-wrap">
              {pageList.map((item, index) => {
                const previous = pageList[index - 1];
                return (
                  <span key={item} className="flex items-center gap-1">
                    {previous && item - previous > 1 && <span className="px-1 text-gray-400">…</span>}
                    <button
                      type="button"
                      onClick={() => goToPage(item)}
                      className={`px-3 py-1 rounded-lg ${
                        page === item
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-white'
                      }`}
                    >
                      {item}
                    </button>
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
