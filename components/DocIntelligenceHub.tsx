'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Markdown from './Markdown';
import {
  BUCKETS,
  OPERATIONS,
  DEPARTMENTS,
  getOperationsByBucket,
  getOperationById,
  getDepartmentById,
  type Operation,
  type SampleFile,
  type Bucket,
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
  const [mode, setMode] = useState<'live' | 'mock' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

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
        if (!res.ok) {
          setUploadError(`Failed to process ${file.name}`);
          continue;
        }
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
      if (headerMode === 'mock') setMode('mock');
      else if (headerMode === 'live') setMode('live');

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
                setStreamBuffer(assembled);
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

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white rounded-xl overflow-hidden border border-gray-800/60">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-2 z-50 p-2 bg-gray-800 rounded-lg border border-gray-700"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* ─── LEFT SIDEBAR ─── */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 w-[300px] min-w-[300px] border-r border-gray-800/60 bg-gray-900/80 flex flex-col overflow-hidden absolute lg:relative z-40 h-full`}>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
          {/* Department Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Department</label>
            <select
              value={selectedDept}
              onChange={e => { setSelectedDept(e.target.value); reset(); }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
              ))}
            </select>
            {dept && <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{dept.description}</p>}
          </div>

          {/* Operation Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Operation</label>
            <div className="space-y-3">
              {BUCKETS.map(bucket => {
                const ops = getOperationsByBucket(bucket.id);
                return (
                  <div key={bucket.id}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs">{bucket.icon}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bucket.color }}>{bucket.label}</span>
                    </div>
                    <div className="space-y-1 ml-1">
                      {ops.map(op => (
                        <button
                          key={op.id}
                          onClick={() => { setSelectedOp(op.id); reset(); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedOp === op.id
                              ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                              : 'hover:bg-gray-800/60 text-gray-300 border border-transparent'
                          }`}
                        >
                          <span className="mr-1.5">{op.icon}</span>
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Panel */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents</label>

            {/* Sample files */}
            {sampleFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-gray-500 mb-1.5">Available Data Files</p>
                <div className="space-y-1">
                  {sampleFiles.map(sf => {
                    const loaded = uploadedFiles.some(f => f.filename === sf.filename);
                    const loading = loadingSampleFiles.has(sf.filename);
                    return (
                      <button
                        key={sf.filename}
                        onClick={() => !loaded && !loading && loadSampleFile(sf)}
                        disabled={loaded || loading}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all border ${
                          loaded
                            ? 'bg-green-900/20 border-green-700/30 text-green-400'
                            : loading
                              ? 'bg-yellow-900/20 border-yellow-700/30 text-yellow-400 animate-pulse'
                              : 'bg-gray-800/40 border-gray-700/30 text-gray-300 hover:bg-gray-800/70 hover:border-gray-600/50'
                        }`}
                        title={sf.description}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{loaded ? '✅' : loading ? '⏳' : '📄'}</span>
                          <span className="truncate font-medium">{sf.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 ml-5 line-clamp-1">{sf.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload own files */}
            <div className="mb-2">
              <p className="text-[11px] text-gray-500 mb-1.5">Or Upload Your Own</p>
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-lg cursor-pointer transition-all text-xs text-gray-300">
                <span>📁</span> Choose Files
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.txt,.md,.tsv,.log,.json"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadError && (
              <p className="text-[11px] text-red-400 mt-1">{uploadError}</p>
            )}

            {/* Loaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] text-gray-500">Selected ({uploadedFiles.length})</p>
                {uploadedFiles.map(f => (
                  <div key={f.filename} className="flex items-center justify-between px-2 py-1.5 bg-gray-800/40 rounded text-xs text-gray-300">
                    <span className="truncate flex-1 mr-2">📄 {f.filename}</span>
                    <button onClick={() => removeFile(f.filename)} className="text-red-400 hover:text-red-300 flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN PANEL ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800/60 bg-gray-900/40 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{operation?.icon ?? '📄'}</span>
              <div>
                <h2 className="text-lg font-bold text-white">{operation?.label ?? 'Document Intelligence'}</h2>
                <p className="text-xs text-gray-400 max-w-xl">{operation?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {mode && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${mode === 'mock' ? 'bg-amber-900/30 text-amber-400' : 'bg-green-900/30 text-green-400'}`}>
                  {mode.toUpperCase()}
                </span>
              )}
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-700/50 transition-all"
              >
                ↻ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Chat / Results Area */}
        <div ref={streamRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
          {transcript.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">{operation?.icon ?? '📄'}</div>
              <h3 className="text-xl font-bold text-white mb-2">{operation?.label}</h3>
              <p className="text-sm text-gray-400 max-w-lg mb-6">{operation?.description}</p>

              {/* Starter Prompts */}
              {operation?.starterPrompts && operation.starterPrompts.length > 0 && (
                <div className="w-full max-w-2xl">
                  <p className="text-xs text-gray-500 mb-3">Quick Start — click a prompt to begin:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {operation.starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => send(prompt)}
                        disabled={streaming || uploadedFiles.length === 0}
                        className="text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/40 hover:border-blue-500/40 rounded-xl text-sm text-gray-300 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="text-blue-400 mr-1.5">→</span> {prompt}
                      </button>
                    ))}
                  </div>
                  {uploadedFiles.length === 0 && (
                    <p className="text-[11px] text-amber-400/70 mt-3">⬅ Load or upload documents first to enable analysis</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            transcript.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                    : 'bg-gray-800/50 border border-gray-700/30 text-gray-100'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {streaming && !streamBuffer && (
            <div className="flex justify-start">
              <div className="bg-gray-800/50 border border-gray-700/30 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="animate-spin">⏳</span> Analyzing documents...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Metrics */}
        {(usageStats || streaming) && (
          <div className="px-6 py-2 border-t border-gray-800/40 bg-gray-900/30 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-gray-500">
              {streaming && <span className="text-blue-400">⏱ {elapsedTimer}s</span>}
              {usageStats?.response_time_s != null && <span>⏱ {usageStats.response_time_s}s</span>}
              {usageStats?.input_tokens != null && <span>↗ {usageStats.input_tokens.toLocaleString()} in</span>}
              {usageStats?.output_tokens != null && <span>↘ {usageStats.output_tokens.toLocaleString()} out</span>}
              {usageStats?.model && <span>🤖 {usageStats.model}</span>}
              {usageStats?.estimated_cost_usd != null && <span>💰 ${usageStats.estimated_cost_usd.toFixed(4)}</span>}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="px-6 py-4 border-t border-gray-800/60 bg-gray-900/50 flex-shrink-0">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={
                uploadedFiles.length === 0
                  ? 'Load documents first, then type your query...'
                  : `Ask about your ${dept?.label ?? ''} documents...`
              }
              disabled={streaming}
              className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim() || uploadedFiles.length === 0}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {streaming ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
