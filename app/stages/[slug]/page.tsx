import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stages, getStageBySlug } from '@/data/stages';
import StagePageClient from '@/components/StagePageClient';

export function generateStaticParams() {
  return stages.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const stage = getStageBySlug(params.slug);
  if (!stage) return { title: 'Stage Not Found' };
  return {
    title: `Stage ${stage.number}: ${stage.title} — Thermax Agentic AI`,
    description: `${stage.agent.name} — ${stage.subtitle}. ${stage.tools.length} tools, ${stage.dataSources.length} data sources.`
  };
}

export default function StagePage({ params }: { params: { slug: string } }) {
  const stage = getStageBySlug(params.slug);
  if (!stage) notFound();

  const totalRows = stage.dataSources.reduce((a, ds) => a + ds.rowEstimate, 0);

  return (
    <div>
      {/* Hero banner with agent avatar */}
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
            {/* Agent face circle */}
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

            {/* Text content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-thermax-saffron tracking-wider">
                  STAGE {stage.number} OF 9
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-thermax-saffron text-white">
                  AI Agent
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stage.mandatory ? 'bg-red-500/90 text-white' : 'bg-white/20 text-white backdrop-blur-sm border border-white/30'}`}>
                  {stage.mandatory ? 'REQUIRED' : 'OPTIONAL'}
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
                <span className="text-[11px] text-white/60 font-mono bg-white/10 px-2.5 py-1 rounded">
                  HITL: {stage.hitlApprover}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage navigation breadcrumb */}
      {(stage.upstreamStages.length > 0 || stage.downstreamStages.length > 0) && (
        <div className="bg-thermax-mist border-b border-thermax-line">
          <div className="max-w-7xl mx-auto px-6 py-2 flex flex-wrap items-center gap-4 text-[12px]">
            {stage.upstreamStages.map((s) => {
              const up = getStageBySlug(s);
              return up ? (
                <Link key={s} href={`/stages/${s}`} className="flex items-center gap-1 text-thermax-slate hover:text-thermax-saffronDeep transition">
                  <span>←</span>
                  <span>{up.icon} Stage {up.number}: {up.title}</span>
                </Link>
              ) : null;
            })}
            <span className="text-thermax-navy font-semibold">{stage.icon} Stage {stage.number}: {stage.title}</span>
            {stage.downstreamStages.map((s) => {
              const down = getStageBySlug(s);
              return down ? (
                <Link key={s} href={`/stages/${s}`} className="flex items-center gap-1 text-thermax-slate hover:text-thermax-saffronDeep transition">
                  <span>{down.icon} Stage {down.number}: {down.title}</span>
                  <span>→</span>
                </Link>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <StagePageClient stage={stage} />
      </div>
    </div>
  );
}
