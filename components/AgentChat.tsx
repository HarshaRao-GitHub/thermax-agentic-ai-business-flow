'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Stage } from '@/data/stages';
import type { StageTool } from '@/data/stages';
import Markdown from './Markdown';
import ApprovalPanel from './ApprovalPanel';
import type { HitlEvent } from './ApprovalPanel';
import { useWorkflow } from './WorkflowContext';
import { getStageResult, saveStageResult } from '@/lib/client-store';
import { sampleFilesByStage, type SampleFile } from '@/data/sample-files';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }
interface UploadedFile { filename: string; text: string; truncated: boolean; }
interface ToolEvent { type: 'start' | 'result'; tool: string; input?: Record<string, unknown>; result?: string; timestamp: number; }
interface UsageStats { input_tokens?: number; output_tokens?: number; total_tokens?: number; tool_calls?: number; api_turns?: number; model?: string; response_time_s?: number; estimated_cost_usd?: number; }

export default function AgentChat({
  stage,
  isGovernance = false
}: {
  stage: { slug: string; title: string; icon: string; tools: StageTool[]; systemPrompt: string; starterPrompt: string; outputHint: string; agent: { name: string; shortId: string; modelStack: string; description: string; }; dataSources: { file: string; label: string; folder: string; rowEstimate: number; description: string; }[]; } & Partial<Stage>;
  isGovernance?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'mock' | null>(null);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [textStreamStarted, setTextStreamStarted] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null);
  const [hitlDecision, setHitlDecision] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [loadingSampleFiles, setLoadingSampleFiles] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const { refresh: refreshWorkflow } = useWorkflow();

  const sampleFiles: SampleFile[] = sampleFilesByStage[stage.slug] ?? [];

  const transcript: ChatMessage[] =
    streaming && streamBuffer
      ? [...messages, { role: 'assistant', content: streamBuffer }]
      : messages;

  const totalTools = stage.tools.length;
  const progress = computeProgress(toolEvents, totalTools, textStreamStarted, streaming);

  useEffect(() => {
    if (restored) return;
    try {
      const saved = getStageResult(stage.slug);
      if (saved) {
        setMessages(saved.messages ?? []);
        setToolEvents(saved.toolEvents ?? []);
        setUsageStats(saved.usageStats as UsageStats | null);
        setHitlEvent(saved.hitlEvent as HitlEvent | null);
        setHitlDecision(saved.hitlDecision ?? null);
        setMode(saved.mode ?? null);
        if (saved.messages?.length > 0) setTextStreamStarted(true);
      }
    } catch { /* no saved state */ }
    setRestored(true);
  }, [stage.slug, restored]);

  const persistResult = useCallback(() => {
    try {
      saveStageResult({
        slug: stage.slug,
        stageNumber: (stage as Stage).number ?? 0,
        messages,
        toolEvents,
        usageStats: usageStats as Record<string, unknown> | null,
        hitlEvent: hitlEvent as Record<string, unknown> | null,
        hitlDecision,
        mode,
        completedAt: new Date().toISOString()
      });
      refreshWorkflow();
    } catch { /* ignore */ }
  }, [stage.slug, stage, messages, toolEvents, usageStats, hitlEvent, hitlDecision, mode, refreshWorkflow]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [transcript.length, streamBuffer, toolEvents.length]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setStreamBuffer('');
    setToolEvents([]);
    setTextStreamStarted(false);
    setUsageStats(null);
    setElapsedTimer(0);
    setHitlEvent(null);
    setHitlDecision(null);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTimer(parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1)));
    }, 100);

    try {
      const res = await fetch('/api/chat-agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: stage.slug,
          messages: next,
          uploadedTexts: uploadedFiles.map(f => ({ filename: f.filename, text: f.text }))
        })
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
      setTimeout(() => persistResult(), 500);
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
              case 'tool_start':
                setToolEvents((prev) => [...prev, { type: 'start', tool: data.tool, input: data.input, timestamp: Date.now() }]);
                break;
              case 'tool_result':
                setToolEvents((prev) => [...prev, { type: 'result', tool: data.tool, result: data.result, timestamp: Date.now() }]);
                break;
              case 'text_delta':
                if (!assembled) setTextStreamStarted(true);
                assembled += data;
                setStreamBuffer(assembled);
                break;
              case 'usage':
              case 'usage_delta':
                setUsageStats(data as UsageStats);
                break;
              case 'hitl_required':
                setHitlEvent(data as HitlEvent);
                break;
              case 'error':
                assembled += `\n\n*Error: ${data.message}*`;
                setStreamBuffer(assembled);
                break;
              case 'done':
                break;
            }
          } catch { /* skip malformed SSE lines */ }
          currentEvent = '';
        }
      }
    }
    setMessages([...prev, { role: 'assistant', content: assembled }]);
  }

  function reset() {
    setMessages([]);
    setStreamBuffer('');
    setToolEvents([]);
    setTextStreamStarted(false);
    setUsageStats(null);
    setElapsedTimer(0);
    setUploadedFiles([]);
    setUploadError(null);
    setHitlEvent(null);
    setHitlDecision(null);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i]);
    }
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); return; }
      const newFiles: UploadedFile[] = (data.files ?? []).map((f: UploadedFile) => ({
        filename: f.filename, text: f.text, truncated: f.truncated
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      if (data.errors?.length) {
        setUploadError(data.errors.join('; '));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function loadSampleFile(sf: SampleFile) {
    if (uploadedFiles.some(f => f.filename === sf.filename)) return;
    setLoadingSampleFiles(prev => new Set(prev).add(sf.filename));
    try {
      const res = await fetch(sf.path);
      if (!res.ok) throw new Error(`Failed to fetch ${sf.filename}`);
      const text = await res.text();
      const truncated = text.length > 200_000;
      setUploadedFiles(prev => [...prev, {
        filename: sf.filename,
        text: truncated ? text.slice(0, 200_000) : text,
        truncated,
      }]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to load sample file');
    } finally {
      setLoadingSampleFiles(prev => { const next = new Set(prev); next.delete(sf.filename); return next; });
    }
  }

  async function loadAllSampleFiles() {
    const unloaded = sampleFiles.filter(sf => !uploadedFiles.some(f => f.filename === sf.filename));
    for (const sf of unloaded) await loadSampleFile(sf);
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4">
        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">Agent Profile</h3>
          <div className="space-y-1.5 text-[12px]">
            <Field label="Agent" value={stage.agent.name} />
            <Field label="ID" value={stage.agent.shortId} mono />
            <Field label="Model" value={stage.agent.modelStack} mono />
            <Field label="Mode" value="Agentic (tool-use)" />
          </div>
          <p className="text-[11px] text-thermax-slate mt-2 leading-snug">
            {stage.agent.description}
          </p>
        </section>

        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Agent Tools ({stage.tools.length})
          </h3>
          <div className="space-y-1.5">
            {stage.tools.map((t) => (
              <div key={t.name} className="p-2 rounded-lg bg-thermax-mist border border-thermax-line">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{t.icon}</span>
                  <span className="font-mono text-thermax-navy font-semibold text-[11px]">{t.name}</span>
                </div>
                <div className="text-thermax-slate text-[10px] leading-snug">{t.description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Data Backbone ({stage.dataSources.length} sources)
          </h3>
          <div className="space-y-2">
            {stage.dataSources.map((ds) => (
              <div key={ds.file} className="p-2 rounded-lg bg-thermax-mist border border-thermax-line">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-thermax-navy font-semibold text-[11px]">{ds.label}</span>
                  <span className="text-thermax-saffronDeep font-mono font-bold text-[10px]">{ds.rowEstimate} rows</span>
                </div>
                <div className="text-thermax-slate text-[10px] leading-snug">{ds.description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Upload Documents {uploadedFiles.length > 0 && <span className="text-thermax-saffron">({uploadedFiles.length})</span>}
          </h3>
          {stage.acceptedFileHint && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-1.5">
                <span className="text-blue-600 text-[11px] mt-px shrink-0">ℹ️</span>
                <div>
                  <div className="text-[10px] font-semibold text-blue-800 mb-0.5">This agent accepts:</div>
                  <div className="text-[10px] text-blue-700 leading-snug">{stage.acceptedFileHint}</div>
                </div>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.tsv,.log" onChange={handleUpload}
            className="text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-thermax-navy file:text-white file:font-semibold hover:file:bg-thermax-navyDeep file:cursor-pointer w-full" />
          <p className="text-[10px] text-thermax-slate mt-1">Select multiple files at once or upload in batches</p>
          {uploadedFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {uploadedFiles.map((f, idx) => (
                <div key={`${f.filename}-${idx}`} className="flex items-start justify-between gap-2 p-2 bg-thermax-mist rounded text-[11px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-thermax-navy truncate" title={f.filename}>{f.filename}</div>
                    <div className="text-thermax-slate">{(f.text.length / 1024).toFixed(1)} KB{f.truncated && ' (truncated)'}</div>
                  </div>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 font-bold text-sm shrink-0 leading-none mt-0.5"
                    title="Remove file"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => setUploadedFiles([])}
                className="text-[10px] text-thermax-saffronDeep font-semibold hover:underline"
              >Remove all</button>
            </div>
          )}
          {uploadError && <div className="mt-2 text-[11px] text-red-600">{uploadError}</div>}
        </section>

        {sampleFiles.length > 0 && (
          <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate">
                Sample Data Files ({sampleFiles.length})
              </h3>
              {sampleFiles.some(sf => !uploadedFiles.some(f => f.filename === sf.filename)) && (
                <button
                  onClick={loadAllSampleFiles}
                  disabled={streaming}
                  className="text-[10px] font-semibold text-thermax-saffronDeep hover:underline disabled:opacity-40"
                >
                  Load All
                </button>
              )}
            </div>
            <p className="text-[10px] text-thermax-slate mb-2 leading-snug">
              Pre-built Thermax data files for this agent. Click any file to load it.
            </p>
            <div className="space-y-1.5">
              {sampleFiles.map((sf) => {
                const isLoaded = uploadedFiles.some(f => f.filename === sf.filename);
                const isLoading = loadingSampleFiles.has(sf.filename);
                return (
                  <button
                    key={sf.filename}
                    onClick={() => loadSampleFile(sf)}
                    disabled={isLoaded || isLoading || streaming}
                    className={`w-full text-left p-2 rounded-lg border transition-all ${
                      isLoaded
                        ? 'bg-emerald-50 border-emerald-200 cursor-default'
                        : isLoading
                        ? 'bg-blue-50 border-blue-200 animate-pulse'
                        : 'bg-thermax-mist border-thermax-line hover:border-thermax-saffron hover:bg-amber-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px]">{isLoaded ? '✅' : isLoading ? '⏳' : '📄'}</span>
                      <span className={`text-[11px] font-semibold truncate ${isLoaded ? 'text-emerald-700' : 'text-thermax-navy'}`}>
                        {sf.label}
                      </span>
                      {isLoaded && <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">LOADED</span>}
                    </div>
                    <div className="text-[10px] text-thermax-slate leading-snug pl-5">{sf.description}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </aside>

      <section className="flex flex-col bg-white border border-thermax-line rounded-xl shadow-card min-h-[640px]">
        <SystemPromptViewer prompt={stage.systemPrompt} agentName={stage.agent.name} />
        <div className="flex items-center justify-between px-5 py-3 border-b border-thermax-line">
          {streaming ? (
            <ProgressBar percent={progress.percent} label={progress.label} />
          ) : (
            <div className="flex items-center gap-2 text-[12px]">
              <span className={`inline-block w-2 h-2 rounded-full ${mode === 'live' ? 'bg-emerald-500' : mode === 'mock' ? 'bg-amber-500' : 'bg-thermax-slate/40'}`} />
              <span className="font-mono text-thermax-slate">
                {mode === 'live' ? `Live · Enterprise LLM · Agentic · ${stage.tools.length} tools` : mode === 'mock' ? 'Mock mode (set API key for live)' : 'Ready'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {messages.length > 0 && !streaming && (
              <button onClick={() => navigator.clipboard.writeText(messages[messages.length - 1].content)}
                className="text-[11px] font-semibold text-thermax-navy hover:text-thermax-saffronDeep px-2 py-1">Copy</button>
            )}
            <button onClick={reset} disabled={streaming}
              className="text-[11px] font-semibold text-thermax-slate hover:text-thermax-navy px-2 py-1 disabled:opacity-40">Reset</button>
          </div>
        </div>

        {(usageStats || streaming) && (transcript.length > 0 || toolEvents.length > 0) && (
          <div className="px-4 pt-3 pb-2 border-b border-thermax-line bg-white">
            <UsageCard stats={usageStats} elapsed={elapsedTimer} streaming={streaming} toolCount={stage.tools.length} />
          </div>
        )}

        <div ref={streamRef} className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[68vh]">
          {transcript.length === 0 && toolEvents.length === 0 ? (
            <EmptyState stage={stage} />
          ) : (
            <>
              {transcript.filter((m) => m.role === 'user').map((m, i) => (
                <MessageBubble key={`u-${i}`} role="user" content={m.content} />
              ))}
              {toolEvents.length > 0 && (
                <div className="space-y-2">
                  {buildToolPairs(toolEvents).map((pair, i) => (
                    <ToolCard key={i} pair={pair} tools={stage.tools} />
                  ))}
                </div>
              )}
              {transcript.filter((m) => m.role === 'assistant').map((m, i) => (
                <MessageBubble key={`a-${i}`} role="assistant" content={m.content}
                  streaming={streaming && i === transcript.filter((x) => x.role === 'assistant').length - 1} />
              ))}
              {hitlEvent && !streaming && (
                <ApprovalPanel
                  hitl={hitlEvent}
                  onDecision={(decision, detail) => {
                    setHitlDecision(`${decision}: ${detail}`);
                    setTimeout(() => {
                      persistResult();
                      refreshWorkflow();
                    }, 1000);
                  }}
                />
              )}
              {hitlDecision && !hitlEvent?.approvalId && (
                <div className="text-[12px] text-emerald-700 bg-emerald-50 rounded-lg p-3">
                  {hitlDecision}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-thermax-line p-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <button onClick={() => send(stage.starterPrompt)} disabled={streaming}
              className="text-[11px] font-semibold bg-thermax-navy text-white px-3 py-1.5 rounded-md hover:bg-thermax-navyDeep disabled:opacity-40">
              Run {stage.title} Agent
            </button>
          </div>
          <div className="flex gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              placeholder={`Ask the ${stage.agent.name}... (Ctrl/Cmd+Enter to send)`}
              rows={3} disabled={streaming}
              className="flex-1 border border-thermax-line rounded-md px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-thermax-saffron focus:ring-2 focus:ring-thermax-saffron/20 disabled:bg-thermax-mist" />
            <button onClick={() => send()} disabled={streaming || !input.trim()}
              className="bg-thermax-saffron text-white font-semibold px-5 rounded-md hover:bg-thermax-saffronDeep disabled:opacity-40 disabled:cursor-not-allowed">
              Send
            </button>
          </div>
          <div className="mt-2 text-[11px] text-thermax-slate font-mono">
            {stage.dataSources.length} data source(s) · {stage.tools.length} tools · agentic mode
            {uploadedFiles.length > 0 && ` · ${uploadedFiles.length} uploaded document${uploadedFiles.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </section>
    </div>
  );
}

interface ToolPair { tool: string; input?: Record<string, unknown>; result?: string; completed: boolean; }

function buildToolPairs(events: ToolEvent[]): ToolPair[] {
  const pairs: ToolPair[] = [];
  const pending = new Map<string, number[]>();
  for (const ev of events) {
    if (ev.type === 'start') {
      const idx = pairs.length;
      pairs.push({ tool: ev.tool, input: ev.input, completed: false });
      const q = pending.get(ev.tool) ?? [];
      q.push(idx);
      pending.set(ev.tool, q);
    } else {
      const q = pending.get(ev.tool);
      if (q && q.length > 0) {
        const idx = q.shift()!;
        pairs[idx].result = ev.result;
        pairs[idx].completed = true;
      } else {
        pairs.push({ tool: ev.tool, result: ev.result, completed: true });
      }
    }
  }
  return pairs;
}

function ToolCard({ pair, tools }: { pair: ToolPair; tools: StageTool[] }) {
  const toolDef = tools.find((t) => t.name === pair.tool);
  const icon = toolDef?.icon ?? '🔧';
  const label = toolDef?.label ?? pair.tool;

  if (!pair.completed) {
    return (
      <div className="flex items-start gap-3 bg-gradient-to-r from-thermax-navy to-thermax-slate text-white rounded-lg px-4 py-3 animate-pulse">
        <span className="text-lg mt-0.5">{icon}</span>
        <div>
          <div className="text-[13px] font-semibold">Agent is working...</div>
          <div className="text-[12px] text-white/80 mt-0.5">{toolDef?.description ?? 'Processing...'}</div>
        </div>
      </div>
    );
  }

  let summary = 'Step completed successfully.';
  try {
    const parsed = JSON.parse(pair.result ?? '{}');
    if (parsed.summary) summary = parsed.summary;
  } catch { /* use default */ }

  return (
    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
      <span className="text-lg mt-0.5">✅</span>
      <div>
        <div className="text-[13px] font-semibold text-emerald-800">{label}</div>
        <div className="text-[12px] text-emerald-700 mt-0.5 leading-relaxed">{summary}</div>
      </div>
    </div>
  );
}

function UsageCard({ stats, elapsed, streaming: isActive, toolCount }: { stats: UsageStats | null; elapsed: number; streaming: boolean; toolCount: number; }) {
  const fmt = (n: number) => n.toLocaleString();
  const displayTime = stats?.response_time_s ?? elapsed;
  const modelDisplay = stats?.model ? stats.model.replace(/claude-opus-4-7/gi, 'Enterprise LLM').replace(/claude/gi, 'Enterprise') : '—';

  const tradTime = Math.max(1, Math.round(displayTime / 60 * 24 * 1.5));
  const tradDays = Math.floor(tradTime / 24);
  const tradHours = tradTime % 24;
  const tradLabel = tradDays > 0 ? `${Math.floor(tradDays / 7)}w ${tradDays % 7}d ${tradHours}h` : `${tradHours}h 0m`;
  const tradCost = ((stats?.estimated_cost_usd ?? 0.5) * 2600).toFixed(0);
  const manualDays = tradDays + Math.ceil(tradDays * 0.4);
  const manualLabel = `${Math.floor(manualDays / 7)}w ${manualDays % 7}d 0h 0m`;
  const manualCost = ((stats?.estimated_cost_usd ?? 0.5) * 5700).toFixed(0);

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border px-4 py-3 text-[12px] ${isActive ? 'bg-blue-50/60 border-blue-200' : 'bg-thermax-mist border-thermax-line'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">📊</span>
          <span className="font-bold text-thermax-navy text-[13px]">Agentic Session Metrics</span>
          {isActive && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />LIVE
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <MetricTile icon="📥" label="Input Tokens" value={stats?.input_tokens != null ? fmt(stats.input_tokens) : '—'} />
          <MetricTile icon="📤" label="Output Tokens" value={stats?.output_tokens != null ? fmt(stats.output_tokens) : '—'} />
          <MetricTile icon="📦" label="Total Tokens" value={stats?.total_tokens != null ? fmt(stats.total_tokens) : '—'} highlight />
          <MetricTile icon="⏱️" label="Response Time" value={`${displayTime}s`} />
          <MetricTile icon="🔧" label="Tool Calls" value={stats?.tool_calls != null ? String(stats.tool_calls) : '—'} />
          <MetricTile icon="🔄" label="API Turns" value={stats?.api_turns != null ? String(stats.api_turns) : '—'} />
          <MetricTile icon="🤖" label="Model" value={modelDisplay} mono />
          <MetricTile icon="💰" label="AI Agent Cost" value={stats?.estimated_cost_usd != null ? `$${stats.estimated_cost_usd.toFixed(4)}` : '—'} highlight />
        </div>
      </div>

      {!isActive && stats && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Comparative Estimates — Same Task
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <CompareCard
              title="Agentic AI"
              badge="THIS RUN"
              badgeColor="bg-emerald-100 text-emerald-700"
              borderColor="border-emerald-300"
              bgColor="bg-emerald-50"
              time={`${displayTime}s`}
              cost={`$${(stats.estimated_cost_usd ?? 0).toFixed(4)}`}
            />
            <CompareCard
              title="Traditional Systems (Non-AI)"
              badge="ESTIMATED"
              badgeColor="bg-amber-100 text-amber-700"
              borderColor="border-amber-300"
              bgColor="bg-amber-50"
              time={tradLabel}
              cost={`$${Number(tradCost).toLocaleString()}`}
            />
            <CompareCard
              title="Manual Human Effort"
              badge="ESTIMATED"
              badgeColor="bg-red-100 text-red-700"
              borderColor="border-red-300"
              bgColor="bg-red-50"
              time={manualLabel}
              cost={`$${Number(manualCost).toLocaleString()}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({ icon, label, value, highlight, mono }: { icon: string; label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-thermax-slate uppercase tracking-wide mb-0.5">
        <span className="text-xs">{icon}</span> {label}
      </div>
      <div className={`font-bold ${highlight ? 'text-thermax-saffronDeep' : 'text-thermax-navy'} ${mono ? 'font-mono text-[10px]' : 'text-[14px]'}`}>{value}</div>
    </div>
  );
}

function CompareCard({ title, badge, badgeColor, borderColor, bgColor, time, cost }: {
  title: string; badge: string; badgeColor: string; borderColor: string; bgColor: string; time: string; cost: string;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-thermax-navy">{title}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>{badge}</span>
      </div>
      <div className="space-y-1 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span>⏱️</span>
          <span className="text-thermax-slate">Time:</span>
          <span className="font-bold text-thermax-navy">{time}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>💰</span>
          <span className="text-thermax-slate">Cost:</span>
          <span className="font-bold text-thermax-navy">{cost}</span>
        </div>
      </div>
    </div>
  );
}

function SystemPromptViewer({ prompt, agentName }: { prompt: string; agentName: string }) {
  const [open, setOpen] = useState(false);
  const displayPrompt = prompt.replace(/Claude|claude-opus-4-7/gi, 'AI Agent');

  return (
    <div className="bg-thermax-navyDeep text-white rounded-t-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/80">
          <span className="text-thermax-saffron">◆</span>
          System Prompt (Loaded into {agentName})
        </div>
        <span className="text-[10px] font-semibold text-thermax-saffron tracking-wide">
          {open ? 'CLICK TO HIDE ▲' : 'CLICK TO VIEW ▼'}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 max-h-[300px] overflow-y-auto">
          <pre className="text-[11px] text-white/80 font-mono whitespace-pre-wrap leading-relaxed">{displayPrompt}</pre>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-thermax-slate">{label}</span>
      <span className={`text-thermax-navy text-right font-semibold ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</span>
    </div>
  );
}

function MessageBubble({ role, content, streaming: isStreaming }: { role: Role; content: string; streaming?: boolean }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-thermax-navy text-white rounded-lg rounded-tr-sm px-4 py-2.5 text-[13px] whitespace-pre-wrap">{content}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] bg-thermax-mist border border-thermax-line rounded-lg rounded-tl-sm px-4 py-3 text-[13px] w-full">
        <div className="text-[10px] font-mono text-thermax-saffronDeep mb-1">◆ AI Agent · Agentic</div>
        <Markdown>{content}</Markdown>
        {isStreaming && (
          <div className="mt-2 h-1 w-24 bg-thermax-line rounded-full overflow-hidden">
            <div className="h-full bg-thermax-saffron rounded-full animate-shimmer" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
}

interface ProgressState { percent: number; label: string; }

function computeProgress(events: ToolEvent[], totalTools: number, textStarted: boolean, isStreaming: boolean): ProgressState {
  if (!isStreaming) return { percent: 0, label: '' };
  if (totalTools === 0) return textStarted ? { percent: 80, label: 'Generating response...' } : { percent: 10, label: 'Sending to AI Agent...' };

  const starts = events.filter((e) => e.type === 'start').length;
  const results = events.filter((e) => e.type === 'result').length;
  const toolSlice = 80 / totalTools;
  const halfSlice = toolSlice / 2;
  let percent = 5 + results * toolSlice + (starts - results) * halfSlice;
  if (textStarted) percent = Math.max(percent, 95);
  percent = Math.min(percent, 99);

  let label = 'Initialising agent...';
  if (textStarted) label = 'Composing final analysis...';
  else if (results === totalTools) label = 'All tools complete — generating report...';
  else if (starts > 0) label = `Running tool ${results + 1} of ${totalTools}...`;
  else label = 'Sending to AI Agent...';

  return { percent: Math.round(percent), label };
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex-1 flex items-center gap-3">
      <div className="flex-1 max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-thermax-navy">Agent Progress</span>
          <span className="text-[11px] font-mono font-bold text-thermax-saffronDeep">{percent}%</span>
        </div>
        <div className="h-2 w-full bg-thermax-mist border border-thermax-line rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #002B5B, #FF7A1A)' }} />
        </div>
        <div className="mt-0.5 text-[10px] text-thermax-slate font-mono truncate">{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ stage }: { stage: { title: string; icon: string; outputHint: string; agent: { name: string }; tools: StageTool[]; } }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="text-5xl mb-3">{stage.icon}</div>
      <h3 className="text-lg font-bold text-thermax-navy">{stage.title}</h3>
      <p className="text-[13px] text-thermax-slate max-w-md mt-2 leading-relaxed">{stage.agent.name}</p>
      <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-thermax-navy bg-thermax-mist border border-thermax-line rounded-lg px-4 py-2.5">
        <span className="text-thermax-saffron font-bold">AGENTIC</span>
        <span>{stage.tools.length} tools · multi-step loop · Agent calls each tool autonomously</span>
      </div>
      <div className="mt-5 max-w-md text-[12px] bg-thermax-mist border border-thermax-line rounded-lg p-3 text-left">
        <div className="font-semibold text-thermax-navy mb-1">Expected output</div>
        <div className="text-thermax-slate">{stage.outputHint}</div>
      </div>
    </div>
  );
}
