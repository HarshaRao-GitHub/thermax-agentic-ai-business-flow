'use client';

import { useState, useRef, useEffect } from 'react';
import { DIVISION_TEMPLATES, SAMPLE_TENDERS, type DivisionTemplate, type ExtractionCategory } from '@/data/tender-templates';
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
  const [extractionRaw, setExtractionRaw] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatStreamBuffer, setChatStreamBuffer] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedChat, setExpandedChat] = useState<Set<number>>(new Set());
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

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
      setExtractionRaw('');
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
    setExtractionRaw('');
    setChatMessages([]);
  }

  async function runExtraction() {
    if (!documentText || extracting) return;
    setExtracting(true);
    setExtractionRaw('');
    setExtractionResult(null);

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
        setExtractionRaw('Error: ' + (await res.text().catch(() => 'Request failed')));
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
        let curEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) curEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (curEvent === 'text_delta') { assembled += data; setExtractionRaw(assembled); }
            } catch { /* skip */ }
            curEvent = '';
          }
        }
      }

      try {
        const cleaned = assembled.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned) as FullExtraction;
        setExtractionResult(parsed);
        setTab('extraction');
      } catch {
        setExtractionRaw(assembled);
        setTab('extraction');
      }
    } catch (err) {
      setExtractionRaw(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
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
              if (curEvent === 'text_delta') { assembled += data; setChatStreamBuffer(assembled); }
            } catch { /* skip */ }
            curEvent = '';
          }
        }
      }
      setChatMessages([...next, { role: 'assistant', content: assembled }]);
    } catch (err) {
      setChatMessages([...next, { role: 'assistant', content: `*Error: ${err instanceof Error ? err.message : 'Unknown'}*` }]);
    } finally {
      setChatStreaming(false);
      setChatStreamBuffer('');
    }
  }

  const toggleCat = (id: string) => {
    setExpandedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleChat = (idx: number) => {
    setExpandedChat(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  const hasDoc = documentText.length > 0;

  function renderExtractions(filter?: 'estimation' | 'risk') {
    if (!extractionResult) {
      if (extractionRaw) {
        return <div className="p-4 text-[13px] text-thermax-slate whitespace-pre-wrap">{extractionRaw}</div>;
      }
      return (
        <div className="p-8 text-center text-thermax-slate">
          <p className="text-[13px]">No extraction results yet. Load a document and click &quot;Extract&quot;.</p>
        </div>
      );
    }

    const filtered = filter
      ? extractionResult.extractions.filter(e => {
          const cat = division.categories.find(c => c.id === e.categoryId);
          return cat && (cat.pack === filter || cat.pack === 'both' || cat.pack === 'general');
        })
      : extractionResult.extractions;

    return (
      <div className="space-y-4 p-4">
        {/* Summary */}
        {!filter && extractionResult.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-[11px] font-bold text-blue-800 mb-1">Tender Summary</div>
            <div className="text-[12px] text-blue-700">{extractionResult.summary}</div>
            {extractionResult.estimatedValue && (
              <div className="mt-2 text-[12px] font-semibold text-blue-800">Estimated Value: {extractionResult.estimatedValue}</div>
            )}
          </div>
        )}

        {/* Exotic Materials Alert */}
        {!filter && extractionResult.exoticMaterials.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-[11px] font-bold text-amber-800 mb-1">Exotic Materials Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {extractionResult.exoticMaterials.map((m, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Critical Risks */}
        {(filter === 'risk' || !filter) && extractionResult.criticalRisks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-[11px] font-bold text-red-800 mb-1">Critical Risk Items</div>
            <ul className="space-y-1">
              {extractionResult.criticalRisks.map((r, i) => (
                <li key={i} className="text-[11px] text-red-700 flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">&#9888;</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Category extractions */}
        {filtered.map(ext => (
          <div key={ext.categoryId} className="bg-white border border-thermax-line rounded-lg shadow-card overflow-hidden">
            <button onClick={() => toggleCat(ext.categoryId)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-thermax-navy">{ext.categoryName}</span>
                <span className="text-[10px] bg-thermax-mist text-thermax-slate px-2 py-0.5 rounded font-mono">{ext.items.length} items</span>
                {ext.items.some(it => it.flagged) && (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">FLAGGED</span>
                )}
              </div>
              <span className="text-[10px] text-thermax-slate">{expandedCats.has(ext.categoryId) ? '▲' : '▼'}</span>
            </button>
            {expandedCats.has(ext.categoryId) && (
              <div className="border-t border-thermax-line">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 font-semibold text-thermax-navy">Field</th>
                      <th className="text-left px-4 py-2 font-semibold text-thermax-navy">Value</th>
                      <th className="text-center px-4 py-2 font-semibold text-thermax-navy w-20">Confidence</th>
                      <th className="text-left px-4 py-2 font-semibold text-thermax-navy w-28">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ext.items.map((item, i) => (
                      <tr key={i} className={`border-t border-gray-100 ${item.flagged ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-2 font-medium text-thermax-navy">
                          {item.flagged && <span className="text-amber-500 mr-1">&#9888;</span>}
                          {item.field}
                        </td>
                        <td className="px-4 py-2 text-thermax-slate">{item.value}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.confidence >= 0.9 ? 'bg-emerald-100 text-emerald-700' : item.confidence >= 0.7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-thermax-slate font-mono">{item.sourceRef}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
            { id: 'extraction' as Tab, label: 'Structured Extraction', icon: '📋', disabled: !hasDoc },
            { id: 'estimation' as Tab, label: 'Estimation Pack', icon: '💰', disabled: !extractionResult },
            { id: 'risk' as Tab, label: 'Risk Pack', icon: '⚠️', disabled: !extractionResult },
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
                  <button onClick={runExtraction} disabled={extracting}
                    className="px-5 py-2 rounded-lg bg-violet-600 text-white text-[12px] font-bold hover:bg-violet-700 disabled:opacity-50 transition">
                    {extracting ? 'Extracting...' : 'Extract with AI'}
                  </button>
                )}
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {hasDoc ? (
                  <pre className="text-[11px] text-thermax-slate whitespace-pre-wrap font-mono leading-relaxed">{documentText.slice(0, 5000)}{documentText.length > 5000 ? '\n\n... (truncated preview)' : ''}</pre>
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
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-thermax-navy">Structured Extraction Results</h3>
            {extractionResult && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded font-bold">
                {extractionResult.extractions.reduce((s, e) => s + e.items.length, 0)} items extracted
              </span>
            )}
          </div>
          {renderExtractions()}
        </div>
      )}

      {/* ESTIMATION PACK TAB */}
      {tab === 'estimation' && (
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-blue-50 to-cyan-50">
            <h3 className="text-[14px] font-bold text-thermax-navy">Estimation Pack</h3>
            <p className="text-[11px] text-thermax-slate">Parameters relevant for costing and estimation</p>
          </div>
          {renderExtractions('estimation')}
        </div>
      )}

      {/* RISK PACK TAB */}
      {tab === 'risk' && (
        <div className="bg-white border border-thermax-line rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="text-[14px] font-bold text-thermax-navy">Risk Pack</h3>
            <p className="text-[11px] text-thermax-slate">Clauses requiring legal and commercial review</p>
          </div>
          {renderExtractions('risk')}
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
                          {m.content.slice(0, 200).replace(/\n/g, ' ')}...
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
