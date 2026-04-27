'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { downloadInFormat, FORMAT_OPTIONS, type ExportFormat } from '@/lib/download-utils';

interface DownloadMenuProps {
  content: string;
  filenamePrefix: string;
}

export default function DownloadMenu({ content, filenamePrefix }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = 320;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove > menuH || spaceAbove > spaceBelow) {
      setPos({ top: rect.top + window.scrollY - menuH - 4, left: rect.left + window.scrollX });
    } else {
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function onClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onScroll() { updatePosition(); }
    function onResize() { updatePosition(); }

    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

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

  const dropdown = open && pos ? createPortal(
    <div
      ref={menuRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5"
    >
      <div className="px-3 py-1.5 border-b border-gray-100">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Choose Export Format</span>
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
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg transition px-2.5 py-1.5 ${
          open
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-500 hover:text-blue-700 hover:bg-gray-100'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {dropdown}
    </>
  );
}
