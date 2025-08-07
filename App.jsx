import { useState } from 'react'
import FileUpload from './components/FileUpload'
import DataTable from './components/DataTable'
import './App.css'

function App() {
  const [fileInfo, setFileInfo] = useState(null)

  const handleUploadSuccess = (uploadResult) => {
    setFileInfo({
      file_id: uploadResult.file_id,
      filename: uploadResult.filename || '未知檔案',
      total_rows: uploadResult.total_rows,
      columns: uploadResult.columns
    })
  }

  const handleBack = () => {
    setFileInfo(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            XLSX 檔案查詢系統
          </h1>
          <p className="text-gray-600">
            上傳 Excel 檔案，快速查詢和分析資料
          </p>
        </div>

        {!fileInfo ? (
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        ) : (
          <DataTable fileInfo={fileInfo} onBack={handleBack} />
        )}
      </div>
    </div>
  )
}

export default App
