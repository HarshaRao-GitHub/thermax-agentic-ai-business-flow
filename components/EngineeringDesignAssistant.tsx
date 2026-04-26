'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  AGENT_ROLES,
  EQUIPMENT_CATEGORIES,
  SIZING_SCENARIOS,
  TIME_COMPARISON,
  SAMPLE_BOM,
  COMPLIANCE_ITEMS,
  type AgentRole,
} from '@/data/engineering-design-data';
import Markdown from './Markdown';

type Tab = 'pipeline' | 'configurator' | 'assistant';
type SimStage = 'idle' | 'running' | 'complete';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const AGENT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

const AGENT_BORDER: Record<string, string> = {
  blue: 'border-blue-200 bg-blue-50',
  green: 'border-green-200 bg-green-50',
  purple: 'border-purple-200 bg-purple-50',
  teal: 'border-teal-200 bg-teal-50',
  amber: 'border-amber-200 bg-amber-50',
  rose: 'border-rose-200 bg-rose-50',
};

function AgentCard({ agent, isActive, isComplete }: { agent: AgentRole; isActive: boolean; isComplete: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-xl border-2 p-3 transition-all duration-500 cursor-pointer ${
        isActive
          ? 'border-thermax-saffron shadow-lg scale-[1.02] ring-2 ring-thermax-saffron/30'
          : isComplete
          ? `${AGENT_BORDER[agent.color]} opacity-90`
          : 'border-gray-200 bg-white opacity-60'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg ${AGENT_COLORS[agent.color]} flex items-center justify-center text-white text-sm`}>
          {isComplete ? '✓' : isActive ? '⟳' : agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[12px] font-bold text-thermax-navy truncate">{agent.name}</h4>
          <span className="text-[9px] text-thermax-slate font-mono">{agent.avgTime}</span>
        </div>
        {isActive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-thermax-saffron opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-thermax-saffron" />
          </span>
        )}
      </div>
      <p className="text-[10px] text-thermax-slate leading-snug">{agent.description.slice(0, 80)}...</p>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          <div>
            <span className="text-[8px] font-bold text-thermax-navy uppercase">Tools</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {agent.tools.map((t) => (
                <span key={t} className="px-1.5 py-px rounded bg-gray-100 text-[8px] text-thermax-slate">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[8px] font-bold text-thermax-navy uppercase">Outputs</span>
            <div className="text-[9px] text-thermax-slate">{agent.outputs.join(' | ')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EngineeringDesignAssistant() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [simStage, setSimStage] = useState<SimStage>('idle');
  const [activeAgent, setActiveAgent] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState('boiler-afbc');
  const [rfqText, setRfqText] = useState('');
  const [simLog, setSimLog] = useState<string[]>([]);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamBuffer, setChatStreamBuffer] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  const toggleResult = (i: number) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatStreamBuffer]);

  const runSimulation = useCallback(() => {
    setSimStage('running');
    setActiveAgent(0);
    setSimLog([]);

    const labels = AGENT_ROLES.map((a) => a.name);
    let step = 0;
    const timer = setInterval(() => {
      setSimLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${labels[step]} — completed`]);
      step++;
      if (step < labels.length) {
        setActiveAgent(step);
      } else {
        setActiveAgent(-1);
        setSimStage('complete');
        clearInterval(timer);
      }
    }, 2000);
  }, []);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);
    setChatStreamBuffer('');

    try {
      const res = await fetch('/api/ai-nexus/engineering-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });
      if (!res.ok || !res.body) throw new Error('API error');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            try {
              const parsed = JSON.parse(payload);
              if (typeof parsed === 'string') {
                full += parsed;
                setChatStreamBuffer(full);
              }
            } catch {
              // skip
            }
          }
        }
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: full }]);
      setChatStreamBuffer('');
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error connecting to the engineering design API. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatMessages, chatLoading]);

  const totalBOMCost = SAMPLE_BOM.reduce((s, b) => s + b.totalCostLakh, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-thermax-mist">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-[20px] font-bold">Agentic Engineering Design Assistants</h1>
            <p className="text-white/70 text-[12px] mt-0.5">Multi-Agent Design Pipeline &mdash; Boilers, WHR, Water Treatment, APC</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[8px] font-semibold border border-white/20">LLM Backbone (Claude)</span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[8px] font-semibold border border-white/20">6-Agent Pipeline</span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[8px] font-semibold border border-white/20">Thermax Product DB</span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[8px] font-semibold border border-white/20">Standards Library</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-[20px] font-bold text-white">{SIZING_SCENARIOS.length}</div>
              <div className="text-[9px] text-white/60 uppercase">Designs Completed</div>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-[20px] font-bold text-white">~90%</div>
              <div className="text-[9px] text-white/60 uppercase">Time Reduction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-thermax-line bg-white px-4">
        {([
          { id: 'pipeline' as Tab, label: 'Agent Pipeline', icon: '🔄' },
          { id: 'configurator' as Tab, label: 'Design Configurator', icon: '⚙️' },
          { id: 'assistant' as Tab, label: 'Gen-AI Assistant', icon: '🤖' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition ${
              tab === t.id
                ? 'border-thermax-saffron text-thermax-saffron'
                : 'border-transparent text-thermax-slate hover:text-thermax-navy'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* ===== PIPELINE TAB ===== */}
        {tab === 'pipeline' && (
          <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Agent Pipeline Grid */}
            <div>
              <h2 className="text-[14px] font-bold text-thermax-navy uppercase tracking-wider mb-3">
                6-Agent Design Pipeline
              </h2>
              {/* Row 1: Agents 1-3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {AGENT_ROLES.slice(0, 3).map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isActive={activeAgent === i}
                    isComplete={simStage === 'complete' || (simStage === 'running' && i < activeAgent)}
                  />
                ))}
              </div>
              {/* Flow arrow between rows */}
              <div className="flex justify-center mb-4">
                <span className="text-gray-300 text-xl">&#8595;</span>
              </div>
              {/* Row 2: Agents 4-6 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {AGENT_ROLES.slice(3, 6).map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isActive={activeAgent === i + 3}
                    isComplete={simStage === 'complete' || (simStage === 'running' && i + 3 < activeAgent)}
                  />
                ))}
              </div>
              {/* Flow arrow to human review */}
              <div className="flex justify-center mb-4">
                <span className="text-gray-300 text-xl">&#8595;</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50">
                  <span className="text-sm">👤</span>
                  <span className="text-[11px] font-semibold text-emerald-700">Human Expert Review</span>
                </div>
                <span className="text-gray-300 text-lg">&#8594;</span>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-400 bg-emerald-100">
                  <span className="text-sm">✅</span>
                  <span className="text-[11px] font-semibold text-emerald-800">Final Proposal</span>
                </div>
              </div>
            </div>

            {/* Time Comparison */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-thermax-line">
                <h3 className="text-[13px] font-bold text-thermax-navy">Manual vs Agentic AI Time Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2 font-semibold text-thermax-navy">Design Task</th>
                      <th className="px-4 py-2 font-semibold text-red-600">Manual Time</th>
                      <th className="px-4 py-2 font-semibold text-emerald-600">Agentic AI Time</th>
                      <th className="px-4 py-2 font-semibold text-blue-600">Reduction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_COMPARISON.map((row) => (
                      <tr key={row.task} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-thermax-navy">{row.task}</td>
                        <td className="px-4 py-2 text-red-600">{row.manualTime}</td>
                        <td className="px-4 py-2 text-emerald-600 font-semibold">{row.agenticTime}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{row.reduction}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Completed Scenarios */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-thermax-line">
                <h3 className="text-[13px] font-bold text-thermax-navy">Completed Design Scenarios</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2 font-semibold">ID</th>
                      <th className="px-3 py-2 font-semibold">Design</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Fuel</th>
                      <th className="px-3 py-2 font-semibold">Capacity</th>
                      <th className="px-3 py-2 font-semibold text-red-600">Manual</th>
                      <th className="px-3 py-2 font-semibold text-emerald-600">Agentic</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZING_SCENARIOS.map((sc) => (
                      <tr key={sc.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-[10px] text-blue-600">{sc.id}</td>
                        <td className="px-3 py-2 font-medium text-thermax-navy">{sc.title}</td>
                        <td className="px-3 py-2">{sc.customer}</td>
                        <td className="px-3 py-2 text-[11px]">{sc.fuelType}</td>
                        <td className="px-3 py-2 font-semibold">{sc.capacity}</td>
                        <td className="px-3 py-2 text-red-600">{sc.manualDays}</td>
                        <td className="px-3 py-2 text-emerald-600 font-semibold">{sc.agenticHours}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            sc.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : sc.status === 'in-progress'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {sc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample BOM */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-thermax-line flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-thermax-navy">Sample BOM — 45 TPH AFBC Boiler</h3>
                <span className="text-[12px] font-bold text-amber-700">Total: INR {totalBOMCost.toFixed(1)} Lakh</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Component</th>
                      <th className="px-3 py-2 font-semibold">Material</th>
                      <th className="px-3 py-2 font-semibold">Qty</th>
                      <th className="px-3 py-2 font-semibold text-right">Cost (L)</th>
                      <th className="px-3 py-2 font-semibold">Lead</th>
                      <th className="px-3 py-2 font-semibold">M/B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_BOM.map((b) => (
                      <tr key={b.itemNo} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono text-[10px]">{b.itemNo}</td>
                        <td className="px-3 py-1.5 font-medium">{b.component}</td>
                        <td className="px-3 py-1.5 text-[10px] text-thermax-slate">{b.material}</td>
                        <td className="px-3 py-1.5">{b.quantity} {b.unit}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{b.totalCostLakh.toFixed(1)}</td>
                        <td className="px-3 py-1.5">{b.leadTimeWeeks}w</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-px rounded text-[9px] font-bold ${
                            b.makeOrBuy === 'Make' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {b.makeOrBuy}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== CONFIGURATOR TAB ===== */}
        {tab === 'configurator' && (
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Equipment Selection */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card p-5">
              <h3 className="text-[13px] font-bold text-thermax-navy mb-3">Select Equipment Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {EQUIPMENT_CATEGORIES.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => setSelectedCategory(eq.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedCategory === eq.id
                        ? 'border-thermax-saffron bg-thermax-saffron/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{eq.icon}</div>
                    <div className="text-[10px] font-bold text-thermax-navy leading-tight">{eq.name}</div>
                    <div className="text-[8px] text-thermax-slate mt-0.5">{eq.division}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sizing Parameters */}
            {(() => {
              const cat = EQUIPMENT_CATEGORIES.find((e) => e.id === selectedCategory);
              if (!cat) return null;
              return (
                <div className="bg-white rounded-xl border border-thermax-line shadow-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-bold text-thermax-navy">{cat.icon} {cat.name} — Design Parameters</h3>
                      <p className="text-[10px] text-thermax-slate mt-0.5">Capacity range: {cat.typicalCapacity}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cat.standards.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[8px] font-bold border border-teal-200">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    {cat.sizingParams.map((param) => (
                      <div key={param}>
                        <label className="text-[10px] font-semibold text-thermax-navy uppercase tracking-wide">{param}</label>
                        <input
                          type="text"
                          placeholder={param}
                          className="w-full mt-1 px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-thermax-saffron"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* RFQ Text Input */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card p-5">
              <h3 className="text-[13px] font-bold text-thermax-navy mb-2">Paste Customer RFQ (optional)</h3>
              <textarea
                value={rfqText}
                onChange={(e) => setRfqText(e.target.value)}
                placeholder="Paste the customer RFQ text here... The Requirement Parsing Agent will automatically extract fuel type, capacity, pressure, temperature, site conditions, and other parameters."
                className="w-full h-28 px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-thermax-saffron resize-none"
              />
            </div>

            {/* Simulate Pipeline */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-thermax-navy">Run Agent Pipeline Simulation</h3>
                <button
                  onClick={runSimulation}
                  disabled={simStage === 'running'}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[12px] font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 transition"
                >
                  {simStage === 'running' ? 'Running...' : simStage === 'complete' ? 'Re-run Simulation' : 'Start Pipeline'}
                </button>
              </div>

              {/* Pipeline visual */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {AGENT_ROLES.map((agent, i) => (
                  <div
                    key={agent.id}
                    className={`px-3 py-2 rounded-lg text-[10px] font-semibold text-center transition-all duration-500 ${
                      activeAgent === i
                        ? 'bg-thermax-saffron text-white scale-105 shadow-md'
                        : simStage === 'complete' || (simStage === 'running' && i < activeAgent)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {agent.icon} {agent.name.replace(' Agent', '')}
                  </div>
                ))}
                <div className={`px-3 py-2 rounded-lg text-[10px] font-semibold text-center ${
                  simStage === 'complete' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  👤 Expert Review
                </div>
              </div>

              {/* Simulation Log */}
              {simLog.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px]">
                  {simLog.map((line, i) => (
                    <div key={i} className="text-emerald-400">{line}</div>
                  ))}
                  {simStage === 'complete' && (
                    <div className="text-amber-300 mt-1 font-bold">Pipeline complete — ready for human expert review</div>
                  )}
                </div>
              )}
            </div>

            {/* Compliance Standards */}
            <div className="bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-thermax-line">
                <h3 className="text-[13px] font-bold text-thermax-navy">Compliance Standards Library</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2 font-semibold">Code</th>
                      <th className="px-3 py-2 font-semibold">Standard</th>
                      <th className="px-3 py-2 font-semibold">Description</th>
                      <th className="px-3 py-2 font-semibold">Mandatory</th>
                      <th className="px-3 py-2 font-semibold">Check Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPLIANCE_ITEMS.map((c) => (
                      <tr key={c.code} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono text-blue-600 font-semibold">{c.code}</td>
                        <td className="px-3 py-1.5 font-medium">{c.standard}</td>
                        <td className="px-3 py-1.5 text-thermax-slate">{c.description}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-px rounded text-[9px] font-bold ${c.mandatory ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.mandatory ? 'YES' : 'Optional'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">{c.checkType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== ASSISTANT TAB ===== */}
        {tab === 'assistant' && (
          <div className="flex flex-col h-full">
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-thermax-line bg-white flex items-center gap-3">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="text-[14px] font-bold text-thermax-navy">Engineering Design Gen-AI Assistant</h3>
                <p className="text-[10px] text-thermax-slate">
                  Powered by {EQUIPMENT_CATEGORIES.length} equipment categories, {SIZING_SCENARIOS.length} completed designs, {COMPLIANCE_ITEMS.length} standards
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-1.5 py-px rounded-full bg-indigo-50 text-indigo-600 text-[7px] font-semibold border border-indigo-100">LLM Backbone</span>
                  <span className="px-1.5 py-px rounded-full bg-amber-50 text-amber-600 text-[7px] font-semibold border border-amber-100">6-Agent Pipeline</span>
                  <span className="px-1.5 py-px rounded-full bg-teal-50 text-teal-600 text-[7px] font-semibold border border-teal-100">IBR/ASME Standards</span>
                  <span className="px-1.5 py-px rounded-full bg-purple-50 text-purple-600 text-[7px] font-semibold border border-purple-100">Thermax Product DB</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-3 text-[13px] bg-thermax-saffron/10 border border-thermax-saffron/20">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[13px] bg-white border border-gray-200 w-full">
                      <button onClick={() => toggleResult(i)} className="w-full flex items-center justify-between mb-1 group cursor-pointer">
                        <span className="text-[10px] font-mono text-blue-600 uppercase">Gen-AI Assistant</span>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 transition">
                          {expandedResults.has(i) ? 'COLLAPSE' : 'EXPAND'}
                        </span>
                      </button>
                      <div className={expandedResults.has(i) ? '' : 'max-h-48 overflow-hidden relative'}>
                        <Markdown>{msg.content}</Markdown>
                        {!expandedResults.has(i) && (
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {chatStreamBuffer && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[13px] bg-white border border-blue-100 w-full">
                    <span className="text-[10px] font-mono text-blue-600 uppercase mb-1 block">Gen-AI Assistant</span>
                    <Markdown>{chatStreamBuffer}</Markdown>
                  </div>
                </div>
              )}

              {chatMessages.length === 0 && !chatStreamBuffer && (
                <div className="text-center py-12 text-thermax-slate">
                  <div className="text-4xl mb-3">⚙️</div>
                  <p className="text-[14px] font-semibold">Agentic Engineering Design Assistant</p>
                  <p className="text-[12px] mt-1">Ask about equipment sizing, boiler configuration, compliance, BOM, or paste an RFQ for full pipeline processing...</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      'Size a 45 TPH AFBC boiler for bagasse firing',
                      'What standards apply to a WHRS for cement kiln?',
                      'Generate a BOM for a 100 TPH CFBC boiler',
                      'Compare AFBC vs CFBC for high-ash Indian coal',
                      'Design a ZLD system for 500 m3/day textile effluent',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-thermax-slate hover:border-thermax-saffron hover:text-thermax-navy transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-thermax-line bg-white px-5 py-3">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder="Ask about equipment sizing, configuration, standards, BOM, or paste an RFQ..."
                  className="flex-1 px-4 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:border-thermax-saffron"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[12px] font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 transition"
                >
                  {chatLoading ? 'Processing...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
