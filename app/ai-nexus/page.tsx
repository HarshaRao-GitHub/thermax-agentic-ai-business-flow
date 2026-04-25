import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Nexus — Thermax AI Operating System 2030',
  description: 'Next-generation AI-powered enterprise applications for industrial operations, procurement, and proposal engineering.',
};

const apps = [
  {
    id: 'asset-performance',
    title: 'Asset Performance & Predictive Monitoring',
    subtitle: 'Industrial IoT + AI Analytics',
    description: 'Monitor industrial assets in real time, predict failures before they happen, and optimize energy efficiency across your entire fleet of boilers, heaters, water treatment systems, and solar thermal units.',
    icon: '🏭',
    href: '/ai-nexus/asset-performance',
    features: [
      'Real-time fleet dashboard with health scores',
      'AI anomaly detection against 2,000+ failure modes',
      'Predictive maintenance with time-to-failure scoring',
      'Energy efficiency optimization engine',
      'LLM-powered root-cause analysis assistant',
      'Automated incident management workflow',
    ],
    stats: { assets: '12+', sites: '4', failureModes: '2,000+', kpis: '25+' },
    gradient: 'from-blue-600 to-cyan-500',
    badge: 'PREDICTIVE AI',
  },
  {
    id: 'tender-intelligence',
    title: 'Tender Intelligence & Proposal Acceleration',
    subtitle: 'Document AI + Extraction Engine',
    description: 'Ingest 500-2,000 page tender documents, automatically extract key parameters across 8 categories, flag exotic materials and risky clauses, and accelerate offer creation with AI-powered Q&A.',
    icon: '📋',
    href: '/ai-nexus/tender-intelligence',
    features: [
      'Upload PDFs, Word docs, CSVs up to 2,000 pages',
      'AI-driven structured extraction with confidence scores',
      'Division-specific templates (Water, Boilers, Heating, Solar)',
      'Estimation Pack and Risk Pack filtered views',
      'RAG-based Q&A with source-page citations',
      'One-click export to structured formats',
    ],
    stats: { divisions: '4', categories: '8', accuracy: '95%+', speedup: '3x' },
    gradient: 'from-violet-600 to-purple-500',
    badge: 'DOCUMENT AI',
  },
];

export default function AINexusPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 mb-4">
          <span className="text-lg">⚡</span>
          <span className="text-[12px] font-bold text-amber-800 uppercase tracking-wider">AI Nexus</span>
        </div>
        <h1 className="text-3xl font-bold text-thermax-navy mb-3">
          Next-Generation AI Applications
        </h1>
        <p className="text-thermax-slate text-[15px] max-w-2xl mx-auto leading-relaxed">
          Enterprise-grade AI applications purpose-built for Thermax&apos;s industrial operations.
          Powered by advanced LLMs, predictive analytics, and domain-specific knowledge bases.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
                  <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-[10px] font-bold tracking-wider">
                    {app.badge}
                  </span>
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
                      <span className="text-thermax-emerald mt-0.5 flex-shrink-0">&#10003;</span>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-thermax-line">
                  <span className="text-thermax-saffron font-bold text-[13px] group-hover:text-thermax-saffronDeep transition">
                    Launch Application &rarr;
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-thermax-mist border border-thermax-line rounded-lg">
          <span className="text-[11px] text-thermax-slate">More AI applications coming soon</span>
          <span className="text-[11px] font-mono text-thermax-navy">Thermax AI Nexus 2030</span>
        </div>
      </div>
    </main>
  );
}
