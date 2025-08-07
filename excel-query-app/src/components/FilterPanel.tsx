// src/components/FilterPanel.tsx
import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';

interface FilterPanelProps {
  fileId: string;
  onFilterChange: (filters: Record<string, string>) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ fileId, onFilterChange }) => {
  const [fields, setFields] = useState<string[]>([]);
  const [options, setOptions] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!fileId) return;
    fetch(`/api/fields?file_id=${fileId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFields(data.fields);
          setOptions(data.options);
        } else {
          console.error('取得欄位失敗', data.message);
        }
      })
      .catch(err => console.error('Fetch /fields 錯誤', err));
  }, [fileId]);

  const handleChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="filter-panel p-4 border rounded mb-4">
      {/* 操作引導 */}
      <p className="text-sm text-gray-600 mb-3">
        步驟：先選欄位，再輸入關鍵字，或從下拉列表選擇。
      </p>
      {fields.map(field => (
        <div key={field} className="mb-3">
          <label className="flex items-center text-sm font-medium mb-1">
            {field}
            <Info
              className="ml-1 w-4 h-4 text-gray-400 cursor-pointer"
              title={`請輸入 ${field} 或在下拉中選擇`}
            />
          </label>
          <input
            type="text"
            list={`opts-${field}`}
            value={filters[field] || ''}
            onChange={e => handleChange(field, e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder={`請輸入${field}（可從下拉選擇）`}
          />
          <datalist id={`opts-${field}`}>
            {options[field]?.map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
      ))}
    </div>
  );
};

export default FilterPanel;
