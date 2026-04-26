'use client';

import { useState, useRef, useEffect } from 'react';
import { ASSETS, SITES, INCIDENTS, FAILURE_MODES, type Asset, type Incident } from '@/data/asset-performance-data';
import Markdown from './Markdown';

type Tab = 'fleet' | 'detail' | 'incidents' | 'assistant';
type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function AssetPerformancePlatform() {
  const [tab, setTab] = useState<Tab>('fleet');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'online' | 'alert' | 'offline'>('all');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatStreamBuffer, setChatStreamBuffer] = useState('');
  const [chatProgress, setChatProgress] = useState(0);
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredAssets = ASSETS.filter(a =>
    sidebarFilter === 'all' ? true : a.status === sidebarFilter
  );

  const filteredIncidents = INCIDENTS.filter(inc =>
    incidentFilter === 'all' ? true : inc.status === incidentFilter
  );

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages.length, chatStreamBuffer]);

  function selectAsset(a: Asset) {
    setSelectedAsset(a);
    setTab('detail');
  }

  function startProgress() {
    setChatProgress(0);
    const t0 = Date.now();
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const elapsed = (Date.now() - t0) / 1000;
      // Asymptotic approach: fast initially, slows near 95%
      const pct = Math.min(95, Math.round((1 - Math.exp(-elapsed / 20)) * 100));
      setChatProgress(pct);
    }, 300);
  }

  function stopProgress() {
    setChatProgress(100);
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    setTimeout(() => setChatProgress(0), 1000);
  }

  async function sendChat(textOverride?: string) {
    const text = (textOverride ?? chatInput).trim();
    if (!text || chatStreaming) return;
    const next: ChatMsg[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(next);
    setChatInput('');
    setChatStreaming(true);
    setChatStreamBuffer('');
    startProgress();

    try {
      const res = await fetch('/api/ai-nexus/asset-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed');
        setChatMessages([...next, { role: 'assistant', content: `*Error: ${errText}*` }]);
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
                // Accelerate progress based on content received
                const contentPct = Math.min(90, 10 + Math.round((chunkCount / 80) * 85));
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
      stopProgress();
      setChatStreaming(false);
      setChatStreamBuffer('');
    }
  }

  const toggleResult = (idx: number) => {
    setExpandedResults(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const onlineCount = ASSETS.filter(a => a.status === 'online').length;
  const alertCount = ASSETS.filter(a => a.status === 'alert').length;
  const offlineCount = ASSETS.filter(a => a.status === 'offline').length;
  const avgHealth = Math.round(ASSETS.reduce((s, a) => s + a.healthScore, 0) / ASSETS.length);
  const openIncidents = INCIDENTS.filter(i => i.status === 'open').length;

  return (
    <div className="flex h-[calc(100vh-130px)]">
      {/* Left Sidebar — Fleet Tree */}
      <aside className="w-72 border-r border-thermax-line bg-white flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-thermax-line">
          <h2 className="text-[14px] font-bold text-thermax-navy mb-2">Fleet Navigator</h2>
          <div className="flex gap-1">
            {(['all', 'online', 'alert', 'offline'] as const).map(f => (
              <button key={f} onClick={() => setSidebarFilter(f)}
                className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${sidebarFilter === f ? 'bg-thermax-navy text-white' : 'bg-thermax-mist text-thermax-slate hover:bg-gray-200'} transition`}>
                {f} {f === 'all' ? `(${ASSETS.length})` : f === 'online' ? `(${onlineCount})` : f === 'alert' ? `(${alertCount})` : `(${offlineCount})`}
              </button>
            ))}
          </div>
        </div>
        {SITES.map(site => {
          const siteAssets = filteredAssets.filter(a => a.siteId === site.id);
          if (siteAssets.length === 0) return null;
          return (
            <div key={site.id} className="border-b border-thermax-line">
              <div className="px-4 py-2 bg-gray-50">
                <div className="text-[11px] font-bold text-thermax-navy">{site.name}</div>
                <div className="text-[10px] text-thermax-slate">{site.location}</div>
              </div>
              {siteAssets.map(a => (
                <button key={a.id} onClick={() => selectAsset(a)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-gray-100 ${selectedAsset?.id === a.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'online' ? 'bg-emerald-500' : a.status === 'alert' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-thermax-navy truncate">{a.name}</div>
                      <div className="text-[10px] text-thermax-slate">{a.id} | Health: {a.healthScore}%</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-thermax-line">
          {([
            { id: 'fleet' as Tab, label: 'Fleet Dashboard', icon: '🏭' },
            { id: 'detail' as Tab, label: 'Asset Detail', icon: '📊' },
            { id: 'incidents' as Tab, label: `Incidents (${openIncidents})`, icon: '⚠️' },
            { id: 'assistant' as Tab, label: 'AI Assistant', icon: '🤖' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition ${tab === t.id ? 'bg-thermax-navy text-white' : 'text-thermax-slate hover:bg-gray-100'}`}>
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-thermax-mist">
          {/* FLEET DASHBOARD TAB */}
          {tab === 'fleet' && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Total Assets', value: ASSETS.length, color: 'text-thermax-navy' },
                  { label: 'Online', value: onlineCount, color: 'text-emerald-600' },
                  { label: 'Alerts', value: alertCount, color: 'text-amber-600' },
                  { label: 'Offline', value: offlineCount, color: 'text-red-600' },
                  { label: 'Avg Health', value: `${avgHealth}%`, color: avgHealth > 80 ? 'text-emerald-600' : 'text-amber-600' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white rounded-xl border border-thermax-line p-4 text-center shadow-card">
                    <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                    <div className="text-[11px] text-thermax-slate mt-1">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* Asset Grid */}
              <div className="grid grid-cols-3 gap-3">
                {ASSETS.map(a => (
                  <button key={a.id} onClick={() => selectAsset(a)}
                    className="bg-white rounded-xl border border-thermax-line p-4 text-left shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${a.status === 'online' ? 'bg-emerald-100 text-emerald-700' : a.status === 'alert' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {a.status}
                      </span>
                      <span className="text-[10px] text-thermax-slate font-mono">{a.id}</span>
                    </div>
                    <h3 className="text-[13px] font-bold text-thermax-navy mb-1 leading-tight">{a.name}</h3>
                    <div className="text-[11px] text-thermax-slate mb-3">{a.site}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-thermax-mist rounded px-2 py-1.5">
                        <div className="text-[10px] text-thermax-slate">Health</div>
                        <div className={`text-[14px] font-bold ${a.healthScore >= 80 ? 'text-emerald-600' : a.healthScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {a.healthScore}%
                        </div>
                      </div>
                      <div className="bg-thermax-mist rounded px-2 py-1.5">
                        <div className="text-[10px] text-thermax-slate">Efficiency</div>
                        <div className="text-[14px] font-bold text-thermax-navy">{a.efficiency}%</div>
                      </div>
                    </div>
                    {/* Anomaly badges */}
                    {Object.entries(a.vitals).some(([, v]) => v.status !== 'normal') && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(a.vitals).filter(([, v]) => v.status !== 'normal').map(([k, v]) => (
                          <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded ${v.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Data Backbone */}
              <div className="bg-white rounded-xl border border-thermax-line p-4 shadow-card">
                <h3 className="text-[12px] font-bold text-thermax-navy mb-2">Data Backbone</h3>
                <div className="flex items-center gap-4 text-[11px] text-thermax-slate font-mono">
                  <span>CSV: boiler_telemetry.csv</span>
                  <span>CSV: incident_history.csv</span>
                  <span>{ASSETS.length} assets</span>
                  <span>{FAILURE_MODES.length} failure modes</span>
                  <span>{INCIDENTS.length} incidents</span>
                  <span>{SITES.length} sites</span>
                </div>
              </div>
            </div>
          )}

          {/* ASSET DETAIL TAB */}
          {tab === 'detail' && (
            <div className="space-y-4">
              {!selectedAsset ? (
                <div className="bg-white rounded-xl border border-thermax-line p-12 text-center shadow-card">
                  <div className="text-4xl mb-3">📊</div>
                  <h3 className="text-lg font-bold text-thermax-navy">Select an Asset</h3>
                  <p className="text-[13px] text-thermax-slate mt-2">Choose an asset from the fleet navigator to view detailed vitals and analytics.</p>
                </div>
              ) : (
                <>
                  {/* Asset Header */}
                  <div className="bg-white rounded-xl border border-thermax-line p-5 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3 h-3 rounded-full ${selectedAsset.status === 'online' ? 'bg-emerald-500' : selectedAsset.status === 'alert' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                          <h2 className="text-[18px] font-bold text-thermax-navy">{selectedAsset.name}</h2>
                        </div>
                        <div className="text-[12px] text-thermax-slate">{selectedAsset.id} | {selectedAsset.site} | {selectedAsset.type.replace('-', ' ').toUpperCase()}</div>
                      </div>
                      <div className="flex gap-3">
                        <div className="text-center px-4 py-2 bg-thermax-mist rounded-lg">
                          <div className={`text-xl font-bold ${selectedAsset.healthScore >= 80 ? 'text-emerald-600' : selectedAsset.healthScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {selectedAsset.healthScore}%
                          </div>
                          <div className="text-[10px] text-thermax-slate">Health Score</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-thermax-mist rounded-lg">
                          <div className="text-xl font-bold text-thermax-navy">{selectedAsset.efficiency}%</div>
                          <div className="text-[10px] text-thermax-slate">Efficiency</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vitals Grid */}
                  <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
                    <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-blue-50 to-cyan-50">
                      <h3 className="text-[13px] font-bold text-thermax-navy">Real-Time Vitals</h3>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                      {Object.entries(selectedAsset.vitals).map(([key, v]) => (
                        <div key={key} className={`rounded-lg p-3 border ${v.status === 'critical' ? 'bg-red-50 border-red-200' : v.status === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-thermax-slate font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${v.status === 'critical' ? 'bg-red-200 text-red-800' : v.status === 'warning' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                              {v.status}
                            </span>
                          </div>
                          <div className="text-[18px] font-bold text-thermax-navy">
                            {v.value} <span className="text-[11px] text-thermax-slate font-normal">{v.unit}</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${v.status === 'critical' ? 'bg-red-500' : v.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, Math.max(5, ((v.value - v.min) / (v.max - v.min)) * 100))}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-thermax-slate mt-0.5">
                            <span>{v.min}</span><span>{v.max}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related Incidents */}
                  {(() => {
                    const relInc = INCIDENTS.filter(i => i.assetId === selectedAsset.id);
                    if (relInc.length === 0) return null;
                    return (
                      <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
                        <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-amber-50 to-orange-50">
                          <h3 className="text-[13px] font-bold text-thermax-navy">Related Incidents ({relInc.length})</h3>
                        </div>
                        <div className="p-4 space-y-2">
                          {relInc.map(inc => (
                            <IncidentRow key={inc.id} incident={inc} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Applicable Failure Modes */}
                  <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
                    <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-violet-50 to-blue-50">
                      <h3 className="text-[13px] font-bold text-thermax-navy">
                        Failure Mode Library ({FAILURE_MODES.filter(f => f.assetType === selectedAsset.type).length} modes for {selectedAsset.type})
                      </h3>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
                      {FAILURE_MODES.filter(f => f.assetType === selectedAsset.type).map(fm => (
                        <div key={fm.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${fm.severity === 'critical' ? 'bg-red-100 text-red-700' : fm.severity === 'high' ? 'bg-amber-100 text-amber-700' : fm.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                              {fm.severity}
                            </span>
                            <span className="text-[10px] font-mono text-thermax-slate">{fm.code}</span>
                            <span className="text-[11px] font-semibold text-thermax-navy">{fm.name}</span>
                          </div>
                          <div className="text-[10px] text-thermax-slate">
                            Symptoms: {fm.symptoms.slice(0, 2).join('; ')}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* INCIDENTS TAB */}
          {tab === 'incidents' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(['all', 'open', 'acknowledged', 'resolved'] as const).map(f => (
                  <button key={f} onClick={() => setIncidentFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${incidentFilter === f ? 'bg-thermax-navy text-white' : 'bg-white text-thermax-slate border border-thermax-line hover:bg-gray-50'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? INCIDENTS.length : INCIDENTS.filter(i => i.status === f).length})
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {filteredIncidents.map(inc => (
                  <IncidentRow key={inc.id} incident={inc} expanded />
                ))}
                {filteredIncidents.length === 0 && (
                  <div className="bg-white rounded-xl border border-thermax-line p-8 text-center shadow-card">
                    <div className="text-3xl mb-2">&#10003;</div>
                    <p className="text-thermax-slate text-[13px]">No incidents matching this filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI ASSISTANT TAB */}
          {tab === 'assistant' && (
            <div className="flex flex-col h-full">
              <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden flex flex-col flex-1">
                <div className="px-5 py-3 border-b border-thermax-line bg-gradient-to-r from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <div>
                      <h3 className="text-[14px] font-bold text-thermax-navy">Asset Performance AI Assistant</h3>
                      <p className="text-[10px] text-thermax-slate">Powered by {ASSETS.length} assets, {FAILURE_MODES.length} failure modes, {INCIDENTS.length} active incidents</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-700">LIVE</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {chatStreaming && chatProgress > 0 && (
                  <div className="px-5 py-2 border-b border-thermax-line bg-blue-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-blue-700">AI Processing</span>
                      <span className="text-[11px] font-bold text-blue-700">{chatProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300" style={{ width: `${chatProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                {chatMessages.length === 0 && !chatStreaming && (
                  <div className="p-4 border-b border-thermax-line">
                    <p className="text-[11px] font-semibold text-thermax-navy mb-2">Quick Analysis:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Fleet health overview', prompt: 'Give me a comprehensive fleet health overview covering all 4 sites. Include health scores, efficiency trends, and highlight the top 3 most critical issues needing immediate attention.' },
                        { label: 'Root cause: AST-002 failures', prompt: 'Perform a detailed root-cause analysis for all active incidents on AST-002 (20 TPH FBC Boiler). Use 5-Why methodology and recommend a corrective action plan with priority and timeline.' },
                        { label: 'Efficiency optimization', prompt: 'Analyze efficiency losses across the boiler fleet. Which assets have the highest potential for efficiency improvement? Provide specific operating set-point recommendations.' },
                        { label: 'Maintenance schedule', prompt: 'Create a prioritized preventive maintenance schedule for the next 30 days based on current asset conditions, active incidents, and predictive failure risks.' },
                        { label: 'Anomaly report', prompt: 'Generate an anomaly detection report for all assets. List every parameter that is in warning or critical status, correlate with known failure modes, and estimate time-to-failure risk.' },
                      ].map((qa, i) => (
                        <button key={i} onClick={() => sendChat(qa.prompt)}
                          className="text-[11px] px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium">
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
                  {chatMessages.map((m, i) => (
                    <div key={i}>
                      {m.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3 text-[13px] bg-thermax-navy text-white">{m.content}</div>
                        </div>
                      ) : (
                        <div className="flex justify-start">
                          <div className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[13px] bg-white border border-gray-200 w-full">
                            <button onClick={() => toggleResult(i)} className="w-full flex items-center justify-between mb-1 group cursor-pointer">
                              <span className="text-[10px] font-mono text-blue-600 uppercase">AI Assistant</span>
                              <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 transition">
                                {expandedResults.has(i) ? 'COLLAPSE' : 'EXPAND'}
                              </span>
                            </button>
                            {expandedResults.has(i) ? (
                              <Markdown>{m.content}</Markdown>
                            ) : (
                              <div className="text-gray-500 text-xs cursor-pointer" onClick={() => toggleResult(i)}>
                                {m.content.slice(0, 500).replace(/\n/g, ' ')}...
                                <span className="ml-2 text-blue-600 font-semibold">Click to expand</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatStreaming && chatStreamBuffer && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[13px] bg-white border border-blue-100 w-full">
                        <span className="text-[10px] font-mono text-blue-600 uppercase mb-1 block">AI Assistant</span>
                        <Markdown>{chatStreamBuffer}</Markdown>
                      </div>
                    </div>
                  )}
                  {chatStreaming && !chatStreamBuffer && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl px-4 py-3 border border-blue-100">
                        <span className="inline-flex gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                  {chatMessages.length === 0 && !chatStreaming && (
                    <div className="text-center py-12 text-thermax-slate">
                      <div className="text-4xl mb-3">🏭</div>
                      <p className="text-[14px] font-semibold">Asset Performance AI</p>
                      <p className="text-[12px] mt-1">Ask about fleet health, anomalies, root causes, efficiency, maintenance planning...</p>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-thermax-line">
                  <div className="flex gap-2">
                    <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); } }}
                      placeholder="Ask about fleet performance, anomalies, root causes, maintenance..."
                      rows={2} disabled={chatStreaming}
                      className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50" />
                    <button onClick={() => sendChat()} disabled={chatStreaming || !chatInput.trim()}
                      className="bg-thermax-navy text-white font-semibold px-5 rounded-lg hover:bg-thermax-navyDeep disabled:opacity-40 transition text-sm">
                      {chatStreaming ? '...' : 'Ask'}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-thermax-slate">Ctrl/Cmd+Enter to send</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IncidentRow({ incident, expanded = false }: { incident: Incident; expanded?: boolean }) {
  const [open, setOpen] = useState(false);
  const showDetail = expanded || open;

  return (
    <div className={`bg-white rounded-xl border shadow-card overflow-hidden ${incident.severity === 'critical' ? 'border-red-200' : incident.severity === 'high' ? 'border-amber-200' : 'border-thermax-line'}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${incident.severity === 'critical' ? 'bg-red-100 text-red-700' : incident.severity === 'high' ? 'bg-amber-100 text-amber-700' : incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
          {incident.severity}
        </span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${incident.status === 'open' ? 'bg-blue-100 text-blue-700' : incident.status === 'acknowledged' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {incident.status}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-thermax-navy">{incident.id}</span>
          <span className="text-[11px] text-thermax-slate mx-2">|</span>
          <span className="text-[11px] text-thermax-slate">{incident.assetName} @ {incident.site}</span>
        </div>
        <span className="text-[10px] text-thermax-slate font-mono">{new Date(incident.timestamp).toLocaleString()}</span>
        <span className="text-[10px] text-thermax-slate">{showDetail ? '▲' : '▼'}</span>
      </button>
      {showDetail && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
          <div className="mt-2">
            <div className="text-[10px] font-bold text-thermax-navy mb-0.5">Deviation</div>
            <div className="text-[11px] text-thermax-slate">{incident.deviation}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-thermax-navy mb-0.5">AI Root Cause Analysis</div>
            <div className="text-[11px] text-thermax-slate bg-blue-50 rounded p-2 border border-blue-100">{incident.aiRootCause}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-thermax-navy mb-0.5">Recommended Action</div>
            <div className="text-[11px] text-thermax-slate bg-emerald-50 rounded p-2 border border-emerald-100">{incident.recommendedAction}</div>
          </div>
          {incident.comments.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-thermax-navy mb-0.5">Comments ({incident.comments.length})</div>
              {incident.comments.map((c, i) => (
                <div key={i} className="text-[10px] text-thermax-slate bg-gray-50 rounded p-1.5 mt-1">{c}</div>
              ))}
            </div>
          )}
          <div className="text-[9px] text-thermax-slate font-mono">Failure Mode: {incident.failureModeCode}</div>
        </div>
      )}
    </div>
  );
}
