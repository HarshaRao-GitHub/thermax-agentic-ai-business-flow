'use client';

import { useEffect, useRef, useState } from 'react';
import Markdown from './Markdown';
import { recordCustomAgentRun, type CustomAgent as Agent } from '@/lib/client-store';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }
interface UploadedFile { filename: string; text: string; truncated: boolean; }
interface ToolEvent { type: 'start' | 'result'; tool: string; input?: Record<string, unknown>; result?: string; timestamp: number; }
interface UsageStats { input_tokens?: number; output_tokens?: number; total_tokens?: number; tool_calls?: number; api_turns?: number; model?: string; response_time_s?: number; estimated_cost_usd?: number; }

export default function CustomAgentChat({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | null>(null);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [textStreamStarted, setTextStreamStarted] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const transcript: ChatMessage[] =
    streaming && streamBuffer
      ? [...messages, { role: 'assistant', content: streamBuffer }]
      : messages;

  const totalTasks = agent.tasks.length || 1;
  const completedTools = toolEvents.filter(e => e.type === 'result').length;
  const pct = streaming
    ? textStreamStarted ? 80 + Math.min(20, completedTools) : Math.min(75, (completedTools / totalTasks) * 75)
    : 0;
  const progressLabel = streaming
    ? textStreamStarted ? 'Generating response...' : `Processing tasks (${completedTools}/${totalTasks})...`
    : '';

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
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
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTimer(parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1)));
    }, 100);

    try {
      recordCustomAgentRun(agent.id);
      const res = await fetch(`/api/custom-agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          uploadedTexts: uploadedFiles.map(f => ({ filename: f.filename, text: f.text })),
          agentConfig: {
            name: agent.name,
            description: agent.description,
            instructions: agent.instructions,
            tasks: agent.tasks,
            baseDocuments: agent.baseDocuments,
            acceptedFiles: agent.acceptedFiles,
          }
        })
      });

      const headerMode = res.headers.get('X-Workbench-Mode');
      if (headerMode === 'live') setMode('live');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventName = '';
          let dataStr = '';
          for (const l of lines) {
            if (l.startsWith('event: ')) eventName = l.slice(7);
            else if (l.startsWith('data: ')) dataStr = l.slice(6);
          }
          if (!eventName || !dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventName === 'text_delta') {
              if (!textStreamStarted) setTextStreamStarted(true);
              assembled += data;
              setStreamBuffer(assembled);
            } else if (eventName === 'tool_start') {
              setToolEvents(prev => [...prev, { type: 'start', tool: data.tool, input: data.input, timestamp: Date.now() }]);
            } else if (eventName === 'tool_result') {
              setToolEvents(prev => [...prev, { type: 'result', tool: data.tool, result: data.result, timestamp: Date.now() }]);
            } else if (eventName === 'usage') {
              setUsageStats(data);
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages([...next, { role: 'assistant', content: assembled }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }]);
    } finally {
      setStreaming(false);
      setStreamBuffer('');
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); return; }
      const newFiles: UploadedFile[] = (data.files ?? []).map((f: UploadedFile) => ({
        filename: f.filename, text: f.text, truncated: f.truncated
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      if (data.errors?.length) setUploadError(data.errors.join('; '));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="space-y-4">
        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">Agent Profile</h3>
          <div className="space-y-1.5 text-[12px]">
            <SideField label="Name" value={agent.name} />
            <SideField label="ID" value={agent.id} mono />
            <SideField label="Mode" value="Standalone Agent" />
          </div>
          <p className="text-[11px] text-thermax-slate mt-2 leading-snug">{agent.description}</p>
        </section>

        {agent.tasks.length > 0 && (
          <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
              Agent Tasks ({agent.tasks.length})
            </h3>
            <div className="space-y-1.5">
              {agent.tasks.map(t => (
                <div key={t.id} className="p-2 rounded-lg bg-thermax-mist border border-thermax-line">
                  <div className="font-semibold text-thermax-navy text-[11px]">{t.label}</div>
                  {t.description && <div className="text-thermax-slate text-[10px] leading-snug mt-0.5">{t.description}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {agent.baseDocuments && agent.baseDocuments.length > 0 && (
          <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
              Knowledge Base ({agent.baseDocuments.length})
            </h3>
            <div className="space-y-1.5">
              {agent.baseDocuments.map((d, i) => (
                <div key={i} className="p-2 rounded-lg bg-thermax-mist border border-thermax-line flex items-center gap-2">
                  <span className="text-sm">📄</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-thermax-navy text-[11px] truncate">{d.filename}</div>
                    <div className="text-thermax-slate text-[10px]">{d.sizeKb} KB</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-thermax-slate mt-2">These documents are always included in every conversation.</p>
          </section>
        )}

        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Upload Documents {uploadedFiles.length > 0 && <span className="text-thermax-saffron">({uploadedFiles.length})</span>}
          </h3>
          {agent.acceptedFiles && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-1.5">
                <span className="text-blue-600 text-[11px] mt-px shrink-0">ℹ️</span>
                <div>
                  <div className="text-[10px] font-semibold text-blue-800 mb-0.5">This agent accepts:</div>
                  <div className="text-[10px] text-blue-700 leading-snug">{agent.acceptedFiles}</div>
                </div>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.tsv,.log" onChange={handleUpload}
            className="text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-thermax-navy file:text-white file:font-semibold hover:file:bg-thermax-navyDeep file:cursor-pointer w-full" />
          <p className="text-[10px] text-thermax-slate mt-1">Select multiple files or upload in batches</p>
          {uploadedFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {uploadedFiles.map((f, idx) => (
                <div key={`${f.filename}-${idx}`} className="flex items-start justify-between gap-2 p-2 bg-thermax-mist rounded text-[11px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-thermax-navy truncate" title={f.filename}>{f.filename}</div>
                    <div className="text-thermax-slate">{(f.text.length / 1024).toFixed(1)} KB{f.truncated && ' (truncated)'}</div>
                  </div>
                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 font-bold text-sm shrink-0 leading-none mt-0.5" title="Remove">×</button>
                </div>
              ))}
              <button onClick={() => setUploadedFiles([])} className="text-[10px] text-thermax-saffronDeep font-semibold hover:underline">Remove all</button>
            </div>
          )}
          {uploadError && <div className="mt-2 text-[11px] text-red-600">{uploadError}</div>}
        </section>

        {usageStats && (
          <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">Session Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              <MetricTile label="Input Tokens" value={usageStats.input_tokens?.toLocaleString() ?? '—'} />
              <MetricTile label="Output Tokens" value={usageStats.output_tokens?.toLocaleString() ?? '—'} />
              <MetricTile label="Tasks Run" value={String(usageStats.tool_calls ?? 0)} />
              <MetricTile label="Response Time" value={`${usageStats.response_time_s ?? 0}s`} />
              <MetricTile label="Model" value={String(usageStats.model ?? '—').replace('enterprise-llm', 'LLM')} />
              <MetricTile label="Est. Cost" value={`$${usageStats.estimated_cost_usd ?? 0}`} />
            </div>
          </section>
        )}
      </aside>

      {/* Chat Area */}
      <section className="flex flex-col bg-white border border-thermax-line rounded-xl shadow-card min-h-[640px]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-thermax-line">
          {streaming ? (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-thermax-slate font-medium">{progressLabel}</span>
                <span className="text-[10px] font-mono text-thermax-slate">{elapsedTimer}s</span>
              </div>
              <div className="w-full h-2 bg-thermax-mist rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-thermax-navy to-thermax-saffron rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12px]">
              <span className={`inline-block w-2 h-2 rounded-full ${mode === 'live' ? 'bg-emerald-500' : 'bg-thermax-slate/40'}`} />
              <span className="font-mono text-thermax-slate">
                {mode === 'live' ? `Live · Enterprise LLM · ${agent.tasks.length} tasks` : 'Ready'}
              </span>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {transcript.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="font-bold text-thermax-navy text-sm mb-1">Chat with {agent.name}</h3>
              <p className="text-thermax-slate text-xs max-w-sm mb-4">{agent.description}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <QuickAction label="Run all tasks" onClick={() => send(`Execute all your configured tasks and provide a comprehensive analysis.`)} />
                {uploadedFiles.length > 0 && (
                  <QuickAction label="Analyze my files" onClick={() => send(`Analyze the ${uploadedFiles.length} uploaded document(s) according to your instructions.`)} />
                )}
                <QuickAction label="What can you do?" onClick={() => send(`Explain your capabilities, tasks, and what types of documents you can process.`)} />
              </div>
            </div>
          )}

          {/* Tool Events */}
          {toolEvents.length > 0 && (
            <div className="bg-thermax-mist rounded-xl p-3 border border-thermax-line">
              <div className="text-[10px] font-bold uppercase text-thermax-slate mb-2">Task Execution</div>
              <div className="space-y-1">
                {toolEvents.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className={ev.type === 'start' ? 'text-amber-500' : 'text-emerald-500'}>
                      {ev.type === 'start' ? '⏳' : '✅'}
                    </span>
                    <span className="font-mono font-semibold text-thermax-navy">{ev.tool}</span>
                    <span className="text-thermax-slate">
                      {ev.type === 'start' ? 'processing...' : 'complete'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transcript.map((msg, i) => (
            <CustomChatBubble
              key={i}
              message={msg}
              isStreaming={streaming && msg.role === 'assistant' && i === transcript.length - 1}
            />
          ))}

          {streaming && !streamBuffer && (
            <div className="flex justify-start">
              <div className="bg-thermax-mist rounded-2xl rounded-tl-md px-4 py-3 text-sm border border-thermax-line">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-thermax-navy/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-thermax-navy/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-thermax-navy/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-thermax-line bg-thermax-mist/30">
          {uploadedFiles.length > 0 && (
            <div className="mb-2 text-[10px] text-thermax-slate font-mono">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} attached · {agent.tasks.length} task{agent.tasks.length !== 1 ? 's' : ''} configured
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={`Ask ${agent.name} anything...`}
              disabled={streaming}
              className="flex-1 px-4 py-2.5 border border-thermax-line rounded-xl text-sm focus:ring-2 focus:ring-thermax-navy/20 focus:border-thermax-navy outline-none disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="px-5 py-2.5 bg-thermax-navy text-white rounded-xl font-semibold text-sm hover:bg-thermax-navyDeep transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {streaming ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SideField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-thermax-slate text-[11px]">{label}</span>
      <span className={`text-thermax-navy font-semibold text-[11px] truncate max-w-[160px] ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-thermax-mist rounded-lg p-2 text-center">
      <div className="text-xs font-bold text-thermax-navy">{value}</div>
      <div className="text-[9px] text-thermax-slate mt-0.5">{label}</div>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 bg-thermax-navy/5 border border-thermax-navy/10 rounded-lg text-xs text-thermax-navy font-medium hover:bg-thermax-navy/10 transition"
    >
      {label}
    </button>
  );
}

function CustomChatBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-thermax-navy text-white rounded-tr-md">
          {message.content}
        </div>
      </div>
    );
  }

  const preview = message.content.slice(0, 180).replace(/\n/g, ' ');
  const showCollapse = !isStreaming && message.content.length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-thermax-mist text-thermax-navy rounded-tl-md border border-thermax-line w-full">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-1 group cursor-pointer"
        >
          <span className="text-[10px] font-mono text-thermax-saffronDeep uppercase tracking-wider">AI Agent</span>
          {showCollapse && (
            <span className="text-[10px] font-bold text-thermax-slate group-hover:text-thermax-saffronDeep tracking-wide transition">
              {expanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
            </span>
          )}
        </button>

        {isStreaming || expanded ? (
          <Markdown>{message.content}</Markdown>
        ) : (
          <div className="text-thermax-slate text-xs leading-relaxed cursor-pointer" onClick={() => setExpanded(true)}>
            {preview}{message.content.length > 180 ? '...' : ''}
            <span className="ml-2 text-thermax-saffronDeep font-semibold">Click to expand</span>
          </div>
        )}
      </div>
    </div>
  );
}
