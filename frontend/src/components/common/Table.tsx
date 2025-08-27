import React from 'react';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

/**
 * @param columns 
 * @param data 
 * @param keyExtractor 
 * @param onRowClick 
 * @param emptyMessage 
 * @param loading 
 * @param striped 
 * @param hoverable 
 * @param compact 
 */
function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  striped = true,
  hoverable = true,
  compact = false,
}: TableProps<T>) {
  const getCellValue = (item: T, column: TableColumn<T>) => {
    if (column.render) {
      return column.render(item);
    }
    
    // Handle nested keys like 'user.name'
    const keys = String(column.key).split('.');
    let value: any = item;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {/* Table Header */}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`
                  text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${compact ? 'px-4 py-2' : 'px-6 py-3'}
                  ${column.width || ''}
                `}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={`
                  ${striped && index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                  ${hoverable ? 'hover:bg-gray-100' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                  transition-colors duration-150
                `}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`
                      text-sm text-gray-900
                      ${compact ? 'px-4 py-2' : 'px-6 py-4'}
                    `}
                  >
                    {getCellValue(item, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;