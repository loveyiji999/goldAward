import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DataTable = ({ fileInfo, onBack }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 20;

  const fetchData = async (page = 1, search = '') => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileInfo.file_id,
          filters: {
            text_search: search,
          },
          page: page,
          page_size: pageSize,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTotalPages(result.total_pages);
        setTotalRows(result.total);
        setCurrentPage(page);
      } else {
        setError(result.message || '查詢失敗');
      }
    } catch (err) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fileInfo) {
      fetchData(1, searchText);
    }
  }, [fileInfo]);

  const handleSearch = () => {
    fetchData(1, searchText);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchData(newPage, searchText);
    }
  };

  const handleExport = async (format = 'xlsx') => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileInfo.file_id,
          filters: {
            text_search: searchText,
          },
          format: format,
          columns: fileInfo.columns,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 開啟下載連結
        window.open(result.download_url, '_blank');
      } else {
        setError(result.message || '匯出失敗');
      }
    } catch (err) {
      setError('匯出失敗，請稍後再試');
    }
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  };

  if (!fileInfo) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      {/* 檔案資訊 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {fileInfo.filename}
              </CardTitle>
              <CardDescription>
                總共 {fileInfo.total_rows} 行資料，{fileInfo.columns.length} 個欄位
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onBack}>
              返回上傳
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 查詢控制 */}
      <Card>
        <CardHeader>
          <CardTitle>資料查詢</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">搜尋內容</label>
              <Input
                placeholder="輸入關鍵字搜尋..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              搜尋
            </Button>
            <Button variant="outline" onClick={() => handleExport('xlsx')}>
              <Download className="h-4 w-4 mr-2" />
              匯出 Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              匯出 CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 資料表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>資料內容</CardTitle>
            <Badge variant="secondary">
              顯示 {data.length} / {totalRows} 筆資料
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">載入中...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fileInfo.columns.map((column, index) => (
                        <TableHead key={index} className="whitespace-nowrap">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {fileInfo.columns.map((column, colIndex) => (
                          <TableCell key={colIndex} className="max-w-xs truncate">
                            {formatCellValue(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    第 {currentPage} 頁，共 {totalPages} 頁
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      下一頁
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataTable;

