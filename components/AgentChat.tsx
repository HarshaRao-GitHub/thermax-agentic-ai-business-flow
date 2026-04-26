'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Stage } from '@/data/stages';
import type { StageTool } from '@/data/stages';
import Markdown from './Markdown';
import ApprovalPanel from './ApprovalPanel';
import type { HitlEvent } from './ApprovalPanel';
import { useWorkflow } from './WorkflowContext';
import { getStageResult, saveStageResult, getUpstreamResults } from '@/lib/client-store';
import { sampleFilesByStage, type SampleFile } from '@/data/sample-files';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }
interface UploadedFile { filename: string; text: string; truncated: boolean; }
interface ToolEvent { type: 'start' | 'result'; tool: string; input?: Record<string, unknown>; result?: string; timestamp: number; }
interface UsageStats { input_tokens?: number; output_tokens?: number; total_tokens?: number; tool_calls?: number; api_turns?: number; model?: string; response_time_s?: number; estimated_cost_usd?: number; }
interface DataViewerState { open: boolean; title: string; content: string; loading: boolean; pdfUrl?: string; }
interface UserPromptState { text: string; saved: boolean; validating: boolean; error: string | null; }

export default function AgentChat({
  stage,
  isGovernance = false
}: {
  stage: { slug: string; title: string; icon: string; tools: StageTool[]; systemPrompt: string; starterPrompt: string; outputHint: string; agent: { name: string; shortId: string; modelStack: string; description: string; }; dataSources: { file: string; label: string; folder: string; rowEstimate: number; description: string; fileType?: string; }[]; } & Partial<Stage>;
  isGovernance?: boolean;
}) {
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
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null);
  const [hitlDecision, setHitlDecision] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [loadingSampleFiles, setLoadingSampleFiles] = useState<Set<string>>(new Set());
  const [dataViewer, setDataViewer] = useState<DataViewerState>({ open: false, title: '', content: '', loading: false });
  const [userPrompt, setUserPrompt] = useState<UserPromptState>({ text: '', saved: false, validating: false, error: null });
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const isServiceCopilot = stage.slug === 'service-troubleshooting';
  const isEngineeringDesign = stage.slug === 'engineering-design';
  const [copilotMessages, setCopilotMessages] = useState<ChatMessage[]>([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotStreaming, setCopilotStreaming] = useState(false);
  const [copilotStreamBuffer, setCopilotStreamBuffer] = useState('');
  const [copilotElapsed, setCopilotElapsed] = useState(0);
  const copilotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copilotStreamRef = useRef<HTMLDivElement>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const streamThrottleRef = useRef<number>(0);
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

  useEffect(() => {
    if (copilotStreamRef.current) {
      copilotStreamRef.current.scrollTop = copilotStreamRef.current.scrollHeight;
    }
  }, [copilotMessages.length, copilotStreamBuffer]);

  async function sendCopilot(textOverride?: string) {
    const text = (textOverride ?? copilotInput).trim();
    if (!text || copilotStreaming) return;
    const next: ChatMessage[] = [...copilotMessages, { role: 'user', content: text }];
    setCopilotMessages(next);
    setCopilotInput('');
    setCopilotStreaming(true);
    setCopilotStreamBuffer('');
    setCopilotElapsed(0);
    const t0 = Date.now();
    copilotTimerRef.current = setInterval(() => {
      setCopilotElapsed(parseFloat(((Date.now() - t0) / 1000).toFixed(1)));
    }, 100);

    try {
      const res = await fetch('/api/chat-agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: stage.slug,
          messages: next,
          uploadedTexts: uploadedFiles.map(f => ({ filename: f.filename, text: f.text })),
        })
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed');
        setCopilotMessages([...next, { role: 'assistant', content: `*Error: ${errText}*` }]);
        return;
      }

      const reader = res.body.getReader();
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
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'text_delta') {
                assembled += data;
                setCopilotStreamBuffer(assembled);
              } else if (currentEvent === 'error') {
                assembled += `\n\n*Error: ${data?.message ?? 'Unknown error'}*`;
                setCopilotStreamBuffer(assembled);
              }
            } catch { /* skip */ }
            currentEvent = '';
          }
        }
      }
      setCopilotMessages([...next, { role: 'assistant', content: assembled }]);
    } catch (err) {
      setCopilotMessages([...next, { role: 'assistant', content: `*Error: ${err instanceof Error ? err.message : 'Unknown'}*` }]);
    } finally {
      setCopilotStreaming(false);
      setCopilotStreamBuffer('');
      if (copilotTimerRef.current) { clearInterval(copilotTimerRef.current); copilotTimerRef.current = null; }
    }
  }

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
      const upstreamResults = getUpstreamResults(stage.slug);

      const res = await fetch('/api/chat-agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: stage.slug,
          messages: next,
          uploadedTexts: uploadedFiles.map(f => ({ filename: f.filename, text: f.text })),
          ...(userPrompt.saved && userPrompt.text.trim() ? { customSystemPrompt: undefined, userCustomPrompt: userPrompt.text.trim() } : {}),
          ...(upstreamResults.length > 0 ? { upstreamResults } : {}),
        })
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
      setTimeout(() => persistResult(), 500);
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
              case 'tool_start':
                setToolEvents((prev) => [...prev, { type: 'start', tool: data.tool, input: data.input, timestamp: Date.now() }]);
                break;
              case 'tool_result':
                setToolEvents((prev) => [...prev, { type: 'result', tool: data.tool, result: data.result, timestamp: Date.now() }]);
                break;
              case 'text_delta':
                if (!assembled) setTextStreamStarted(true);
                assembled += data;
                if (!streamThrottleRef.current) {
                  streamThrottleRef.current = requestAnimationFrame(flushStream);
                }
                break;
              case 'usage':
              case 'usage_delta':
                setUsageStats(data as UsageStats);
                break;
              case 'hitl_required':
                setHitlEvent(data as HitlEvent);
                break;
              case 'error':
                assembled += `\n\n*Error: ${data?.message ?? 'Unknown error'}*`;
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
    if (streamThrottleRef.current) cancelAnimationFrame(streamThrottleRef.current);
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

  const MAX_UPLOAD_FILES = 10;
  const MAX_UPLOAD_SIZE_MB = 100;
  const fileInputAccept = isEngineeringDesign
    ? '.txt,.md,.csv,.tsv,.log,.pdf,.doc,.docx,.xls,.xlsx,.json,.xml,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,.gif'
    : '.txt,.md,.csv,.tsv,.log,.pdf,.doc,.docx,.xls,.xlsx,.json,.xml';

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    const currentCount = uploadedFiles.length;
    if (currentCount >= MAX_UPLOAD_FILES) {
      setUploadError(`Maximum ${MAX_UPLOAD_FILES} uploaded files allowed. Remove existing files first.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const allowed = MAX_UPLOAD_FILES - currentCount;
    if (files.length > allowed) {
      setUploadError(`You can upload ${allowed} more file${allowed > 1 ? 's' : ''} (limit: ${MAX_UPLOAD_FILES} total). You selected ${files.length}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        setUploadError(`"${files[i].name}" exceeds the ${MAX_UPLOAD_SIZE_MB} MB size limit (${(files[i].size / 1024 / 1024).toFixed(1)} MB).`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

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
      const truncated = text.length > 2_000_000;
      setUploadedFiles(prev => [...prev, {
        filename: sf.filename,
        text: truncated ? text.slice(0, 2_000_000) : text,
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

  async function viewDataBackbone(ds: { file: string; label: string; folder: string; fileType?: string }) {
    setDataViewer({ open: true, title: ds.label, content: '', loading: true, pdfUrl: undefined });

    const isPdf = ds.fileType === 'pdf' || ds.file.endsWith('.pdf');

    if (isPdf) {
      const pdfFile = ds.file.endsWith('.pdf') ? ds.file : ds.file.replace(/\.txt$/i, '.pdf');
      const candidatePdfUrls = [
        `/data-backbone/${ds.folder}/${pdfFile}`,
        `/sample-data/${ds.folder}/${pdfFile}`,
      ];
      for (const url of candidatePdfUrls) {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) {
            setDataViewer({ open: true, title: `${ds.label} (${pdfFile})`, content: '', loading: false, pdfUrl: url });
            return;
          }
        } catch { /* try next */ }
      }
      setDataViewer(prev => ({ ...prev, content: 'Error: Could not load PDF file.', loading: false }));
      return;
    }

    const candidateUrls = [
      `/data-backbone/${ds.folder}/${ds.file}`,
      `/sample-data/${ds.folder}/${ds.file}`,
    ];

    let text = '';
    let loaded = false;
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          text = await res.text();
          loaded = true;
          break;
        }
      } catch { /* try next */ }
    }

    if (!loaded) {
      setDataViewer(prev => ({ ...prev, content: 'Error: Could not load this file.', loading: false }));
      return;
    }

    try {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 0 && ds.file.endsWith('.csv')) {
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
        setDataViewer({ open: true, title: `${ds.label} (${ds.file}) — ${dataRows.length} rows`, content: `| ${header} |\n| ${sep} |\n${rowLines.map(r => `| ${r} |`).join('\n')}`, loading: false });
      } else {
        setDataViewer({ open: true, title: `${ds.label} (${ds.file})`, content: text, loading: false });
      }
    } catch {
      setDataViewer(prev => ({ ...prev, content: 'Error: Could not load this file.', loading: false }));
    }
  }

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

  async function validateAndSavePrompt() {
    const text = userPrompt.text.trim();
    if (!text) { setUserPrompt(prev => ({ ...prev, error: 'Prompt cannot be empty.', saved: false })); return; }
    setUserPrompt(prev => ({ ...prev, validating: true, error: null, saved: false }));
    try {
      const res = await fetch('/api/validate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          agentName: stage.agent.name,
          agentDescription: stage.agent.description,
          stageTitle: stage.title,
          acceptedFileHint: (stage as Stage).acceptedFileHint ?? '',
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setUserPrompt(prev => ({ ...prev, saved: true, validating: false, error: null }));
      } else {
        setUserPrompt(prev => ({ ...prev, saved: false, validating: false, error: data.reason || 'Prompt rejected — not relevant to this agent.' }));
      }
    } catch {
      setUserPrompt(prev => ({ ...prev, saved: false, validating: false, error: 'Validation failed — please try again.' }));
    }
  }

  return (
    <>
    {dataViewer.open && (
      <div className="fixed inset-0 z-50 flex items-stretch bg-black/50 backdrop-blur-sm p-3 sm:p-5" onClick={() => setDataViewer({ open: false, title: '', content: '', loading: false })}>
        <div className="bg-white rounded-xl shadow-2xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-thermax-line bg-thermax-mist rounded-t-xl shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">{dataViewer.pdfUrl ? '📄' : '📊'}</span>
              <h3 className="font-bold text-thermax-navy text-[14px] truncate">{dataViewer.title}</h3>
              <span className="text-[10px] font-mono text-thermax-slate bg-white px-2 py-0.5 rounded border border-thermax-line shrink-0">VIEW ONLY</span>
            </div>
            <button onClick={() => setDataViewer({ open: false, title: '', content: '', loading: false })}
              className="text-thermax-slate hover:text-thermax-navy text-xl font-bold px-2 shrink-0">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
            {dataViewer.loading ? (
              <div className="flex items-center justify-center h-40 text-thermax-slate">
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
                          <thead className="bg-thermax-navy text-white sticky top-0 z-10">
                            <tr>{cells[0].map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-thermax-navy/30">{h}</th>)}</tr>
                          </thead>
                        )}
                        <tbody>
                          {cells.slice(1).map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-thermax-mist/50'}>
                              {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 border-r border-b border-thermax-line whitespace-nowrap" title={cell}>{cell}</td>)}
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
                <pre className="text-[13px] font-mono text-thermax-navy bg-thermax-mist rounded-lg p-5 whitespace-pre-wrap leading-relaxed min-h-full">{dataViewer.content}</pre>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-thermax-line bg-thermax-mist rounded-b-xl flex justify-end shrink-0">
            {dataViewer.pdfUrl && (
              <a href={dataViewer.pdfUrl} download target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-semibold text-thermax-navy hover:text-thermax-saffronDeep px-3 py-1.5 border border-thermax-line rounded-md hover:bg-white mr-2">
                📥 Download PDF
              </a>
            )}
            {!dataViewer.pdfUrl && (
              <button onClick={() => { try { navigator.clipboard.writeText(dataViewer.content); } catch { /* clipboard not available */ } }}
                className="text-[11px] font-semibold text-thermax-navy hover:text-thermax-saffronDeep px-3 py-1.5 border border-thermax-line rounded-md hover:bg-white mr-2">
                📋 Copy
              </button>
            )}
            <button onClick={() => setDataViewer({ open: false, title: '', content: '', loading: false })}
              className="text-[11px] font-semibold bg-thermax-navy text-white px-4 py-1.5 rounded-md hover:bg-thermax-navyDeep">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4">
        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">Agent Profile</h3>
          <div className="space-y-1.5 text-[12px]">
            <Field label="Agent" value={stage.agent.name} />
            {stage.agent.persona && <Field label="Persona" value={stage.agent.persona} />}
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
              <div key={t.name} className="rounded-lg bg-thermax-mist border border-thermax-line overflow-hidden">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{t.icon}</span>
                      <span className="font-mono text-thermax-navy font-semibold text-[11px]">{t.name}</span>
                    </div>
                    <button
                      onClick={() => setExpandedTool(expandedTool === t.name ? null : t.name)}
                      className="text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition"
                    >👁 {expandedTool === t.name ? 'Hide' : 'View'}</button>
                  </div>
                  <div className="text-thermax-slate text-[10px] leading-snug">{t.description}</div>
                </div>
                {expandedTool === t.name && (
                  <ToolDetailView tool={t} agentName={stage.agent.name} />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Data Backbone ({stage.dataSources.length} sources)
          </h3>
          <div className="space-y-2">
            {stage.dataSources.map((ds) => {
              const ft = ds.fileType ?? (ds.file.endsWith('.json') ? 'json' : ds.file.endsWith('.txt') ? 'txt' : 'csv');
              const ftColors: Record<string, string> = {
                csv: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                json: 'bg-violet-100 text-violet-800 border-violet-300',
                txt: 'bg-amber-100 text-amber-800 border-amber-300',
                pdf: 'bg-red-100 text-red-800 border-red-300',
                xlsx: 'bg-blue-100 text-blue-800 border-blue-300',
              };
              return (
              <div key={ds.file} className="p-2 rounded-lg bg-thermax-mist border border-thermax-line">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${ftColors[ft] ?? ftColors.csv}`}>{ft}</span>
                    <span className="text-thermax-navy font-semibold text-[11px]">{ds.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => viewDataBackbone(ds)}
                      className="text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition"
                    >👁 View</button>
                    {ds.rowEstimate > 1 && <span className="text-thermax-saffronDeep font-mono font-bold text-[10px]">{ds.rowEstimate} {ds.fileType === 'pdf' ? 'pages' : 'rows'}</span>}
                    {ds.rowEstimate <= 1 && <span className="text-thermax-slate font-mono font-bold text-[10px]">config</span>}
                  </div>
                </div>
                <div className="text-thermax-slate text-[10px] leading-snug">{ds.description}</div>
              </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">
            Upload Documents {uploadedFiles.length > 0 && <span className="text-thermax-saffron">({uploadedFiles.length})</span>}
          </h3>
          {stage.acceptedFileHint && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-1.5">
                <span className="text-blue-600 text-[11px] mt-px shrink-0">ℹ</span>
                <div>
                  <div className="text-[10px] font-semibold text-blue-800 mb-0.5">This agent accepts:</div>
                  <div className="text-[10px] text-blue-700 leading-snug">{stage.acceptedFileHint}</div>
                </div>
              </div>
            </div>
          )}

          {sampleFiles.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-thermax-navy">
                  Available Data Files ({sampleFiles.length})
                </div>
                {sampleFiles.some(sf => !uploadedFiles.some(f => f.filename === sf.filename)) && (
                  <button
                    onClick={loadAllSampleFiles}
                    disabled={streaming}
                    className="text-[10px] font-semibold text-thermax-saffronDeep hover:underline disabled:opacity-40"
                  >
                    Select All
                  </button>
                )}
              </div>
              <p className="text-[9px] text-thermax-slate mb-1.5">Click to select files for this agent</p>
              <div className="space-y-1">
                {sampleFiles.map((sf) => {
                  const isLoaded = uploadedFiles.some(f => f.filename === sf.filename);
                  const isLoading = loadingSampleFiles.has(sf.filename);
                  return (
                    <div key={sf.filename} className={`px-2.5 py-2 rounded-lg border transition-all ${
                        isLoaded
                          ? 'bg-emerald-50 border-emerald-200'
                          : isLoading
                          ? 'bg-blue-50 border-blue-200 animate-pulse'
                          : 'bg-thermax-mist border-thermax-line'
                      }`}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadSampleFile(sf)}
                          disabled={isLoaded || isLoading || streaming}
                          className={`flex items-center gap-2 min-w-0 flex-1 text-left ${!isLoaded && !isLoading ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className="text-[12px] shrink-0">{isLoaded ? '✅' : isLoading ? '⏳' : '📄'}</span>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[11px] font-semibold truncate flex items-center gap-1.5 ${isLoaded ? 'text-emerald-700' : 'text-thermax-navy'}`}>
                              {(() => {
                                const ext = sf.fileType ?? (sf.filename.endsWith('.json') ? 'json' : sf.filename.endsWith('.txt') ? 'txt' : 'csv');
                                const c: Record<string, string> = { csv: 'bg-emerald-100 text-emerald-700', json: 'bg-violet-100 text-violet-700', txt: 'bg-amber-100 text-amber-700' };
                                return <span className={`text-[7px] font-bold uppercase px-1 py-px rounded ${c[ext] ?? c.csv}`}>{ext}</span>;
                              })()}
                              {sf.label}
                            </div>
                            <div className="text-[9px] text-thermax-slate leading-snug truncate">{sf.description}</div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); viewSampleFile(sf); }}
                            className="text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition"
                          >👁 View</button>
                          {isLoaded && <span className="text-[8px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">LOADED</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-thermax-line pt-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-thermax-navy mb-1.5">
              Or Upload Your Own Files
            </div>
            {isEngineeringDesign && (
              <p className="text-[9px] text-thermax-slate leading-snug mb-1.5">
                <span className="font-semibold text-thermax-navy">Engineering drawings and technical references: </span>
                upload PDFs, text or CSV companion extracts, and optional raster images (filename and size are passed through; this POC does not run OCR on images — the agent uses backbone extraction tools and your text).
              </p>
            )}
            <input ref={fileInputRef} type="file" multiple accept={fileInputAccept} onChange={handleUpload}
              disabled={uploadedFiles.length >= MAX_UPLOAD_FILES}
              className="text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-thermax-navy file:text-white file:font-semibold hover:file:bg-thermax-navyDeep file:cursor-pointer w-full disabled:opacity-40" />
            <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-[10px] text-amber-800 leading-snug space-y-0.5">
                <div className="font-semibold">Upload Limits:</div>
                <div>• Max <strong>{MAX_UPLOAD_FILES} files</strong> per session ({uploadedFiles.length}/{MAX_UPLOAD_FILES} used)</div>
                <div>• Max <strong>{MAX_UPLOAD_SIZE_MB} MB</strong> per file</div>
                <div>• Formats: PDF, DOC/DOCX, CSV, TXT, MD, TSV, XLS/XLSX, JSON, XML{isEngineeringDesign && ', PNG, JPG, JPEG, BMP, TIFF, WebP, GIF'}</div>
              </div>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-3 border-t border-thermax-line pt-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Selected Files ({uploadedFiles.length})
                </div>
                <button
                  onClick={() => setUploadedFiles([])}
                  className="text-[10px] text-red-500 font-semibold hover:underline"
                >Remove all</button>
              </div>
              <div className="space-y-1">
                {uploadedFiles.map((f, idx) => (
                  <div key={`${f.filename}-${idx}`} className="flex items-start justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px]">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-emerald-800 truncate" title={f.filename}>{f.filename}</div>
                      <div className="text-emerald-600 text-[10px]">{(f.text.length / 1024).toFixed(1)} KB{f.truncated && ' (truncated)'}</div>
                    </div>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 font-bold text-sm shrink-0 leading-none mt-0.5"
                      title="Remove file"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {uploadError && <div className="mt-2 text-[11px] text-red-600">{uploadError}</div>}
        </section>
      </aside>

      <section ref={streamRef} className="space-y-4 overflow-y-auto">

        {/* ── SECTION 0: System Prompt + Custom Prompt + Run Agent ── */}
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <SystemPromptViewer prompt={stage.systemPrompt} agentName={stage.agent.name} />
          <UserPromptEditor
            userPrompt={userPrompt}
            onChange={(text) => setUserPrompt({ text, saved: false, validating: false, error: null })}
            onSave={validateAndSavePrompt}
            onClear={() => setUserPrompt({ text: '', saved: false, validating: false, error: null })}
            agentName={stage.agent.name}
          />
          <div className="flex items-center justify-between px-5 py-3 border-t border-thermax-line">
            <div className="flex items-center gap-3">
              <button onClick={() => send(stage.starterPrompt)} disabled={streaming}
                className="text-[12px] font-semibold bg-thermax-navy text-white px-4 py-2 rounded-md hover:bg-thermax-navyDeep disabled:opacity-40 transition">
                ▶ Run {stage.title} Agent
              </button>
              <div className="flex items-center gap-2 text-[12px]">
                <span className={`inline-block w-2 h-2 rounded-full ${mode === 'live' ? 'bg-emerald-500' : 'bg-thermax-slate/40'}`} />
                <span className="font-mono text-thermax-slate">
                  {mode === 'live' ? `Live · Enterprise LLM · ${stage.tools.length} tools` : 'Ready'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && !streaming && (
                <button onClick={() => { try { navigator.clipboard.writeText(messages.filter(m => m.role === 'assistant')[0]?.content ?? ''); } catch { /* clipboard not available */ } }}
                  className="text-[11px] font-semibold text-thermax-navy hover:text-thermax-saffronDeep px-2 py-1">Copy Result</button>
              )}
              <button onClick={reset} disabled={streaming}
                className="text-[11px] font-semibold text-thermax-slate hover:text-thermax-navy px-2 py-1 disabled:opacity-40">Reset</button>
            </div>
          </div>
          {streaming && (
            <div className="px-5 pb-3">
              <ProgressBar percent={progress.percent} label={progress.label} />
            </div>
          )}
          <div className="px-5 pb-2 text-[11px] text-thermax-slate font-mono">
            {stage.dataSources.length} data source(s) · {stage.tools.length} tools · agentic mode
            {uploadedFiles.length > 0 && ` · ${uploadedFiles.length} uploaded document${uploadedFiles.length > 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── SECTION 1: Agentic Session Metrics ── */}
        {(usageStats || streaming) && (transcript.length > 0 || toolEvents.length > 0) && (
          <CollapsibleSection sectionNumber="1" title="Agentic Session Metrics">
            <div className="p-4">
              <UsageCard stats={usageStats} elapsed={elapsedTimer} streaming={streaming} toolCount={stage.tools.length} />
            </div>
          </CollapsibleSection>
        )}

        {/* ── SECTION 2: Agent Processing Steps ── */}
        {toolEvents.length > 0 && (
          <CollapsibleSection
            sectionNumber="2"
            title="Agent Processing Steps"
            subtitle={`${buildToolPairs(toolEvents).filter(p => p.completed).length}/${buildToolPairs(toolEvents).length} completed`}
            liveIndicator={streaming}
          >
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
              {buildToolPairs(toolEvents).map((pair, i) => (
                <ToolCard key={i} pair={pair} tools={stage.tools} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* ── SECTION 3: Agent Results ── */}
        {(() => {
          const firstAssistant = transcript.find(m => m.role === 'assistant');
          const firstUserPrompt = transcript.find(m => m.role === 'user');
          if (!firstAssistant && !streaming) return null;
          if (!firstAssistant && streaming && !streamBuffer) return null;
          const isGenerating = streaming && firstUserPrompt && !firstAssistant;
          return (
            <CollapsibleSection
              sectionNumber="3"
              title="Agent Results"
              subtitle={isGenerating ? 'Generating...' : undefined}
            >
              <div className="max-h-[500px] overflow-y-auto">
                {firstUserPrompt && (
                  <div className="px-5 pt-3">
                    <MessageBubble role="user" content={firstUserPrompt.content} />
                  </div>
                )}
                {firstAssistant && (
                  <div className="px-5 py-3">
                    <MessageBubble role="assistant" content={firstAssistant.content}
                      streaming={streaming && transcript.filter(m => m.role === 'assistant').length === 1}
                      agentName={stage.agent.name} />
                  </div>
                )}
                {!firstAssistant && streaming && streamBuffer && (
                  <div className="px-5 py-3">
                    <MessageBubble role="assistant" content={streamBuffer} streaming={true}
                      agentName={stage.agent.name} />
                  </div>
                )}
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* ── SECTION 4: HITL Approval Gate ── */}
        {hitlEvent && !streaming && (
          <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-slate-50 to-sky-50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-slate-600 text-white px-2 py-0.5 rounded">4</span>
                <h3 className="text-[13px] font-bold text-thermax-navy">Human Review Gate</h3>
                <span className="text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">Awaiting Decision</span>
              </div>
            </div>
            <div className="p-4">
              <ApprovalPanel
                hitl={hitlEvent}
                stageSlug={stage.slug}
                originalResult={transcript.find(m => m.role === 'assistant')?.content}
                onDecision={(decision, detail) => {
                  setHitlDecision(`${decision}: ${detail}`);
                  setTimeout(() => {
                    persistResult();
                    refreshWorkflow();
                  }, 1000);
                }}
                onModifiedResult={(modifiedContent) => {
                  const existing = [...messages];
                  existing.push({ role: 'assistant', content: modifiedContent });
                  setMessages(existing);
                  setTimeout(() => persistResult(), 500);
                }}
              />
            </div>
          </div>
        )}
        {hitlDecision && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl shadow-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-teal-600">✓</span>
              <span className="text-[12px] font-bold text-teal-700">Review Decision Recorded</span>
            </div>
            <div className="text-[12px] text-teal-600">{hitlDecision}</div>
          </div>
        )}

        {/* ── SECTION 5: Chat / Q&A with Agent ── */}
        {messages.length > 0 && !streaming && (
          <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-violet-50 to-blue-50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded">5</span>
                <h3 className="text-[13px] font-bold text-thermax-navy">Chat / Q&A with {stage.agent.name}</h3>
                <span className="text-[10px] text-violet-600 font-mono">Ask follow-up questions about the results, data, or process</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
                  placeholder={`Ask the ${stage.agent.name} a follow-up question... (Ctrl/Cmd+Enter to send)`}
                  rows={3} disabled={streaming}
                  className="flex-1 border border-violet-200 rounded-md px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:bg-thermax-mist placeholder:text-violet-300" />
                <button onClick={() => send()} disabled={streaming || !input.trim()}
                  className="bg-violet-600 text-white font-semibold px-5 rounded-md hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Send
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-violet-500">
                Examples: &quot;What are the top risks?&quot; · &quot;Summarize the key findings&quot; · &quot;Explain the recommendations&quot; · &quot;Show me the data breakdown&quot;
              </p>
            </div>
          </div>
        )}

        {/* ── SECTION 6: Q&A Conversation History ── */}
        {(() => {
          const followUpMessages = transcript.slice(2);
          if (followUpMessages.length === 0) return null;
          return (
            <CollapsibleSection
              sectionNumber="6"
              title="Q&A Results"
              subtitle={`${Math.floor(followUpMessages.length / 2)} conversation(s)`}
              badgeColor="bg-violet-600"
              headerGradient="bg-gradient-to-r from-violet-50 to-blue-50"
            >
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                {followUpMessages.map((m, i) => (
                  <MessageBubble key={`qa-${i}`} role={m.role} content={m.content}
                    streaming={streaming && m.role === 'assistant' && i === followUpMessages.length - 1}
                    agentName={stage.agent.name} />
                ))}
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* ── Service Co-pilot Q&A (O&M Agent Only — Always Visible) ── */}
        {isServiceCopilot && (
          <div className="bg-white border border-emerald-200 rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛠️</span>
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-emerald-800">Service Co-pilot — AI Q&A</h3>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    Ask any question about Thermax O&M, troubleshooting, maintenance, spare parts, SOPs, or field service — powered by data backbone, tools, and uploaded documents
                  </p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active</span>
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Quick action buttons */}
              {copilotMessages.length === 0 && !copilotStreaming && (
                <div className="space-y-2">
                  <p className="text-[11px] text-emerald-700 font-semibold">Quick Actions:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Diagnose boiler tube failure', prompt: 'A 45 TPH AFBC boiler at a cement plant is experiencing tube failure in the superheater section. What are the possible root causes, diagnostic steps, and recommended corrective actions?' },
                      { label: 'AFBC startup procedure', prompt: 'Provide the standard cold startup procedure for a Thermax AFBC boiler including pre-checks, light-up sequence, bed heating, and coal feeding stages with safety interlocks.' },
                      { label: 'Spare parts for TF heater', prompt: 'What are the critical spare parts needed for a Thermax thermic fluid heater annual maintenance? Include part numbers, quantities, and lead times.' },
                      { label: 'Why-why analysis template', prompt: 'Help me conduct a 5-Why root cause analysis for recurring high stack temperature in an AFBC boiler. Guide me through each why level with possible causes.' },
                      { label: 'O&M contract SLA review', prompt: 'What are the standard SLA parameters for Thermax O&M contracts? Include availability targets, response times, penalty clauses, and performance guarantees.' },
                    ].map((qa, i) => (
                      <button key={i} onClick={() => sendCopilot(qa.prompt)}
                        className="text-[11px] px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition font-medium">
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation area */}
              {(copilotMessages.length > 0 || copilotStreaming) && (
                <div ref={copilotStreamRef} className="max-h-[400px] overflow-y-auto space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  {copilotMessages.map((m, i) => (
                    <CopilotBubble key={`copilot-${i}`} message={m}
                      isStreaming={false} agentName="Service Co-pilot" />
                  ))}
                  {copilotStreaming && copilotStreamBuffer && (
                    <CopilotBubble message={{ role: 'assistant', content: copilotStreamBuffer }}
                      isStreaming={true} agentName="Service Co-pilot" />
                  )}
                  {copilotStreaming && !copilotStreamBuffer && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 text-sm border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex gap-1">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                          <span className="text-[11px] text-emerald-600 font-mono">{copilotElapsed}s</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input area */}
              <div className="flex gap-2">
                <textarea value={copilotInput} onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendCopilot(); } }}
                  placeholder="Ask the Service Co-pilot anything about O&M, troubleshooting, maintenance, spare parts..."
                  rows={2} disabled={copilotStreaming}
                  className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-50 placeholder:text-emerald-300" />
                <button onClick={() => sendCopilot()} disabled={copilotStreaming || !copilotInput.trim()}
                  className="bg-emerald-600 text-white font-semibold px-5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm">
                  {copilotStreaming ? '...' : 'Ask'}
                </button>
              </div>
              <p className="text-[10px] text-emerald-500">
                Ctrl/Cmd+Enter to send · Uses {stage.dataSources.length} data sources, {stage.tools.length} tools{uploadedFiles.length > 0 ? `, ${uploadedFiles.length} uploaded file(s)` : ''} · Powered by {stage.agent.name}
              </p>
            </div>
          </div>
        )}

        {/* ── Empty state when nothing has run yet ── */}
        {transcript.length === 0 && toolEvents.length === 0 && !streaming && (
          <div className="bg-white border border-thermax-line rounded-xl shadow-card">
            <EmptyState stage={stage} />
          </div>
        )}

      </section>
    </div>
    </>
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

function UserPromptEditor({ userPrompt, onChange, onSave, onClear, agentName }: {
  userPrompt: UserPromptState;
  onChange: (text: string) => void;
  onSave: () => void;
  onClear: () => void;
  agentName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-thermax-line bg-gradient-to-r from-violet-50 to-blue-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-2 hover:bg-white/40 transition"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
          <span>✏️</span>
          Custom Prompt {userPrompt.saved && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded normal-case tracking-normal">ACTIVE</span>}
        </div>
        <span className="text-[10px] font-semibold text-violet-600 tracking-wide">
          {expanded ? 'HIDE ▲' : 'ADD YOUR OWN ▼'}
        </span>
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-[10px] text-violet-600 leading-snug">
            Add your own instructions to guide the {agentName}. Your prompt will be appended to the system prompt. Only domain-relevant prompts are accepted.
          </p>
          <textarea
            value={userPrompt.text}
            onChange={e => onChange(e.target.value)}
            placeholder={`e.g., "Focus on high-risk items and provide detailed recommendations for each..." or "Prioritize analysis by financial impact and include trend data..."`}
            rows={3}
            maxLength={50000}
            className="w-full border border-violet-200 rounded-lg px-3 py-2 text-[12px] resize-y focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 bg-white placeholder:text-violet-300"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                disabled={userPrompt.validating || !userPrompt.text.trim()}
                className="text-[11px] font-semibold bg-violet-600 text-white px-4 py-1.5 rounded-md hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {userPrompt.validating ? '⏳ Validating...' : userPrompt.saved ? '✅ Saved & Active' : '💾 Save'}
              </button>
              {(userPrompt.saved || userPrompt.text) && (
                <button onClick={onClear} className="text-[11px] font-semibold text-red-500 hover:text-red-700 px-2 py-1.5">
                  Clear
                </button>
              )}
            </div>
            <span className="text-[10px] text-violet-400 font-mono">{userPrompt.text.length}/50000</span>
          </div>
          {userPrompt.error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {userPrompt.error}
            </div>
          )}
          {userPrompt.saved && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ✅ Your custom prompt is active and will be included when you run the agent.
            </div>
          )}
        </div>
      )}
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

function MessageBubble({ role, content, streaming: isStreaming, agentName }: { role: Role; content: string; streaming?: boolean; agentName?: string }) {
  const [copied, setCopied] = useState(false);

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-thermax-navy text-white rounded-lg rounded-tr-sm px-4 py-2.5 text-[13px] whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  const handleDownload = () => {
    const slug = (agentName ?? 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${slug}-output-${ts}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        {!isStreaming && content && (
          <div className="mt-3 pt-2 border-t border-thermax-line/60 flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 text-[10px] text-thermax-slate/70 hover:text-thermax-navy font-medium px-2 py-1 rounded hover:bg-white/60 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-thermax-slate/70 hover:text-thermax-navy font-medium px-2 py-1 rounded hover:bg-white/60 transition"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-emerald-600 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
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

function ToolDetailView({ tool, agentName }: { tool: StageTool; agentName: string }) {
  const explanations: Record<string, { what: string; when: string; output: string }> = {
    scan_market_signals: { what: 'Scans 70+ market signals from industry conferences, analyst reports, regulatory changes, and competitor moves. It identifies new business opportunities for Thermax across all target sectors.', when: 'The agent calls this tool first to build a real-time picture of the market landscape — what companies are expanding, what regulations are changing, and where Thermax can win.', output: 'A ranked list of market opportunities with urgency scores, industry tags, and estimated deal values.' },
    generate_account_brief: { what: 'Takes the top market signals and enriches them with customer data — who the company is, what tier they belong to, past dealings with Thermax, and key contacts.', when: 'After scanning signals, the agent needs customer context. This tool provides the full background on each opportunity.', output: 'Detailed account briefs with company profiles, relationship history, and recommended approach.' },
    assess_signal_urgency: { what: 'Scores each market signal on urgency — how quickly Thermax needs to act. It considers deal timelines, competitive threats, and regulatory deadlines.', when: 'Used to prioritize which opportunities to pursue first. High-urgency signals go to the sales team immediately.', output: 'Urgency scores (1-10) for each signal, with reasons and recommended response timelines.' },
    qualify_opportunity: { what: 'Evaluates each sales opportunity using BANT (Budget, Authority, Need, Timeline) and MEDDIC scoring. It determines whether an opportunity is worth pursuing.', when: 'When the sales team needs to decide GO/NO-GO on an opportunity. Saves weeks of manual qualification.', output: 'Qualification verdict (GO, CONDITIONAL, NO-GO) with detailed scoring breakdowns.' },
    map_stakeholders: { what: 'Maps out all the decision-makers and influencers at the customer organization — who has authority, who can champion the deal, and who might be a blocker.', when: 'Before engaging a customer, the sales team needs to know the people involved. This tool creates a stakeholder map.', output: 'A map of stakeholders with roles, influence levels, attitudes, and engagement strategies.' },
    analyze_pipeline: { what: 'Analyzes the entire sales pipeline — total value, stage distribution, win probabilities, and which deals need attention.', when: 'For pipeline reviews and sales forecasting. Gives management a clear picture of the revenue funnel.', output: 'Pipeline summary with weighted values, stage breakdowns, and risk flags.' },
    draft_proposal: { what: 'Creates a technical-commercial proposal for a customer, including scope, specifications, pricing structure, and delivery terms.', when: 'When the team needs to respond to a customer inquiry or RFP. The agent drafts the proposal framework.', output: 'A structured proposal document with technical scope, commercial terms, and delivery schedule.' },
    generate_bom: { what: 'Generates a Bill of Materials (BOM) by mapping proposal requirements to Thermax\'s product catalog. Identifies the exact equipment and quantities needed.', when: 'After the proposal scope is defined, the agent creates a detailed equipment list for costing.', output: 'Line-by-line BOM with product codes, descriptions, quantities, and catalog references.' },
    analyze_margins: { what: 'Calculates profit margins for each proposal and flags any that fall below the company threshold (usually 15%).', when: 'Before submitting a proposal, management needs to know if the deal is commercially viable.', output: 'Margin analysis showing gross margin %, flagged low-margin deals, and improvement recommendations.' },
    extract_drawing_data: { what: 'Reads structured drawing-extraction rows from the backbone (P&ID, PFD, equipment-style tags, line references, confidence scores, and review flags). It does not interpret CAD or raster pixels — it is POC data aligned to the project.', when: 'First tool in the engineering workflow: the agent needs a consistent summary of what was “extracted” for tags, lines, and equipment references before data sheets and validation.', output: 'Filtered rows for the project (and optional drawing type) with confidence and flags for the report’s drawing-assisted section.' },
    extract_datasheets: { what: 'Pulls instrument and equipment datasheet fields from the backbone so the agent can present structured make/model, ranges, materials, and connections in tabular form.', when: 'After drawing-oriented context, the agent builds draft instrument and equipment data sheets for review.', output: 'Structured datasheet summaries keyed by project and tag, ready to merge with user uploads.' },
    classify_make_buy: { what: 'Classifies components and major items as make (in-house) or buy (vendor) using the make/buy table — rationale, preferred vendors, and lead time hints for Procurement.', when: 'Before handoff to Stage 7, the agent needs a clear make-vs-buy position for each major line item.', output: 'Classification list with make/buy, rationale, and handoff notes for procurement review.' },
    validate_engineering: { what: 'Validates the technical feasibility of a proposal — checks if the solution is engineering-sound, meets codes, and can actually be built.', when: 'Engineering review before finalizing a proposal. Catches technical issues before they become costly problems.', output: 'Engineering verdict (Approved/Conditional/Rejected) with technical notes and compliance checks.' },
    check_deviations: { what: 'Loads POC deviation and completeness rows — comparing spec or requirement hints to extraction outputs, missing tags, and open points. It is a review aid, not a formal compliance or drawing sign-off.', when: 'Near the end of the five-tool chain: the agent produces a draft deviation and open-issues table for the Chief Engineer to review.', output: 'A deviation-oriented summary table: severity, category, and recommended follow-up, explicitly labeled as draft POC output.' },
    simulate_performance: { what: 'Simulates the expected performance of the proposed equipment against guaranteed parameters — efficiency, output, emissions.', when: 'To verify that performance guarantees can be met before committing them to the customer.', output: 'Simulation results showing expected vs guaranteed values, with confidence intervals.' },
    assess_hazop: { what: 'Conducts a Hazard and Operability (HAZOP) assessment to identify safety risks in the proposed design — what could go wrong and how to prevent it.', when: 'For safety-critical projects. HAZOP is mandatory before detailed engineering can proceed.', output: 'HAZOP findings with risk levels, recommended safeguards, and required design changes.' },
    assess_commercial_risk: { what: 'Evaluates the commercial risks of a deal — customer creditworthiness, payment terms, currency exposure, and contract penalties.', when: 'Before signing a contract, the finance team needs to understand what could go wrong financially.', output: 'Risk assessment with ratings (Low/Medium/High/Critical) and mitigation recommendations.' },
    review_contract: { what: 'Reviews contract terms and conditions, flagging problematic clauses, missing protections, and unfavorable terms.', when: 'Legal review before contract signature. The agent highlights red flags that need negotiation.', output: 'Clause-by-clause review with redline suggestions and risk ratings.' },
    evaluate_payment_terms: { what: 'Analyzes proposed payment milestones and terms to ensure healthy cash flow and minimize payment risk.', when: 'When structuring the payment schedule for a project. Ensures Thermax is not cash-negative.', output: 'Cash flow projection, milestone analysis, and recommended payment structure.' },
    charter_project: { what: 'Creates a project charter — defining scope, objectives, success criteria, budget, timeline, and governance for a new project.', when: 'When a deal is won and moves into execution. The charter is the foundation for project management.', output: 'Project charter with scope statement, WBS, budget allocation, and milestone plan.' },
    match_resources: { what: 'Matches available engineers, managers, and specialists to project requirements based on skills, certifications, and availability.', when: 'During mobilization, when the project needs to be staffed. The agent finds the best-fit people.', output: 'Resource matching report with fit scores, availability dates, and gap analysis.' },
    plan_mobilisation: { what: 'Plans the mobilization of resources, equipment, and materials to the project site — logistics, timelines, and dependencies.', when: 'Before project kickoff. Ensures everything is in place for a smooth start.', output: 'Mobilization plan with task list, responsible parties, and critical path.' },
    analyze_progress: { what: 'Analyzes project progress against plan — schedule adherence, cost performance, and milestone completion.', when: 'During weekly/monthly project reviews. Identifies slippages early before they become crises.', output: 'Progress dashboard showing RAG status, earned value analysis, and forecast.' },
    detect_safety_risks: { what: 'Scans safety data to detect risks — near misses, unsafe conditions, incident trends, and compliance gaps.', when: 'Continuously during project execution. Safety is always the top priority at Thermax sites.', output: 'Safety risk report with incident trends, risk heat map, and recommended actions.' },
    disposition_ncr: { what: 'Reviews Non-Conformance Reports (NCRs) and recommends dispositions — rework, accept as-is, scrap, or return to vendor.', when: 'When quality issues are found during manufacturing or site work. The agent recommends how to handle each one.', output: 'NCR disposition recommendations with rationale, cost impact, and approval requirements.' },
    analyze_test_results: { what: 'Analyzes commissioning test results — comparing actual measurements against design specs and performance guarantees.', when: 'During commissioning, to verify the plant is performing as designed before handing it over.', output: 'Test analysis showing pass/fail status, deviations, and recommendations.' },
    verify_performance: { what: 'Verifies performance guarantee parameters against test data — confirms the equipment meets contractual obligations.', when: 'Before issuing Performance Acceptance Certificate (PAC). This is the final technical check.', output: 'PG verification report showing guaranteed vs actual values and compliance status.' },
    generate_punchlist: { what: 'Generates a list of outstanding items that need to be resolved before the plant can be accepted — safety issues, incomplete work, defects.', when: 'At the end of commissioning. The punchlist drives final completion before handover.', output: 'Prioritized punchlist with severity ratings, responsible parties, and target dates.' },
    lookup_sop: { what: 'Searches through Thermax\'s library of Standard Operating Procedures to find the right procedure for a given equipment type and situation. Returns step-by-step instructions, safety precautions, and required tools.', when: 'When a field engineer encounters an issue on site and needs guidance on the correct procedure to follow.', output: 'Relevant SOPs with numbered steps, safety warnings, and tool requirements.' },
    diagnose_service_case: { what: 'Performs a structured root cause analysis on a service case using the Why-Why (5-Why) method. It traces the symptom back through 5 levels to find the true root cause, then recommends both an immediate fix and a preventive action.', when: 'When a customer reports an issue and the service team needs to understand why it happened and how to fix it permanently.', output: 'A complete why-why analysis ladder: Symptom → Mechanism → Condition → Process Gap → Root Cause, plus corrective and preventive actions.' },
    check_spare_parts: { what: 'Checks the spare parts inventory for availability, stock levels, pricing, and lead times. Identifies which parts are needed for a given service case and flags any critical parts running low.', when: 'When a service case requires replacement parts, or during periodic inventory reviews to prevent stockouts.', output: 'Parts availability report with stock status, lead times, costs, and reorder recommendations.' },
    analyze_approval_gates: { what: 'Reviews the status of Human-in-the-Loop approval gates across all 9 stages — who approved what, how fast, and whether SLAs are being met.', when: 'For governance reviews. Ensures the approval process is working efficiently and no bottlenecks exist.', output: 'Approval gate analysis with SLA compliance, decision patterns, and bottleneck identification.' },
    audit_agent_actions: { what: 'Analyzes the complete audit trail of all AI agent actions — what each agent did, how confident it was, and how often humans intervened.', when: 'For periodic governance reviews and to identify agents that may need retraining or recalibration.', output: 'Agent health dashboard with confidence metrics, intervention rates, and performance trends.' },
    review_overrides: { what: 'Analyzes cases where humans overrode AI decisions — why the AI was wrong, what the human changed, and what lessons can be learned.', when: 'For continuous improvement. Every override teaches the system something about where it needs to get better.', output: 'Override analysis with patterns, root causes of AI errors, and retraining recommendations.' },
    manage_escalations: { what: 'Reviews confidence-based escalations — cases where an agent wasn\'t sure enough and sent the task to a human for review.', when: 'To evaluate whether the confidence threshold is set correctly and escalations are being resolved promptly.', output: 'Escalation report with resolution times, outcomes, and threshold effectiveness.' },
  };

  const detail = explanations[tool.name];
  return (
    <div className="bg-blue-50 border-t border-blue-200 px-3 py-2.5 space-y-2 text-[11px]">
      <div className="font-bold text-blue-900 flex items-center gap-1.5">
        <span>{tool.icon}</span> {tool.label}
        <span className="text-[9px] font-mono text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded ml-1">{tool.name}</span>
      </div>
      {detail ? (
        <>
          <div>
            <span className="font-semibold text-blue-800">What it does: </span>
            <span className="text-blue-700 leading-snug">{detail.what}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-800">When the agent uses it: </span>
            <span className="text-blue-700 leading-snug">{detail.when}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-800">What it produces: </span>
            <span className="text-blue-700 leading-snug">{detail.output}</span>
          </div>
        </>
      ) : (
        <div className="text-blue-700 leading-snug">
          {tool.description} This tool is used by the <strong>{agentName}</strong> during its analysis workflow.
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  sectionNumber,
  title,
  subtitle,
  badgeColor = 'bg-thermax-navy',
  headerGradient = 'bg-thermax-mist',
  defaultOpen = false,
  liveIndicator = false,
  children,
}: {
  sectionNumber: string;
  title: string;
  subtitle?: string;
  badgeColor?: string;
  headerGradient?: string;
  defaultOpen?: boolean;
  liveIndicator?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-3 border-b border-thermax-line ${headerGradient} hover:brightness-[0.97] transition cursor-pointer select-none`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${badgeColor}`}>{sectionNumber}</span>
          <h3 className="text-[13px] font-bold text-thermax-navy">{title}</h3>
          {subtitle && <span className="text-[10px] font-mono text-thermax-slate">{subtitle}</span>}
          {liveIndicator && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
        </div>
        <span className={`text-[10px] font-bold tracking-wider transition-transform ${open ? 'text-thermax-saffronDeep' : 'text-thermax-slate'}`}>
          {open ? 'COLLAPSE ▲' : 'EXPAND ▼'}
        </span>
      </button>
      {open && children}
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

function CopilotBubble({ message, isStreaming, agentName }: { message: ChatMessage; isStreaming: boolean; agentName: string }) {
  const [expanded, setExpanded] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed bg-emerald-600 text-white rounded-tr-md">
          {message.content}
        </div>
      </div>
    );
  }

  const preview = message.content.slice(0, 500).replace(/\n/g, ' ');
  const showCollapse = !isStreaming && message.content.length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed bg-white text-gray-800 rounded-tl-md border border-emerald-100 w-full">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-1 group cursor-pointer">
          <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">{agentName}</span>
          {showCollapse && (
            <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 tracking-wide transition">
              {expanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
            </span>
          )}
        </button>
        {isStreaming || expanded ? (
          <Markdown>{message.content}</Markdown>
        ) : (
          <div className="text-gray-500 text-xs leading-relaxed cursor-pointer" onClick={() => setExpanded(true)}>
            {preview}{message.content.length > 500 ? '...' : ''}
            <span className="ml-2 text-emerald-600 font-semibold">Click to expand</span>
          </div>
        )}
      </div>
    </div>
  );
}
