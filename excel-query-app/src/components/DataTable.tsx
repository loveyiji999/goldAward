// src/components/DataTable.tsx
import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface DataTableProps {
  data: Record<string, unknown>[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (col: string, order: 'asc' | 'desc') => void;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onSort,
}) => {
  const [sortCol, setSortCol] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  if (!data.length) return <p className="text-center py-6">目前沒有資料</p>;

  const headers = Object.keys(data[0]);

  const handleSort = (col: string) => {
    const nextOrder = sortCol === col && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortCol(col);
    setSortOrder(nextOrder);
    onSort(col, nextOrder);
  };

  return (
    <div className="w-full">
      {/* 排序與導航提示 */}
      <p className="text-sm text-gray-600 mb-2">
        提示：點擊欄位標題可排序，使用下方按鈕切換分頁。
      </p>
      {/* 小螢幕左右滑動 */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse whitespace-nowrap">
          <thead>
            <tr>
              {headers.map((h) => {
                const isActive = sortCol === h;
                return (
                  <th
                    key={h}
                    className="border px-2 py-1 cursor-pointer select-none flex items-center"
                    onClick={() => handleSort(h)}
                    title={`點擊此欄位按 ${isActive && sortOrder === 'asc' ? '降冪' : '升冪'}`}
                  >
                    <span>{h}</span>
                    {isActive && (
                      sortOrder === 'asc'
                        ? <ChevronUp className="ml-1 w-4 h-4" title="升冪排序" />
                        : <ChevronDown className="ml-1 w-4 h-4" title="降冪排序" />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-100">
                {headers.map((h) => (
                  <td key={h} className="border px-2 py-1">
                    {row[h] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁控制 */}
      <div className="flex flex-col md:flex-row items-center justify-between mt-4">
        <div className="space-x-2 mb-2 md:mb-0">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
            title="跳到第一頁"
          >第一頁</button>
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
            title="上一頁"
          >上一頁</button>
          <span title="目前頁數">第 {page} / {totalPages} 頁</span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
            title="下一頁"
          >下一頁</button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="px-2 py-1 border rounded disabled:opacity-50"
            title="跳到最末頁"
          >最末頁</button>
        </div>
        <div className="flex items-center">
          <label className="mr-2" title="選擇每頁顯示筆數">每頁顯示：</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border rounded px-2 py-1"
            title="調整每頁顯示筆數"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n} title={`${n} 筆/頁`}>{n}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
