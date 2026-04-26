'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const techLayers = [
  {
    id: 'traditional-ai',
    title: 'Traditional AI / ML',
    icon: '🧠',
    gradient: 'from-emerald-500 to-teal-600',
    stat: '2,000+',
    statLabel: 'Failure Modes',
    tagline: 'Predictive models, anomaly detection, classification, time-series forecasting',
    bullets: [
      'Equipment health scoring with degradation curves',
      'Anomaly detection against 2,000+ known failure modes',
      'Time-series forecasting for predictive maintenance',
      'Classification models for risk and priority ranking',
    ],
  },
  {
    id: 'gen-ai',
    title: 'Generative AI (LLMs)',
    icon: '✨',
    gradient: 'from-violet-500 to-purple-600',
    stat: '128K',
    statLabel: 'Token Context',
    tagline: 'Document understanding, structured extraction, natural language Q&A, report generation',
    bullets: [
      '908-page tender documents ingested and understood',
      'Structured extraction with confidence scores',
      'Natural language Q&A with source citations',
      'Enterprise-grade report generation with Mermaid diagrams',
    ],
  },
  {
    id: 'agentic-ai',
    title: 'Agentic AI',
    icon: '🤖',
    gradient: 'from-amber-500 to-orange-600',
    stat: '9',
    statLabel: 'Specialized Agents',
    tagline: 'Autonomous tool-calling agents, multi-step reasoning, human-in-the-loop governance',
    bullets: [
      '9 domain-specialized agents across the business flow',
      'Multi-step tool orchestration with 45+ enterprise tools',
      'Human-in-the-loop approval gates at every stage',
      'AgentGuard governance with confidence-based escalation',
    ],
  },
];

const apps = [
  {
    id: 'asset-performance',
    title: 'Asset Performance & Predictive Monitoring',
    subtitle: 'Predictive ML + Gen-AI + IoT Analytics',
    description: 'Monitor industrial assets in real time, predict failures before they happen, and optimize energy efficiency across your entire fleet of boilers, heaters, water treatment systems, and solar thermal units.',
    icon: '🏭',
    href: '/ai-nexus/asset-performance',
    features: [
      'Real-time fleet dashboard with health scores',
      'Predictive ML anomaly detection against 2,000+ failure modes',
      'Time-to-failure scoring with degradation curves',
      'Energy efficiency optimization engine',
      'Gen-AI root-cause analysis assistant (128K context)',
      'Automated incident management workflow',
    ],
    stats: { assets: '12+', sites: '4', failureModes: '2,000+', kpis: '25+' },
    gradient: 'from-blue-600 to-cyan-500',
    badge: 'PREDICTIVE ML + GEN-AI',
    techPills: ['Predictive ML', 'Gen-AI / LLM', 'IoT Analytics'],
  },
  {
    id: 'tender-intelligence',
    title: 'Tender Intelligence & Proposal Acceleration',
    subtitle: 'Gen-AI Extraction + Agentic Analysis',
    description: 'Ingest 500-2,000 page tender documents, automatically extract key parameters across 8 categories, flag exotic materials and risky clauses, and accelerate offer creation with agentic AI-powered Q&A.',
    icon: '📋',
    href: '/ai-nexus/tender-intelligence',
    features: [
      'Upload PDFs, Word docs, CSVs up to 2,000 pages',
      'Gen-AI structured extraction with confidence scores',
      'Division-specific templates (Water, Boilers, Heating, Solar, APC)',
      'Agentic Estimation Pack and Risk Pack analysis',
      'RAG-based Q&A with source-page citations',
      'One-click export to structured formats',
    ],
    stats: { divisions: '5', categories: '8', accuracy: '95%+', speedup: '3x' },
    gradient: 'from-violet-600 to-purple-500',
    badge: 'AGENTIC DOCUMENT AI',
    techPills: ['Gen-AI / LLM', 'Document AI', 'Agentic Extraction'],
  },
  {
    id: 'engineering-design',
    title: 'Agentic Engineering Design Assistants',
    subtitle: '6-Agent Pipeline + Thermax Calculation Engines',
    description: 'Autonomously generate, evaluate, and iterate equipment configurations for boilers, WHR, water treatment, and APC — reducing proposal engineering from weeks to hours with a 6-agent design pipeline.',
    icon: '⚙️',
    href: '/ai-nexus/engineering-design',
    features: [
      '6-agent pipeline: Parse, Size, Configure, Comply, Cost, Propose',
      'Thermodynamic sizing with heat/mass balance calculations',
      'IBR, ASME, NFPA, CPCB compliance validation',
      'Auto BOM generation with market pricing',
      'Make-vs-buy analysis with vendor matching',
      'Full proposal document assembly in minutes',
    ],
    stats: { agents: '6', equipment: '7', reduction: '~90%', standards: '10' },
    gradient: 'from-indigo-600 to-blue-500',
    badge: 'AGENTIC DESIGN AI',
    techPills: ['Gen-AI / LLM', 'Agentic Pipeline', 'Thermax Calc Engine'],
  },
];

const comingSoon = [
  {
    title: 'Energy Optimization AI',
    subtitle: 'Reinforcement Learning + Digital Twin',
    icon: '⚡',
    eta: 'Coming Q3 2026',
    description: 'RL-driven energy optimization with digital twin simulation for boilers, chillers, and combined heat-power systems.',
  },
  {
    title: 'Supply Chain Intelligence',
    subtitle: 'Demand Forecasting + Vendor Risk AI',
    icon: '🔗',
    eta: 'Coming Q4 2026',
    description: 'Predictive demand planning, vendor risk scoring, and autonomous procurement recommendations.',
  },
  {
    title: 'Quality Prediction Engine',
    subtitle: 'Computer Vision + SPC Analytics',
    icon: '🔬',
    eta: 'Coming Q1 2027',
    description: 'Visual inspection AI, statistical process control, and predictive quality scoring across manufacturing lines.',
  },
];

const liveStats = [
  { value: 9, suffix: '', label: 'Agentic Agents' },
  { value: 45, suffix: '+', label: 'Enterprise Tools' },
  { value: 5, suffix: '', label: 'Industry Divisions' },
  { value: 128, suffix: 'K', label: 'Token Context' },
  { value: 908, suffix: '-pg', label: 'Max Document' },
  { value: 2000, suffix: '+', label: 'Failure Modes' },
];

function AnimatedCounter({ target, suffix, duration = 1500 }: { target: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count.toLocaleString()}{suffix}</>;
}

function TechTile({ layer }: { layer: typeof techLayers[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="group relative bg-white border border-thermax-line rounded-2xl shadow-card overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className={`bg-gradient-to-br ${layer.gradient} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{layer.icon}</span>
            <div>
              <h3 className="text-white font-bold text-[15px] leading-tight">{layer.title}</h3>
              <p className="text-white/60 text-[10px] font-mono mt-0.5">AI Layer</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-[20px] leading-none">{layer.stat}</div>
            <div className="text-white/70 text-[9px] uppercase tracking-wider">{layer.statLabel}</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-3">
        <p className="text-thermax-slate text-[11px] leading-relaxed">{layer.tagline}</p>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-4 space-y-1.5 border-t border-thermax-line pt-3">
          {layer.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-thermax-slate">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">&#9679;</span>
              {b}
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-3 flex items-center gap-1">
        <span className={`text-[9px] font-semibold transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        <span className="text-[9px] text-thermax-slate font-medium">{expanded ? 'Click to collapse' : 'Hover or click to explore'}</span>
      </div>
    </div>
  );
}

export default function AINexusPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 border border-amber-200 mb-5 shadow-sm">
          <span className="text-lg">⚡</span>
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">AI Nexus &mdash; Convergence Platform</span>
          <span className="relative flex h-2.5 w-2.5 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-thermax-navy mb-3 leading-tight">
          Where AI, Gen-AI &amp; Agentic AI Converge
        </h1>
        <p className="text-thermax-slate text-[15px] max-w-3xl mx-auto leading-relaxed">
          Enterprise-grade applications powered by three AI paradigms working in tandem &mdash;{' '}
          <span className="font-semibold text-emerald-700">Predictive ML</span>,{' '}
          <span className="font-semibold text-violet-700">Generative LLMs</span>, and{' '}
          <span className="font-semibold text-amber-700">Autonomous Agents</span>{' '}
          &mdash; purpose-built for Thermax&apos;s industrial operations.
        </p>
      </div>

      {/* Live Stats Bar */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {liveStats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-white border border-thermax-line rounded-xl shadow-sm">
            <span className="text-[18px] font-bold text-thermax-navy leading-none">
              <AnimatedCounter target={s.value} suffix={s.suffix} />
            </span>
            <span className="text-[10px] text-thermax-slate uppercase tracking-wide font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* AI Technology Landscape */}
      <div className="mb-10">
        <div className="text-center mb-5">
          <h2 className="text-[14px] font-bold text-thermax-navy uppercase tracking-wider">AI Technology Landscape</h2>
          <p className="text-[11px] text-thermax-slate mt-1">Three intelligence layers powering every application</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {techLayers.map((layer) => (
            <TechTile key={layer.id} layer={layer} />
          ))}
        </div>
      </div>

      {/* Application Cards */}
      <div className="mb-10">
        <div className="text-center mb-5">
          <h2 className="text-[14px] font-bold text-thermax-navy uppercase tracking-wider">Live Applications</h2>
          <p className="text-[11px] text-thermax-slate mt-1">Production-ready AI applications &mdash; click to launch</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {apps.map((app) => (
            <Link key={app.id} href={app.href} className="group block">
              <div className="bg-white border border-thermax-line rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 h-full flex flex-col">
                <div className={`bg-gradient-to-r ${app.gradient} px-6 py-5`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-3xl">{app.icon}</span>
                      <h2 className="text-white font-bold text-[18px] mt-2 leading-tight">{app.title}</h2>
                      <p className="text-white/70 text-[12px] font-mono mt-1">{app.subtitle}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-[9px] font-bold tracking-wider leading-tight text-right max-w-[120px]">
                      {app.badge}
                    </span>
                  </div>
                  {/* Tech pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {app.techPills.map((pill) => (
                      <span key={pill} className="px-2 py-0.5 rounded-full bg-white/15 text-white/90 text-[9px] font-semibold border border-white/20">
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-thermax-slate text-[13px] leading-relaxed mb-4">{app.description}</p>

                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {Object.entries(app.stats).map(([key, val]) => (
                      <div key={key} className="text-center py-2 bg-thermax-mist rounded-lg">
                        <div className="text-[16px] font-bold text-thermax-navy">{val}</div>
                        <div className="text-[10px] text-thermax-slate uppercase tracking-wide">{key}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {app.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-thermax-slate">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">&#10003;</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-thermax-line flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-thermax-saffron font-bold text-[13px] group-hover:text-thermax-saffronDeep transition">
                      Launch Application &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="mb-8">
        <div className="text-center mb-5">
          <h2 className="text-[14px] font-bold text-thermax-navy uppercase tracking-wider">Coming Soon</h2>
          <p className="text-[11px] text-thermax-slate mt-1">Next-generation applications on the AI Nexus roadmap</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {comingSoon.map((app) => (
            <div key={app.title} className="bg-white/60 border border-dashed border-thermax-line rounded-2xl p-5 opacity-70 hover:opacity-90 transition-opacity duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl grayscale">{app.icon}</span>
                  <div>
                    <h3 className="text-[14px] font-bold text-thermax-navy leading-tight">{app.title}</h3>
                    <p className="text-[10px] text-thermax-slate font-mono">{app.subtitle}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-thermax-mist text-[8px] font-bold text-thermax-slate uppercase tracking-wider border border-thermax-line">
                  {app.eta}
                </span>
              </div>
              <p className="text-[11px] text-thermax-slate leading-relaxed">{app.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-thermax-mist to-white border border-thermax-line rounded-xl shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold text-thermax-navy">Thermax AI Nexus 2030</span>
          <span className="text-[10px] text-thermax-slate">&mdash; AI + Gen-AI + Agentic AI working in tandem</span>
        </div>
      </div>
    </main>
  );
}
