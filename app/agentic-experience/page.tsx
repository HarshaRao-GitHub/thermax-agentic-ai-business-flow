import Image from 'next/image';
import Link from 'next/link';
import { stages } from '@/data/stages';

export const metadata = {
  title: 'Agentic Experience — Thermax AI',
  description: 'Experience all 9 Thermax AI agents independently — no workflow restrictions, no sequencing. Explore each agent on its own.',
};

export default function AgenticExperiencePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-center mb-10">
        <div className="text-[11px] font-mono text-thermax-saffron uppercase tracking-widest mb-2">
          Unrestricted Agent Access
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-thermax-navy mb-3">
          Agentic Experience
        </h1>
        <p className="text-[15px] text-thermax-slate max-w-2xl mx-auto leading-relaxed">
          Explore all 9 Thermax AI agents independently. No workflow restrictions, no locking, no
          sequential dependencies. Each agent is fully functional with its complete tool set, data
          backbone, and AI capabilities.
        </p>
        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] font-mono text-thermax-navy">
          <span className="bg-thermax-mist border border-thermax-line px-3 py-1.5 rounded-lg">9 Agents</span>
          <span className="bg-thermax-mist border border-thermax-line px-3 py-1.5 rounded-lg">26 Tools</span>
          <span className="bg-thermax-mist border border-thermax-line px-3 py-1.5 rounded-lg">30+ Data Sources</span>
          <span className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-700">All Unlocked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage) => {
          const totalRows = stage.dataSources.reduce((a, ds) => a + ds.rowEstimate, 0);

          return (
            <Link
              key={stage.slug}
              href={`/agentic-experience/${stage.slug}`}
              className="group block bg-white border border-thermax-line rounded-2xl shadow-card hover:shadow-lg hover:border-thermax-saffron/40 transition-all duration-300 overflow-hidden"
            >
              {/* Agent banner */}
              <div className="relative h-40 overflow-hidden" style={{ backgroundColor: stage.color }}>
                <Image
                  src={stage.agentAvatar}
                  alt={stage.agent.name}
                  width={600}
                  height={240}
                  className="w-full h-full object-cover object-top opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Stage number + badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded">
                    Stage {stage.number}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    OPEN
                  </span>
                </div>

                {/* Agent face */}
                <div className="absolute bottom-3 left-3 flex items-end gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg shrink-0">
                    <Image
                      src={stage.agentAvatar}
                      alt={stage.agent.name}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-[15px] leading-tight drop-shadow-lg">
                      {stage.title}
                    </h2>
                    <p className="text-white/70 text-[11px]">{stage.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: stage.color }}>
                    {stage.icon}
                  </div>
                  <span className="text-[12px] font-semibold text-thermax-navy">{stage.agent.name}</span>
                </div>
                <p className="text-[11px] text-thermax-slate leading-relaxed mb-3 line-clamp-2">
                  {stage.agent.description}
                </p>

                {/* Tool chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {stage.tools.map(t => (
                    <span key={t.name} className="text-[9px] font-mono text-thermax-navy bg-thermax-mist border border-thermax-line px-2 py-0.5 rounded">
                      {t.icon} {t.name}
                    </span>
                  ))}
                </div>

                {/* Stats bar */}
                <div className="flex items-center justify-between pt-2 border-t border-thermax-line">
                  <span className="text-[10px] font-mono text-thermax-slate">
                    {stage.agent.shortId} · {stage.dataSources.length} sources · {totalRows.toLocaleString()} rows
                  </span>
                  <span className="text-[11px] font-bold text-thermax-saffronDeep group-hover:translate-x-1 transition-transform">
                    Open →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
