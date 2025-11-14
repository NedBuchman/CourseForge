import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => ReactNode;
}

interface DataTableSimpleProps {
  title?: string;
  columns: Column[];
  data: any[];
  maxRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
}

export default function DataTableSimple({
  title,
  columns,
  data,
  maxRows,
  emptyMessage = 'No data available',
  onRowClick
}: DataTableSimpleProps) {
  const displayData = maxRows ? data.slice(0, maxRows) : data;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
      )}

      {displayData.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-6 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-${column.align || 'left'}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
                >
                  {columns.map((column, colIndex) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;

                    return (
                      <td
                        key={colIndex}
                        className={`px-6 py-4 text-sm text-slate-900 text-${column.align || 'left'}`}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {maxRows && data.length > maxRows && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600">
            Showing {maxRows} of {data.length} rows
          </p>
        </div>
      )}
    </div>
  );
}
