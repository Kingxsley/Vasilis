import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

/**
 * Reusable Pagination Component with Search and Page Size
 */
export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  className = ''
}) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Items info */}
      <div className="text-sm text-gray-400">
        Showing <span className="font-medium text-white">{startItem}</span> to{' '}
        <span className="font-medium text-white">{endItem}</span> of{' '}
        <span className="font-medium text-white">{total}</span> results
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Show:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="w-20 h-9 bg-[#1a1a24] border-[#2a2a34]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-[#2a2a34]">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-gray-300">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-[#1a1a24] border-[#2a2a34] hover:bg-[#2a2a34]"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrev}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-[#1a1a24] border-[#2a2a34] hover:bg-[#2a2a34]"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm text-gray-400">Page</span>
            <span className="text-sm font-medium text-white">{page}</span>
            <span className="text-sm text-gray-400">of</span>
            <span className="text-sm font-medium text-white">{totalPages || 1}</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-[#1a1a24] border-[#2a2a34] hover:bg-[#2a2a34]"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-[#1a1a24] border-[#2a2a34] hover:bg-[#2a2a34]"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Search Input Component
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  debounceMs = 300
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Debounce the onChange
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10 bg-[#1a1a24] border-[#2a2a34] h-10"
      />
    </div>
  );
}

/**
 * Public-facing Pagination (lighter style for public pages)
 */
export function PublicPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  accentColor = '#D4A836',
  className = ''
}) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-6 ${className}`}>
      {/* Items info */}
      <div className="text-sm text-gray-400">
        Showing <span className="font-medium" style={{ color: accentColor }}>{startItem}</span> - {' '}
        <span className="font-medium" style={{ color: accentColor }}>{endItem}</span> of{' '}
        <span className="font-medium" style={{ color: accentColor }}>{total}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-[#0f0f15] border border-[#2a2a34] rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-opacity-50"
            style={{ borderColor: `${accentColor}33` }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrev}
            className="p-2 rounded transition-colors disabled:opacity-30 hover:bg-[#1a1a24]"
            style={{ color: canGoPrev ? accentColor : undefined }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-9 h-9 rounded text-sm font-medium transition-colors ${
                    page === pageNum 
                      ? 'text-black' 
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a24]'
                  }`}
                  style={page === pageNum ? { backgroundColor: accentColor } : {}}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            className="p-2 rounded transition-colors disabled:opacity-30 hover:bg-[#1a1a24]"
            style={{ color: canGoNext ? accentColor : undefined }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
