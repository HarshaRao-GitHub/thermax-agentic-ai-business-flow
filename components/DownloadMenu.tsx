'use client';

import { useState, useRef, useEffect } from 'react';
import { downloadInFormat, FORMAT_OPTIONS, type ExportFormat } from '@/lib/download-utils';

interface DownloadMenuProps {
  content: string;
  filenamePrefix: string;
  size?: 'sm' | 'md';
}

export default function DownloadMenu({ content, filenamePrefix, size = 'md' }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleDownload = async (format: ExportFormat) => {
    setLoading(format);
    try {
      await downloadInFormat(content, filenamePrefix, format);
    } catch {
      /* ignore */
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  const isSm = size === 'sm';

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 font-semibold rounded-lg transition ${
          isSm
            ? 'text-[10px] text-gray-500 hover:text-blue-700 px-2 py-1 hover:bg-white/60'
            : 'text-xs text-gray-500 hover:text-blue-700 px-2.5 py-1.5 hover:bg-gray-100'
        } ${open ? 'bg-gray-100 text-blue-700' : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={isSm ? 12 : 14} height={isSm ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Export Format</span>
          </div>
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.format}
              onClick={() => handleDownload(opt.format)}
              disabled={loading !== null}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50 transition disabled:opacity-50 group"
            >
              <span className="text-base shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-700">
                  {loading === opt.format ? 'Generating...' : `.${opt.format}`}
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">{opt.label}</span>
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
