'use client';

import { useState } from 'react';
import { downloadInFormat, FORMAT_OPTIONS, type ExportFormat } from '@/lib/download-utils';

interface DownloadMenuProps {
  content: string;
  filenamePrefix: string;
}

export default function DownloadMenu({ content, filenamePrefix }: DownloadMenuProps) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const format = e.target.value as ExportFormat;
    if (!format) return;
    e.target.value = '';
    setLoading(true);
    try {
      await downloadInFormat(content, filenamePrefix, format);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <select
        onChange={handleChange}
        disabled={loading}
        defaultValue=""
        className="text-xs font-semibold text-gray-500 bg-transparent border border-gray-300 rounded-lg px-2 py-1.5 cursor-pointer hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 transition appearance-auto"
        style={{ minWidth: '130px' }}
      >
        <option value="" disabled>{loading ? 'Generating...' : 'Download as...'}</option>
        {FORMAT_OPTIONS.map((opt) => (
          <option key={opt.format} value={opt.format}>
            {opt.icon} .{opt.format} — {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
