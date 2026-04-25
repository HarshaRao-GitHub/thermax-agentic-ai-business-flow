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

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }
interface UploadedFile { filename: string; text: string; }
interface UsageStats {
  input_tokens?: number; output_tokens?: number; total_tokens?: number;
  tool_calls?: number; api_turns?: number; model?: string;
  response_time_s?: number; estimated_cost_usd?: number;
}

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
      setUploadedFiles(prev => [...prev, { filename: sf.filename, text }]);
    } catch (err) {
      setUploadError(`Failed to load ${sf.filename}: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setLoadingSampleFiles(prev => { const n = new Set(prev); n.delete(sf.filename); return n; });
    }
  }, [uploadedFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError(null);

    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`${file.name} exceeds 5MB limit`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) { setUploadError(`Failed to process ${file.name}`); continue; }
        const data = await res.json();
        newFiles.push({ filename: file.name, text: data.text ?? '' });
      } catch {
        setUploadError(`Error uploading ${file.name}`);
      }
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
          uploadedTexts: uploadedFiles.map(f => ({ filename: f.filename, text: f.text })),
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const hasFiles = uploadedFiles.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* ── Hero Header ── */}
      <section className="bg-gradient-to-r from-thermax-navy to-thermax-navyDeep border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-[11px] font-mono text-white/90 mb-2">
                <span className="w-1.5 h-1.5 bg-thermax-saffron rounded-full animate-pulse" />
                Document Intelligence & Visualization
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Analyze, Extract & Visualize Documents</h1>
              <p className="mt-1 text-white/60 text-sm max-w-xl">
                Upload documents, choose an operation, and get structured insights, charts, and actionable outputs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {mode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">LIVE</span>
              )}
              <button onClick={reset} className="text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/50 px-3 py-2 rounded-lg transition">
                Clear All
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">

        {/* ═══════════════════════════════════════════════════════════════
            STEPS 1 & 2: Side-by-side — Documents | Operations
           ═══════════════════════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-4">

          {/* STEP 1: Documents */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">1</span>
                <h3 className="text-[12px] font-bold text-gray-800">
                  Documents
                  {hasFiles && <span className="ml-1.5 text-emerald-600 font-mono text-[10px]">({uploadedFiles.length})</span>}
                </h3>
                {!hasFiles && <span className="text-[10px] text-amber-600 font-medium">Required</span>}
              </div>
              <select
                value={selectedDept}
                onChange={e => { setSelectedDept(e.target.value); setUploadedFiles([]); }}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                ))}
              </select>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              {sampleFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sampleFiles.map(sf => {
                    const loaded = uploadedFiles.some(f => f.filename === sf.filename);
                    const loading = loadingSampleFiles.has(sf.filename);
                    return (
                      <button
                        key={sf.filename}
                        onClick={() => !loaded && !loading && loadSampleFile(sf)}
                        disabled={loaded || loading}
                        title={sf.description}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                          loaded
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : loading
                              ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs">{loaded ? '✅' : loading ? '⏳' : '📄'}</span>
                        {sf.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition text-[11px] font-semibold text-blue-700">
                  <span>📁</span> Upload
                  <input ref={fileInputRef} type="file" multiple accept=".csv,.txt,.md,.tsv,.log,.json,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleUpload} className="hidden" />
                </label>

                {uploadedFiles.map(f => (
                  <div key={f.filename} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-[10px] text-emerald-700">
                    <span className="truncate max-w-[120px]" title={f.filename}>{f.filename}</span>
                    <button onClick={() => removeFile(f.filename)} className="text-red-400 hover:text-red-600 font-bold ml-0.5">×</button>
                  </div>
                ))}

                {uploadedFiles.length > 1 && (
                  <button onClick={() => setUploadedFiles([])} className="text-[9px] text-red-400 hover:text-red-600 transition">Clear all</button>
                )}
              </div>

              {uploadError && <p className="text-[10px] text-red-600">{uploadError}</p>}
            </div>
          </section>

          {/* STEP 2: Operations */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded">2</span>
              <h3 className="text-[12px] font-bold text-gray-800">Operation</h3>
            </div>
            <div className="px-3 py-3 flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto">
              {OPERATIONS.map(op => (
                <button
                  key={op.id}
                  onClick={() => { setSelectedOp(op.id); setMessages([]); setStreamBuffer(''); setUsageStats(null); }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    selectedOp === op.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="text-sm">{op.icon}</span>
                  {op.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STEP 3: Results Area
           ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 420px)' }}>
          {/* Results header */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded">STEP 3</span>
              <h3 className="text-[13px] font-bold text-gray-800">Results</h3>
              <span className="text-lg">{operation?.icon}</span>
              <span className="text-[12px] text-gray-500 font-medium">{operation?.label}</span>
            </div>
            {(usageStats || streaming) && (
              <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
                {streaming && <span className="text-blue-600">⏱ {elapsedTimer}s</span>}
                {usageStats?.response_time_s != null && <span>⏱ {usageStats.response_time_s}s</span>}
                {usageStats?.total_tokens != null && <span>{usageStats.total_tokens.toLocaleString()} tokens</span>}
                {usageStats?.estimated_cost_usd != null && <span>${usageStats.estimated_cost_usd.toFixed(4)}</span>}
              </div>
            )}
          </div>

          {/* Chat / results body */}
          <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {transcript.length === 0 && !streaming ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="text-5xl mb-4">{operation?.icon ?? '📄'}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{operation?.label}</h3>
                <p className="text-sm text-gray-400 max-w-lg mb-6 leading-relaxed">{operation?.description}</p>

                {operation?.starterPrompts && operation.starterPrompts.length > 0 && (
                  <div className="w-full max-w-2xl">
                    <p className="text-[11px] text-gray-400 mb-3 font-medium">Quick Start — click a prompt to begin:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {operation.starterPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => send(prompt)}
                          disabled={streaming || !hasFiles}
                          className="text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-[12px] text-gray-600 hover:text-blue-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <span className="text-blue-500 mr-1.5">→</span> {prompt}
                        </button>
                      ))}
                    </div>
                    {!hasFiles && (
                      <p className="text-[11px] text-amber-600 mt-3 font-medium">
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
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400 font-mono">Analyzing documents...</span>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={
                  !hasFiles
                    ? 'Load documents in Step 1 first, then type your query...'
                    : `Ask about your ${dept?.label ?? ''} documents or request charts/visualizations...`
                }
                disabled={streaming}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-40 transition"
              />
              <button
                onClick={() => send()}
                disabled={streaming || !input.trim() || !hasFiles}
                className="px-5 py-2.5 bg-thermax-navy hover:bg-thermax-navyDeep text-white rounded-lg text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                {streaming ? '...' : 'Send'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-gray-400">
                {hasFiles ? `${uploadedFiles.length} document(s) loaded · ${operation?.label} mode` : 'No documents loaded'}
              </p>
              <p className="text-[10px] text-gray-300 font-mono">Enter to send</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const [copied, setCopied] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-thermax-navy text-white rounded-2xl rounded-tr-md px-4 py-3 text-[13px]">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const handleDownload = () => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const blob = new Blob([message.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `doc-intelligence-${ts}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4 text-[13px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <span className="text-[10px] font-mono text-blue-600/70 uppercase tracking-wider">AI Document Analyst</span>
        </div>
        <div className="text-gray-800 leading-relaxed doc-intel-markdown">
          <Markdown>{message.content}</Markdown>
        </div>
        {isStreaming && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-20 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <span className="text-[10px] text-gray-400 font-mono">streaming...</span>
          </div>
        )}
        {!isStreaming && message.content && (
          <div className="mt-3 pt-2 border-t border-gray-200 flex items-center gap-2">
            <button onClick={handleDownload} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
            <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition">
              {copied ? (
                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg><span className="text-emerald-600">Copied!</span></>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
