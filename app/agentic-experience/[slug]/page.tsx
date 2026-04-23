import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stages, getStageBySlug } from '@/data/stages';
import AgentChat from '@/components/AgentChat';

export function generateStaticParams() {
  return stages.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const stage = getStageBySlug(params.slug);
  if (!stage) return { title: 'Agent Not Found' };
  return {
    title: `${stage.agent.name} — Agentic Experience`,
    description: `Experience the ${stage.agent.name} independently — ${stage.subtitle}. ${stage.tools.length} tools, ${stage.dataSources.length} data sources. No workflow restrictions.`,
  };
}

export default function AgenticExperienceAgentPage({ params }: { params: { slug: string } }) {
  const stage = getStageBySlug(params.slug);
  if (!stage) notFound();

  const totalRows = stage.dataSources.reduce((a, ds) => a + ds.rowEstimate, 0);
  const stageIndex = stages.findIndex(s => s.slug === stage.slug);
  const prevStage = stageIndex > 0 ? stages[stageIndex - 1] : null;
  const nextStage = stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null;

  return (
    <div>
      {/* Hero banner */}
      <div className="relative h-48 md:h-56 overflow-hidden" style={{ backgroundColor: stage.color }}>
        <Image
          src={stage.agentAvatar}
          alt={stage.agent.name}
          width={1200}
          height={400}
          sizes="100vw"
          className="w-full h-full object-cover object-top opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-thermax-navyDeep/90 via-thermax-navy/80 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full flex items-center gap-6">
            <div className="hidden md:block shrink-0">
              <div className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-thermax-saffron shadow-xl">
                <Image
                  src={stage.agentAvatar}
                  alt={stage.agent.name}
                  width={200}
                  height={200}
                  sizes="112px"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-thermax-saffron tracking-wider">
                  AGENTIC EXPERIENCE · AGENT {stage.number} OF 9
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  UNRESTRICTED
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{stage.title}</h1>
              <p className="text-white/70 text-[14px] max-w-2xl">
                {stage.subtitle} — Powered by <strong className="text-white">{stage.agent.name}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="text-[11px] text-white/60 font-mono bg-white/10 px-2.5 py-1 rounded">
                  {stage.agent.shortId}
                </span>
                <span className="text-[11px] text-white/60 font-mono bg-white/10 px-2.5 py-1 rounded">
                  {stage.tools.length} Tools
                </span>
                <span className="text-[11px] text-white/60 font-mono bg-white/10 px-2.5 py-1 rounded">
                  {stage.dataSources.length} Data Sources · {totalRows.toLocaleString()} Rows
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation between agents */}
      <div className="bg-thermax-mist border-b border-thermax-line">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-4">
            <Link href="/agentic-experience" className="flex items-center gap-1 text-thermax-saffronDeep hover:text-thermax-navy transition font-semibold">
              ← All Agents
            </Link>
            {prevStage && (
              <Link href={`/agentic-experience/${prevStage.slug}`} className="flex items-center gap-1 text-thermax-slate hover:text-thermax-saffronDeep transition">
                <span>←</span>
                <span>{prevStage.icon} {prevStage.title}</span>
              </Link>
            )}
          </div>
          <span className="text-thermax-navy font-semibold">{stage.icon} {stage.agent.name}</span>
          <div>
            {nextStage && (
              <Link href={`/agentic-experience/${nextStage.slug}`} className="flex items-center gap-1 text-thermax-slate hover:text-thermax-saffronDeep transition">
                <span>{nextStage.icon} {nextStage.title}</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Agent chat — no restrictions */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-4 flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 rounded-xl px-5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            Unrestricted Mode
          </span>
          <span className="text-[12px] text-emerald-800/70">
            This agent is fully accessible with no workflow dependencies. Explore its capabilities independently.
          </span>
        </div>
        <AgentChat stage={stage} />
      </div>
    </div>
  );
}
