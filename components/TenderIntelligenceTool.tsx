'use client';

import { useState, useRef, useEffect } from 'react';
import { DIVISION_TEMPLATES, SAMPLE_TENDERS, type DivisionTemplate } from '@/data/tender-templates';
import Markdown from './Markdown';

type Tab = 'upload' | 'extraction' | 'estimation' | 'risk' | 'chat';
type ChatMsg = { role: 'user' | 'assistant'; content: string };

interface ExtractedItem {
  field: string;
  value: string;
  confidence: number;
  sourceRef: string;
  flagged: boolean;
}

interface ExtractionResult {
  categoryId: string;
  categoryName: string;
  items: ExtractedItem[];
}

interface FullExtraction {
  extractions: ExtractionResult[];
  summary: string;
  exoticMaterials: string[];
  criticalRisks: string[];
  estimatedValue: string;
}

export default function TenderIntelligenceTool() {
  const [tab, setTab] = useState<Tab>('upload');
  const [division, setDivision] = useState<DivisionTemplate>(DIVISION_TEMPLATES[0]);
  const [documentText, setDocumentText] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<FullExtraction | null>(null);
  const [extractionMarkdown, setExtractionMarkdown] = useState('');
  const [extractionDone, setExtractionDone] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatStreamBuffer, setChatStreamBuffer] = useState('');
  const [chatProgress, setChatProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedChat, setExpandedChat] = useState<Set<number>>(new Set());
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const extractProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages.length, chatStreamBuffer]);

  async function loadSampleTender(tenderId: string) {
    const tender = SAMPLE_TENDERS.find(t => t.id === tenderId);
    if (!tender) return;
    setLoadingSample(tenderId);
    try {
      const res = await fetch(tender.file);
      const text = await res.text();
      setDocumentText(text);
      setDocumentName(tender.name);
      const div = DIVISION_TEMPLATES.find(d => d.id === tender.division);
      if (div) setDivision(div);
      setExtractionResult(null);
      setExtractionMarkdown('');
      setExtractionDone(false);
      setChatMessages([]);
    } catch { /* ignore */ }
    setLoadingSample(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setDocumentText(text);
    setDocumentName(file.name);
    setExtractionResult(null);
    setExtractionMarkdown('');
    setExtractionDone(false);
    setChatMessages([]);
  }

  function startTimerProgress(setter: (v: number | ((p: number) => number)) => void, ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>, speed = 25) {
    setter(0);
    const t0 = Date.now();
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => {
      const elapsed = (Date.now() - t0) / 1000;
      const pct = Math.min(95, Math.round((1 - Math.exp(-elapsed / speed)) * 100));
      setter(pct);
    }, 300);
  }

  function stopTimerProgress(setter: (v: number) => void, ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
    setter(100);
    if (ref.current) { clearInterval(ref.current); ref.current = null; }
    setTimeout(() => setter(0), 1000);
  }

  async function runExtraction() {
    if (!documentText || extracting) return;
    setExtracting(true);
    setExtractionMarkdown('');
    setExtractionResult(null);
    setExtractionDone(false);
    startTimerProgress(setExtractProgress, extractProgressRef, 30);

    try {
      const res = await fetch('/api/ai-nexus/tender-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          divisionId: division.id,
          categories: division.categories,
        }),
      });

      if (!res.ok || !res.body) {
        setExtractionMarkdown('*Error: ' + (await res.text().catch(() => 'Request failed')) + '*');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';
      let chunkCount = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        let curEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) curEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (curEvent === 'text_delta') {
                assembled += data;
                chunkCount++;
                setExtractionMarkdown(assembled);
                const contentPct = Math.min(92, 8 + Math.round((chunkCount / 120) * 87));
                setExtractProgress(prev => Math.max(prev, contentPct));
              }
            } catch { /* skip */ }
            curEvent = '';
          }
        }
      }

      setExtractionMarkdown(assembled);
      setExtractionDone(true);
      setTab('extraction');

      try {
        const jsonMatch = assembled.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1].trim()) as FullExtraction;
          setExtractionResult(parsed);
        }
      } catch { /* structured JSON parsing failed — readable Markdown still available */ }
    } catch (err) {
      setExtractionMarkdown(`*Error: ${err instanceof Error ? err.message : 'Unknown'}*`);
    } finally {
      stopTimerProgress(setExtractProgress, extractProgressRef);
      setExtracting(false);
    }
  }

  async function sendChat(textOverride?: string) {
    const text = (textOverride ?? chatInput).trim();
    if (!text || chatStreaming) return;
    const next: ChatMsg[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(next);
    setChatInput('');
    setChatStreaming(true);
    setChatStreamBuffer('');
    startTimerProgress(setChatProgress, chatProgressRef, 20);

    try {
      const res = await fetch('/api/ai-nexus/tender-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, documentText, divisionId: division.id }),
      });
      if (!res.ok || !res.body) {
        setChatMessages([...next, { role: 'assistant', content: `*Error: ${await res.text().catch(() => 'Failed')}*` }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';
      let chunkCount = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        let curEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) curEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (curEvent === 'text_delta') {
                assembled += data;
                chunkCount++;
                setChatStreamBuffer(assembled);
                const contentPct = Math.min(92, 8 + Math.round((chunkCount / 80) * 87));
                setChatProgress(prev => Math.max(prev, contentPct));
              }
            } catch { /* skip */ }
            curEvent = '';
          }
        }
      }
      setChatMessages([...next, { role: 'assistant', content: assembled }]);
    } catch (err) {
      setChatMessages([...next, { role: 'assistant', content: `*Error: ${err instanceof Error ? err.message : 'Unknown'}*` }]);
    } finally {
      stopTimerProgress(setChatProgress, chatProgressRef);
      setChatStreaming(false);
      setChatStreamBuffer('');
    }
  }

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleChat = (idx: number) => {
    setExpandedChat(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  const hasDoc = documentText.length > 0;

  function getReadableMarkdown(filter?: 'estimation' | 'risk'): string {
    if (!extractionMarkdown) return '';
    // Strip the JSON block at the end for readable display
    const cleaned = extractionMarkdown.replace(/```json[\s\S]*?```/g, '').trim();
    if (!filter) return cleaned;

    // For estimation/risk packs, filter to relevant sections
    if (extractionResult) {
      const relevantCatNames = division.categories
        .filter(c => c.pack === filter || c.pack === 'both' || c.pack === 'general')
        .map(c => c.name);
      
      const sections = cleaned.split(/\n(?=## )/);
      const filtered = sections.filter(s => {
        const heading = s.match(/^## (.+)/)?.[1]?.trim();
        if (!heading) return false;
        if (filter === 'risk' && (heading.includes('Critical Risk') || heading.includes('Tender Summary'))) return true;
        if (filter === 'estimation' && (heading.includes('Exotic Material') || heading.includes('Tender Summary'))) return true;
        return relevantCatNames.some(cn => heading.toLowerCase().includes(cn.toLowerCase()));
      });
      return filtered.join('\n\n') || cleaned;
    }
    return cleaned;
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white border border-thermax-line rounded-xl shadow-card mb-4 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-[20px] font-bold">Tender Intelligence Tool</h1>
              <p className="text-white/70 text-[12px] mt-0.5">AI-powered tender extraction, analysis, and proposal acceleration</p>
            </div>
            {hasDoc && (
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <div className="text-white text-[11px] font-semibold">{documentName}</div>
                <div className="text-white/60 text-[10px] font-mono">{documentText.length.toLocaleString()} chars | {division.name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-t border-thermax-line">
          {([
            { id: 'upload' as Tab, label: 'Upload & Configure', icon: '📤' },
            { id: 'extraction' as Tab, label: 'Extraction Report', icon: '📋', disabled: !hasDoc },
            { id: 'estimation' as Tab, label: 'Estimation Pack', icon: '💰', disabled: !extractionDone },
            { id: 'risk' as Tab, label: 'Risk Pack', icon: '⚠️', disabled: !extractionDone },
            { id: 'chat' as Tab, label: 'Q&A Chat', icon: '💬', disabled: !hasDoc },
          ]).map(t => (
            <button key={t.id} onClick={() => !t.disabled && setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition ${tab === t.id ? 'bg-violet-600 text-white' : t.disabled ? 'text-gray-300 cursor-not-allowed' : 'text-thermax-slate hover:bg-gray-100'}`}>
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* UPLOAD TAB */}
      {tab === 'upload' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: Upload + Division */}
          <div className="space-y-4">
            <div className="bg-white border border-thermax-line rounded-xl shadow-card p-5">
              <h3 className="text-[14px] font-bold text-thermax-navy mb-3">Load Document</h3>
              <div className="border-2 border-dashed border-violet-200 rounded-lg p-6 text-center hover:border-violet-400 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept=".txt,.csv,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                <div className="text-3xl mb-2">📄</div>
                <p className="text-[13px] text-thermax-navy font-semibold">Drop or click to upload tender document</p>
                <p className="text-[11px] text-thermax-slate mt-1">Supports TXT, CSV, PDF, DOC, DOCX</p>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-bold text-thermax-navy mb-2">Or Load Sample Tender:</div>
                <div className="space-y-1.5">
                  {SAMPLE_TENDERS.map(st => (
                    <button key={st.id} onClick={() => loadSampleTender(st.id)} disabled={loadingSample === st.id}
                      className="w-full text-left px-3 py-2.5 border border-thermax-line rounded-lg hover:bg-violet-50 hover:border-violet-200 transition flex items-center gap-2 disabled:opacity-50">
                      <span className="text-lg">{DIVISION_TEMPLATES.find(d => d.id === st.division)?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-thermax-navy truncate">{st.name}</div>
                        <div className="text-[10px] text-thermax-slate">{st.pages} pages | {st.division.replace('-', ' ')}</div>
                      </div>
                      {loadingSample === st.id && <span className="text-[10px] text-violet-600 animate-pulse">Loading...</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Division selector */}
            <div className="bg-white border border-thermax-line rounded-xl shadow-card p-5">
              <h3 className="text-[14px] font-bold text-thermax-navy mb-3">Division Template</h3>
              <div className="grid grid-cols-2 gap-2">
                {DIVISION_TEMPLATES.map(d => (
                  <button key={d.id} onClick={() => setDivision(d)}
                    className={`px-3 py-2.5 rounded-lg border text-left transition ${division.id === d.id ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-200' : 'border-thermax-line hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{d.icon}</span>
                      <div>
                        <div className="text-[12px] font-semibold text-thermax-navy">{d.name}</div>
                        <div className="text-[10px] text-thermax-slate">{d.categories.length} categories</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Document preview + Extract */}
          <div className="space-y-4">
            <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-thermax-line flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-thermax-navy">Document Preview</h3>
                {hasDoc && (
                  <div className="flex items-center gap-3">
                    {extracting && extractProgress > 0 && (
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <div className="flex-1 bg-violet-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-300" style={{ width: `${extractProgress}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-violet-700 w-10 text-right">{extractProgress}%</span>
                      </div>
                    )}
                    <button onClick={runExtraction} disabled={extracting}
                      className="px-5 py-2 rounded-lg bg-violet-600 text-white text-[12px] font-bold hover:bg-violet-700 disabled:opacity-50 transition">
                      {extracting ? 'Extracting...' : 'Extract with AI'}
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {hasDoc ? (
                  <pre className="text-[11px] text-thermax-slate whitespace-pre-wrap font-mono leading-relaxed">{documentText}</pre>
                ) : (
                  <div className="py-12 text-center text-thermax-slate">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-[13px] font-semibold">No document loaded</p>
                    <p className="text-[11px] mt-1">Upload a tender document or select a sample to get started.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Extraction categories */}
            <div className="bg-white border border-thermax-line rounded-xl shadow-card p-5">
              <h3 className="text-[14px] font-bold text-thermax-navy mb-3">Extraction Categories ({division.categories.length})</h3>
              <div className="space-y-1">
                {division.categories.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.pack === 'estimation' ? 'bg-blue-500' : c.pack === 'risk' ? 'bg-red-500' : c.pack === 'both' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                    <span className="text-thermax-navy font-medium">{c.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.pack === 'estimation' ? 'bg-blue-100 text-blue-700' : c.pack === 'risk' ? 'bg-red-100 text-red-700' : c.pack === 'both' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.pack}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXTRACTION TAB */}
      {tab === 'extraction' && (
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[14px] font-bold text-thermax-navy">Extraction Report</h3>
              <div className="flex items-center gap-2">
                {extracting && <span className="text-[10px] text-violet-600 font-mono animate-pulse">Processing... {extractProgress}%</span>}
                {extractionDone && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded font-bold">Extraction Complete</span>
                )}
              </div>
            </div>
            {extracting && extractProgress > 0 && (
              <div className="w-full bg-violet-100 rounded-full h-1.5 mt-1">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-300" style={{ width: `${extractProgress}%` }} />
              </div>
            )}
          </div>
          {extractionMarkdown ? (
            <CollapsibleResult id="extraction-report" title="AI Extraction Report" expanded={expandedSections.has('extraction-report')} onToggle={() => toggleSection('extraction-report')} streaming={extracting}>
              <div className="p-5 max-h-[600px] overflow-y-auto">
                <Markdown>{getReadableMarkdown()}</Markdown>
              </div>
            </CollapsibleResult>
          ) : (
            <div className="p-8 text-center text-thermax-slate">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-[13px]">No extraction results yet. Load a document and click &quot;Extract with AI&quot;.</p>
            </div>
          )}
        </div>
      )}

      {/* ESTIMATION PACK TAB */}
      {tab === 'estimation' && (
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-blue-50 to-cyan-50">
            <h3 className="text-[14px] font-bold text-thermax-navy">Estimation Pack</h3>
            <p className="text-[11px] text-thermax-slate">Parameters relevant for costing and estimation — filtered from the extraction report</p>
          </div>
          <CollapsibleResult id="estimation-report" title="Estimation Parameters" expanded={expandedSections.has('estimation-report')} onToggle={() => toggleSection('estimation-report')}>
            <div className="p-5 max-h-[600px] overflow-y-auto">
              <Markdown>{getReadableMarkdown('estimation')}</Markdown>
            </div>
          </CollapsibleResult>
        </div>
      )}

      {/* RISK PACK TAB */}
      {tab === 'risk' && (
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="text-[14px] font-bold text-thermax-navy">Risk Pack</h3>
            <p className="text-[11px] text-thermax-slate">Clauses requiring legal and commercial review — filtered from the extraction report</p>
          </div>
          <CollapsibleResult id="risk-report" title="Risk Analysis" expanded={expandedSections.has('risk-report')} onToggle={() => toggleSection('risk-report')}>
            <div className="p-5 max-h-[600px] overflow-y-auto">
              <Markdown>{getReadableMarkdown('risk')}</Markdown>
            </div>
          </CollapsibleResult>
        </div>
      )}

      {/* CHAT TAB */}
      {tab === 'chat' && (
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-violet-50 to-blue-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <h3 className="text-[14px] font-bold text-thermax-navy">Tender Q&A</h3>
                <p className="text-[10px] text-thermax-slate">Ask questions about the loaded tender document with source citations</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 border border-violet-300">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-[10px] font-bold text-violet-700">LIVE</span>
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {chatStreaming && chatProgress > 0 && (
            <div className="px-5 py-2 border-b border-thermax-line bg-violet-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-violet-700">AI Processing</span>
                <span className="text-[11px] font-bold text-violet-700">{chatProgress}%</span>
              </div>
              <div className="w-full bg-violet-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-300" style={{ width: `${chatProgress}%` }} />
              </div>
            </div>
          )}

          {/* Quick questions */}
          {chatMessages.length === 0 && !chatStreaming && (
            <div className="p-4 border-b border-thermax-line">
              <p className="text-[11px] font-semibold text-violet-700 mb-2">Suggested Questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Summarize the tender', prompt: 'Provide a comprehensive summary of this tender including scope, key technical requirements, commercial terms, and submission requirements.' },
                  { label: 'List exotic materials', prompt: 'List all exotic or non-standard materials of construction specified in this tender. For each, specify the component, material grade, and relevant standard.' },
                  { label: 'Highlight risk clauses', prompt: 'Identify and analyze all risk clauses in this tender including LD provisions, performance guarantees, payment terms, and any unusual conditions that Thermax should be cautious about.' },
                  { label: 'Pre-bid questions', prompt: 'Based on this tender, generate a list of technical and commercial clarification questions for the pre-bid meeting. Flag any ambiguous specifications or missing information.' },
                  { label: 'Competitive positioning', prompt: 'Based on the tender requirements, what are Thermax strengths and potential gaps? How should we position our proposal for maximum competitiveness?' },
                ].map((q, i) => (
                  <button key={i} onClick={() => sendChat(q.prompt)}
                    className="text-[11px] px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-100 transition font-medium">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat area */}
          <div ref={chatRef} className="min-h-[350px] max-h-[500px] overflow-y-auto p-4 space-y-3">
            {chatMessages.map((m, i) => (
              <div key={i}>
                {m.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3 text-[13px] bg-violet-600 text-white">{m.content}</div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[13px] bg-white border border-violet-100 w-full">
                      <button onClick={() => toggleChat(i)} className="w-full flex items-center justify-between mb-1 group cursor-pointer">
                        <span className="text-[10px] font-mono text-violet-600 uppercase">Tender AI</span>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-violet-600 transition">
                          {expandedChat.has(i) ? 'COLLAPSE' : 'EXPAND'}
                        </span>
                      </button>
                      {expandedChat.has(i) ? (
                        <Markdown>{m.content}</Markdown>
                      ) : (
                        <div className="text-gray-500 text-xs cursor-pointer" onClick={() => toggleChat(i)}>
                          {m.content.slice(0, 500).replace(/\n/g, ' ')}...
                          <span className="ml-2 text-violet-600 font-semibold">Click to expand</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chatStreaming && chatStreamBuffer && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[13px] bg-white border border-violet-100 w-full">
                  <span className="text-[10px] font-mono text-violet-600 uppercase mb-1 block">Tender AI</span>
                  <Markdown>{chatStreamBuffer}</Markdown>
                </div>
              </div>
            )}
            {chatStreaming && !chatStreamBuffer && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 border border-violet-100">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            {chatMessages.length === 0 && !chatStreaming && (
              <div className="text-center py-12 text-thermax-slate">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-[14px] font-semibold">Tender Q&A</p>
                <p className="text-[12px] mt-1">Ask questions about the loaded tender document. Responses include source citations.</p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-thermax-line">
            <div className="flex gap-2">
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask about scope, technical specs, MOC, T&Cs, risk clauses..."
                rows={2} disabled={chatStreaming}
                className="flex-1 border border-violet-200 rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50" />
              <button onClick={() => sendChat()} disabled={chatStreaming || !chatInput.trim()}
                className="bg-violet-600 text-white font-semibold px-5 rounded-lg hover:bg-violet-700 disabled:opacity-40 transition text-sm">
                {chatStreaming ? '...' : 'Ask'}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-thermax-slate">Ctrl/Cmd+Enter to send</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleResult({ id, title, expanded, onToggle, streaming, children }: {
  id: string; title: string; expanded: boolean; onToggle: () => void; streaming?: boolean;
  children: React.ReactNode;
}) {
  const show = expanded || streaming;
  return (
    <div>
      <button onClick={onToggle}
        className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition border-b border-thermax-line">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-thermax-navy">{title}</span>
          {streaming && <span className="text-[10px] text-violet-600 font-mono animate-pulse">Streaming...</span>}
        </div>
        <span className="text-[11px] font-bold text-thermax-slate">{show ? 'COLLAPSE ▲' : 'EXPAND ▼'}</span>
      </button>
      {show && children}
    </div>
  );
}
