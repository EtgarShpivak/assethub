'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
  indent?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'חיפוש...',
  emptyLabel = 'לא נמצאו תוצאות',
  className = '',
  allowEmpty = false,
  emptyOptionLabel = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(q) ||
      o.sublabel?.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q)
    );
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex items-center gap-2 w-full border border-[#E8E8E8] rounded-md p-2 text-sm text-right bg-white hover:border-[#ccc] transition-colors h-[38px]"
      >
        <span className="flex-1 truncate text-ono-gray-dark">
          {selectedOption ? selectedOption.label : (
            <span className="text-ono-gray">{emptyOptionLabel || placeholder}</span>
          )}
        </span>
        {value && allowEmpty ? (
          <X
            className="w-3.5 h-3.5 text-ono-gray hover:text-red-500 shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
          />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-ono-gray shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 top-full mt-1 w-full bg-white border border-[#E8E8E8] rounded-md shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-1.5 border-b border-[#E8E8E8]">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ono-gray" />
              <input
                ref={inputRef}
                type="text"
                className="w-full border border-[#E8E8E8] rounded px-2 pr-7 py-1.5 text-sm outline-none focus:border-ono-green"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-auto">
            {allowEmpty && emptyOptionLabel && (
              <button
                type="button"
                className={`w-full text-right px-3 py-2 text-sm hover:bg-ono-gray-light transition-colors ${!value ? 'bg-ono-green-light/30 font-medium' : ''}`}
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              >
                <span className="text-ono-gray">{emptyOptionLabel}</span>
              </button>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-right px-3 py-2 text-sm hover:bg-ono-green-light/50 transition-colors flex items-center gap-2 ${
                  opt.value === value ? 'bg-ono-green-light/30 font-medium' : ''
                } ${opt.indent ? 'pr-6' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.sublabel && (
                  <span className="text-[10px] text-ono-gray font-mono shrink-0">{opt.sublabel}</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-ono-gray text-center">{emptyLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
