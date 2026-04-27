'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Markdown from './Markdown';
import {
  OPERATIONS,
  DEPARTMENTS,
  getOperationById,
  getDepartmentById,
  type Operation,
  type SampleFile,
} from '@/data/doc-intelligence-config';
import { saveChatHistory, loadChatHistory, clearChatHistory, CHAT_KEYS } from '@/lib/chat-history';
import DownloadMenu from './DownloadMenu';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }
interface ImageAttachment { base64: string; media_type: string; label: string; }
interface UploadedFile { filename: string; text: string; images: ImageAttachment[]; }
interface UsageStats {
  input_tokens?: number; output_tokens?: number; total_tokens?: number;
  tool_calls?: number; api_turns?: number; model?: string;
  response_time_s?: number; estimated_cost_usd?: number;
}

interface DataViewerState { open: boolean; title: string; content: string; loading: boolean; pdfUrl?: string; }

export default function DocIntelligenceHub() {
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0].id);
  const [selectedOp, setSelectedOp] = useState<string>(OPERATIONS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingSampleFiles, setLoadingSampleFiles] = useState<Set<string>>(new Set());
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [mode, setMode] = useState<'live' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docSource, setDocSource] = useState<'upload' | 'sample'>('sample');
  const [dataViewer, setDataViewer] = useState<DataViewerState>({ open: false, title: '', content: '', loading: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamThrottleRef = useRef<number>(0);

  const dept = getDepartmentById(selectedDept);
  const operation = getOperationById(selectedOp);
  const sampleFiles: SampleFile[] = dept?.sampleFiles ?? [];

  const transcript: ChatMessage[] =
    streaming && streamBuffer
      ? [...messages, { role: 'assistant', content: streamBuffer }]
      : messages;

  useEffect(() => {
    const saved = loadChatHistory(CHAT_KEYS.DOC_INTELLIGENCE);
    if (saved.length > 0) setMessages(saved);
  }, []);

  useEffect(() => {
    if (messages.length > 0 && !streaming) {
      saveChatHistory(CHAT_KEYS.DOC_INTELLIGENCE, messages);
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [transcript.length, streamBuffer]);

  const loadSampleFile = useCallback(async (sf: SampleFile) => {
    if (uploadedFiles.some(f => f.filename === sf.filename)) return;
    setLoadingSampleFiles(prev => new Set(prev).add(sf.filename));
    try {
      const res = await fetch(sf.path);
      if (!res.ok) throw new Error(`Failed to load ${sf.filename}`);
      const text = await res.text();
      setUploadedFiles(prev => [...prev, { filename: sf.filename, text, images: [] }]);
    } catch (err) {
      setUploadError(`Failed to load ${sf.filename}: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setLoadingSampleFiles(prev => { const n = new Set(prev); n.delete(sf.filename); return n; });
    }
  }, [uploadedFiles]);

  async function viewSampleFile(sf: SampleFile) {
    setDataViewer({ open: true, title: sf.label, content: '', loading: true });
    try {
      const res = await fetch(sf.path);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 0 && sf.filename.endsWith('.csv')) {
        const parseLine = (line: string) => {
          const fields: string[] = []; let cur = ''; let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
            else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
            else cur += ch;
          }
          fields.push(cur.trim()); return fields;
        };
        const headers = parseLine(lines[0]);
        const dataRows = lines.slice(1).map(l => parseLine(l));
        const header = headers.join(' | ');
        const sep = headers.map(() => '---').join(' | ');
        const rowLines = dataRows.map(r => headers.map((_, i) => (r[i] ?? '').replace(/\n/g, ' ')).join(' | '));
        setDataViewer({ open: true, title: `${sf.label} (${sf.filename}) — ${dataRows.length} rows`, content: `| ${header} |\n| ${sep} |\n${rowLines.map(r => `| ${r} |`).join('\n')}`, loading: false });
      } else {
        setDataViewer({ open: true, title: `${sf.label} (${sf.filename})`, content: text, loading: false });
      }
    } catch {
      setDataViewer(prev => ({ ...prev, content: 'Error: Could not load this file.', loading: false }));
    }
  }

  const MAX_UPLOAD_FILES = 10;
  const MAX_UPLOAD_SIZE_MB = 100;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError(null);

    if (uploadedFiles.length >= MAX_UPLOAD_FILES) {
      setUploadError(`Maximum ${MAX_UPLOAD_FILES} files allowed. Remove existing files first.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newFiles: UploadedFile[] = [];
    const filesToUpload = Array.from(files).filter(file => {
      if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        setUploadError(`${file.name} exceeds ${MAX_UPLOAD_SIZE_MB}MB limit`);
        return false;
      }
      return true;
    });

    if (filesToUpload.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append('files', file);
      }
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
        setUploadError(errData.error ?? `Failed to process files`);
      } else {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            newFiles.push({ filename: f.filename, text: f.text ?? '', images: f.images ?? [] });
          }
        }
        if (data.errors?.length) {
          setUploadError(data.errors.join('; '));
        }
      }
    } catch {
      setUploadError('Network error during upload');
    } finally {
      setUploading(false);
    }
    if (newFiles.length) setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(filename: string) {
    setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setStreamBuffer('');
    setUsageStats(null);
    setElapsedTimer(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTimer(parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1)));
    }, 100);

    try {
      const res = await fetch('/api/doc-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: selectedOp,
          department: selectedDept,
          messages: next,
          uploadedTexts: uploadedFiles.map(f => ({ filename: f.filename, text: f.text, images: f.images })),
        }),
      });

      const headerMode = res.headers.get('X-Workbench-Mode');
      if (headerMode === 'live') setMode('live');

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed');
        setMessages([...next, { role: 'assistant', content: `*Error: ${errText}*` }]);
        return;
      }

      await readSSE(res.body, next);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `*Network error: ${err instanceof Error ? err.message : 'unknown'}*` }]);
    } finally {
      setStreaming(false);
      setStreamBuffer('');
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }

  async function readSSE(body: ReadableStream<Uint8Array>, prev: ChatMessage[]) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';

    const flushStream = () => { setStreamBuffer(assembled); streamThrottleRef.current = 0; };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6);
          try {
            const data = JSON.parse(raw);
            switch (currentEvent) {
              case 'text_delta':
                assembled += data;
                if (!streamThrottleRef.current) {
                  streamThrottleRef.current = requestAnimationFrame(flushStream);
                }
                break;
              case 'usage':
              case 'usage_delta':
                setUsageStats(data as UsageStats);
                break;
              case 'error':
                assembled += `\n\n*Error: ${data.message}*`;
                setStreamBuffer(assembled);
                break;
              case 'done':
                break;
            }
          } catch { /* skip malformed */ }
          currentEvent = '';
        }
      }
    }
    if (streamThrottleRef.current) cancelAnimationFrame(streamThrottleRef.current);
    setMessages([...prev, { role: 'assistant', content: assembled }]);
  }

  function reset() {
    setMessages([]);
    setStreamBuffer('');
    setUsageStats(null);
    setElapsedTimer(0);
    setUploadedFiles([]);
    setUploadError(null);
    setDocSource('upload');
    clearChatHistory(CHAT_KEYS.DOC_INTELLIGENCE);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function switchDocSource(source: 'upload' | 'sample') {
    if (source === docSource) return;
    setUploadedFiles([]);
    setUploadError(null);
    setMessages([]);
    setStreamBuffer('');
    setUsageStats(null);
    setDocSource(source);
    clearChatHistory(CHAT_KEYS.DOC_INTELLIGENCE);
  }

  const hasFiles = uploadedFiles.length > 0;

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Data Viewer Modal ── */}
      {dataViewer.open && (
        <div className="fixed inset-0 z-50 flex items-stretch bg-black/50 backdrop-blur-sm p-3 sm:p-5" onClick={() => setDataViewer({ open: false, title: '', content: '', loading: false })}>
          <div className="bg-white rounded-xl shadow-2xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-slate-50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{dataViewer.pdfUrl ? '📄' : '📊'}</span>
                <h3 className="font-bold text-gray-900 text-[14px] truncate">{dataViewer.title}</h3>
                <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shrink-0">VIEW ONLY</span>
              </div>
              <button onClick={() => setDataViewer({ open: false, title: '', content: '', loading: false })}
                className="text-gray-500 hover:text-gray-900 text-xl font-bold px-2 shrink-0">✕</button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
              {dataViewer.loading ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  <span className="animate-spin mr-2">⏳</span> Loading data...
                </div>
              ) : dataViewer.pdfUrl ? (
                <iframe
                  src={dataViewer.pdfUrl}
                  className="w-full border-0"
                  style={{ height: '100%' }}
                  title={dataViewer.title}
                />
              ) : dataViewer.content.startsWith('|') ? (
                <div className="h-full overflow-x-auto overflow-y-auto">
                  <table className="border-collapse text-[12px]">
                    {(() => {
                      const rows = dataViewer.content.split('\n').filter(r => r.trim() && !r.match(/^\|\s*-+/));
                      const cells = rows.map(r => r.split('|').filter(c => c !== '').map(c => c.trim()));
                      return (
                        <>
                          {cells.length > 0 && (
                            <thead className="bg-[#0f1b3d] text-white sticky top-0 z-10">
                              <tr>{cells[0].map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-white/20">{h}</th>)}</tr>
                            </thead>
                          )}
                          <tbody>
                            {cells.slice(1).map((row, ri) => (
                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 border-r border-b border-gray-200 whitespace-nowrap" title={cell}>{cell}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </>
                      );
                    })()}
                  </table>
                </div>
              ) : (
                <div className="h-full overflow-y-auto overflow-x-auto p-5">
                  <pre className="text-[13px] font-mono text-gray-800 bg-slate-50 rounded-lg p-5 whitespace-pre-wrap leading-relaxed min-h-full">{dataViewer.content}</pre>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-slate-50 rounded-b-xl flex justify-end shrink-0">
              {!dataViewer.pdfUrl && (
                <button onClick={() => { try { navigator.clipboard.writeText(dataViewer.content); } catch { /* */ } }}
                  className="text-[11px] font-semibold text-gray-700 hover:text-blue-700 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white mr-2">
                  📋 Copy
                </button>
              )}
              <button onClick={() => setDataViewer({ open: false, title: '', content: '', loading: false })}
                className="text-[11px] font-semibold bg-[#0f1b3d] text-white px-4 py-1.5 rounded-md hover:bg-[#1a2d5e]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Header ── */}
      <section className="bg-gradient-to-r from-[#0f1b3d] to-[#162450] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-white mb-2 tracking-wide">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                Document Intelligence & Visualization
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Analyze, Extract & Visualize Documents</h1>
              <p className="mt-1.5 text-white/80 text-sm max-w-xl leading-relaxed">
                Upload documents, choose an operation, and get structured insights, charts, and actionable outputs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {mode && (
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">LIVE</span>
              )}
              <button onClick={reset} className="text-sm text-white/90 hover:text-white border border-white/30 hover:border-white/60 px-4 py-2 rounded-lg font-medium transition">
                Clear All
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">

        {/* STEPS 1 & 2: Side-by-side — Documents | Operations */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-5">

          {/* STEP 1: Documents — Upload OR Browse (mutually exclusive) */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
            {/* Tab toggle */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => switchDocSource('sample')}
                className={`flex-1 px-4 py-2.5 text-xs font-bold transition-all ${
                  docSource === 'sample'
                    ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📊 Browse Sample Documents
              </button>
              <button
                onClick={() => switchDocSource('upload')}
                className={`flex-1 px-4 py-2.5 text-xs font-bold transition-all ${
                  docSource === 'upload'
                    ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📁 Upload Your Documents
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* === UPLOAD MODE === */}
              {docSource === 'upload' && (
                <>
                  <div className={`border-2 border-dashed rounded-xl px-5 py-5 text-center transition-all ${
                    uploading ? 'border-blue-400 bg-blue-50' : hasFiles ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}>
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1.5">
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <p className="text-sm text-blue-700 font-semibold">Processing your document(s)...</p>
                      </div>
                    ) : (
                      <>
                        <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg cursor-pointer transition text-sm font-bold text-white shadow-sm">
                          <span>📁</span> Upload Your Files
                          <input ref={fileInputRef} type="file" multiple accept=".csv,.txt,.md,.tsv,.log,.json,.pdf,.doc,.docx,.xls,.xlsx,.xml,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff" onChange={handleUpload} className="hidden" />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Upload any document or image — CSV, PDF, DOCX, XLSX, JSON, TXT, PNG, JPG — up to {MAX_UPLOAD_FILES} files, {MAX_UPLOAD_SIZE_MB}MB each
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* === SAMPLE MODE === */}
              {docSource === 'sample' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-md">1</span>
                    <h3 className="text-sm font-bold text-gray-900">
                      Select Your Process & Document(s)
                      {hasFiles && <span className="ml-2 text-emerald-600 font-semibold">({uploadedFiles.length} loaded)</span>}
                    </h3>
                    {!hasFiles && <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">Required</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-600 shrink-0">Select Process</label>
                    <select
                      value={selectedDept}
                      onChange={e => { setSelectedDept(e.target.value); setUploadedFiles([]); }}
                      className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 flex-1"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 italic">{dept?.description}</p>

                  {sampleFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sampleFiles.map(sf => {
                        const loaded = uploadedFiles.some(f => f.filename === sf.filename);
                        const loading = loadingSampleFiles.has(sf.filename);
                        return (
                          <div key={sf.filename} className={`inline-flex items-center gap-0 rounded-lg border transition-all ${
                            loaded
                              ? 'bg-emerald-50 border-emerald-300'
                              : loading
                                ? 'bg-amber-50 border-amber-300 animate-pulse'
                                : 'bg-gray-50 border-gray-250 shadow-sm hover:shadow'
                          }`}>
                            <button
                              onClick={() => !loaded && !loading && loadSampleFile(sf)}
                              disabled={loaded || loading}
                              title={sf.description}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all rounded-l-lg ${
                                loaded
                                  ? 'text-emerald-800 cursor-default'
                                  : loading
                                    ? 'text-amber-800'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-800 cursor-pointer'
                              }`}
                            >
                              <span>{loaded ? '✅' : loading ? '⏳' : '📄'}</span>
                              {sf.label}
                            </button>
                            <button
                              onClick={() => viewSampleFile(sf)}
                              title={`View ${sf.label}`}
                              className="px-2 py-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-l border-gray-200 rounded-r-lg transition"
                            >
                              👁
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Loaded files list (shown in both modes) */}
              {hasFiles && (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">Loaded Documents:</p>
                    {uploadedFiles.length > 1 && (
                      <button onClick={() => setUploadedFiles([])} className="text-xs text-red-600 hover:text-red-800 font-semibold transition underline">Clear all</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map(f => (
                      <div key={f.filename} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        <span>✅</span>
                        <span className="truncate max-w-[180px]" title={f.filename}>{f.filename}</span>
                        {f.images.length > 0 && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold" title={`${f.images.length} image(s) for visual analysis`}>
                            {f.images.length} img
                          </span>
                        )}
                        <button onClick={() => removeFile(f.filename)} className="text-red-500 hover:text-red-700 font-bold ml-1 text-sm">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadError && <p className="text-xs text-red-600 font-medium mt-1">{uploadError}</p>}
            </div>
          </section>

          {/* STEP 2: Operations */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-slate-50">
              <span className="text-xs font-bold bg-violet-600 text-white w-6 h-6 flex items-center justify-center rounded-md">2</span>
              <h3 className="text-sm font-bold text-gray-900">Choose Document Operation</h3>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2 max-h-[450px] overflow-y-auto">
              {OPERATIONS.map(op => (
                <button
                  key={op.id}
                  onClick={() => { setSelectedOp(op.id); setMessages([]); setStreamBuffer(''); setUsageStats(null); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    selectedOp === op.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-gray-50 border-gray-250 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 shadow-sm'
                  }`}
                >
                  <span className="text-base">{op.icon}</span>
                  {op.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* STEP 3: Results Area */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 420px)' }}>
          {/* Results header */}
          <div className="px-5 py-3 border-b border-gray-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-teal-600 text-white px-2.5 py-1 rounded-md">STEP 3</span>
              <h3 className="text-sm font-bold text-gray-900">Results</h3>
              <span className="text-xl">{operation?.icon}</span>
              <span className="text-sm text-gray-600 font-semibold">{operation?.label}</span>
            </div>
            {(usageStats || streaming) && (
              <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
                {streaming && <span className="text-blue-600 font-bold">⏱ {elapsedTimer}s</span>}
                {usageStats?.response_time_s != null && <span>⏱ {usageStats.response_time_s}s</span>}
                {usageStats?.total_tokens != null && <span>{usageStats.total_tokens.toLocaleString()} tokens</span>}
                {usageStats?.estimated_cost_usd != null && <span>${usageStats.estimated_cost_usd.toFixed(4)}</span>}
              </div>
            )}
          </div>

          {/* Chat / results body */}
          <div ref={streamRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {transcript.length === 0 && !streaming ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="text-6xl mb-4">{operation?.icon ?? '📄'}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{operation?.label}</h3>
                <p className="text-sm text-gray-600 max-w-lg mb-8 leading-relaxed">{operation?.description}</p>

                {operation?.starterPrompts && operation.starterPrompts.length > 0 && (
                  <div className="w-full max-w-2xl">
                    <p className="text-sm text-gray-500 mb-3 font-semibold">Quick Start — click a prompt to begin:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {operation.starterPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => send(prompt)}
                          disabled={streaming || !hasFiles}
                          className="text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl text-sm text-gray-700 hover:text-blue-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow"
                        >
                          <span className="text-blue-600 font-bold mr-1.5">→</span> {prompt}
                        </button>
                      ))}
                    </div>
                    {!hasFiles && (
                      <p className="text-sm text-amber-700 mt-4 font-semibold bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                        ▲ Load or upload documents in Step 1 first
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              transcript.map((msg, i) => (
                <ResultBubble key={i} message={msg} isStreaming={streaming && msg.role === 'assistant' && i === transcript.length - 1} />
              ))
            )}

            {streaming && !streamBuffer && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-gray-600 font-medium">Analyzing documents...</span>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-200 bg-slate-50 px-5 py-3.5 shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={
                  !hasFiles
                    ? 'Upload your document(s) first, then ask any question...'
                    : 'Ask anything about your uploaded documents — summarize, extract, compare, visualize...'
                }
                disabled={streaming}
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-40 transition shadow-sm"
              />
              <button
                onClick={() => send()}
                disabled={streaming || !input.trim() || !hasFiles}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm"
              >
                {streaming ? '...' : 'Send'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 font-medium">
                {hasFiles ? `${uploadedFiles.length} document(s) loaded · ${operation?.label} mode` : 'No documents loaded'}
              </p>
              <p className="text-xs text-gray-400 font-medium">Press Enter to send</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md px-5 py-3 text-sm shadow-md">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const preview = message.content.slice(0, 500).replace(/\n/g, ' ');
  const showCollapse = !isStreaming && message.content.length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full bg-slate-50 border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4 text-sm shadow-sm">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-2 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">AI Document Analyst</span>
          </div>
          {showCollapse && (
            <span className="text-xs font-bold text-blue-500 group-hover:text-blue-700 tracking-wide transition">
              {expanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
            </span>
          )}
        </button>

        {isStreaming || expanded ? (
          <>
            <div className="text-gray-900 leading-relaxed doc-intel-markdown">
              <Markdown>{message.content}</Markdown>
            </div>
            {isStreaming && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <span className="text-xs text-gray-500 font-medium">streaming...</span>
              </div>
            )}
            {!isStreaming && message.content && (
              <div className="mt-3 pt-2.5 border-t border-gray-200 flex items-center gap-3">
                <DownloadMenu content={message.content} filenamePrefix="doc-intelligence" />
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
                  {copied ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg><span className="text-emerald-700 font-bold">Copied!</span></>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-xs leading-relaxed cursor-pointer" onClick={() => setExpanded(true)}>
            {preview}{message.content.length > 500 ? '...' : ''}
            <span className="ml-2 text-blue-600 font-semibold">Click to expand</span>
          </div>
        )}
      </div>
    </div>
  );
}
