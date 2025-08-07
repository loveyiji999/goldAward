// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import FilterPanel from './components/FilterPanel';
import DataTable from './components/DataTable';

// 定義後端回傳型別
interface UploadResponse {
  success: boolean;
  message?: string;
  file_id?: string;
}
interface QueryResponse {
  success: boolean;
  data: Record<string, unknown>[];
  total_pages: number;
}

// 泛用的 fetchJson helper
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 使用泛型 helper 上傳檔案
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const form = new FormData();
    form.append('file', e.target.files[0]);
    setLoading(true);
    setError(null);
    try {
      const json = await fetchJson<UploadResponse>('/api/upload', {
        method: 'POST',
        body: form,
      });
      if (json.success && json.file_id) {
        setFileId(json.file_id);
        setFilters({});
        setPage(1);
      } else {
        throw new Error(json.message || '上傳失敗');
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 查詢 API 也用同個 helper
  useEffect(() => {
    if (!fileId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const body = {
          file_id: fileId,
          filters,
          page,
          page_size: pageSize,
          sort_by: sortBy,
          sort_order: sortOrder,
        };
        const json = await fetchJson<QueryResponse>('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (json.success) {
          setData(json.data);
          setTotalPages(json.total_pages);
        } else {
          throw new Error('查詢失敗');
        }
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, filters, page, pageSize, sortBy, sortOrder]);

  return (
    <div className="app-container p-6 relative">
      <h1 className="text-2xl font-bold mb-4">Excel 查詢工具</h1>

      {/* 上傳 */}
      <div className="mb-6">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleUpload}
          className="border rounded px-3 py-1"
        />
      </div>

      {/* 顯示錯誤訊息 */}
      {error && <div className="text-red-600 mb-4">錯誤：{error}</div>}

      {/* 載入中遮罩 */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full"></div>
        </div>
      )}

      {/* 篩選 & 資料 */}
      {fileId && (
        <>
          <FilterPanel
            fileId={fileId}
            onFilterChange={(newFilters) => {
              setFilters(newFilters);
              setPage(1);
            }}
          />
          <DataTable
            data={data}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSort={(col, order) => {
              setSortBy(col);
              setSortOrder(order);
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;
