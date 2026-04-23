'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Stage } from '@/data/stages';
import { useWorkflow, type GateStatus } from './WorkflowContext';

const STATUS_CONFIG: Record<GateStatus, { badge: string; badgeClass: string; overlay: boolean }> = {
  locked: { badge: '🔒 Locked', badgeClass: 'bg-gray-200 text-gray-600', overlay: true },
  available: { badge: 'AI Agent', badgeClass: 'bg-thermax-saffron text-white', overlay: false },
  running: { badge: '⏳ Running', badgeClass: 'bg-blue-500 text-white', overlay: false },
  awaiting_approval: { badge: '⏳ Awaiting HITL', badgeClass: 'bg-amber-500 text-white', overlay: false },
  approved: { badge: '✅ Approved', badgeClass: 'bg-emerald-500 text-white', overlay: false },
  rejected: { badge: '❌ Rejected', badgeClass: 'bg-red-500 text-white', overlay: false },
  skipped: { badge: '⏭ Skipped', badgeClass: 'bg-slate-400 text-white', overlay: false }
};

export default function StageCard({ stage }: { stage: Stage }) {
  const totalRows = stage.dataSources.reduce((a, ds) => a + ds.rowEstimate, 0);
  const { getGateStatus, skipStage } = useWorkflow();
  const status = getGateStatus(stage.slug);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.locked;
  const isLocked = status === 'locked';
  const isSkipped = status === 'skipped';
  const isDisabled = isLocked || isSkipped;

  const canSkip = !stage.mandatory && status === 'available';

  const Wrapper = isDisabled ? 'div' : Link;
  const wrapperProps = isDisabled
    ? { className: `group relative flex flex-col bg-white rounded-xl border border-thermax-line shadow-card overflow-hidden ${isSkipped ? 'opacity-50' : 'opacity-60'} cursor-not-allowed` }
    : { href: `/stages/${stage.slug}` as string, className: 'group relative flex flex-col bg-white rounded-xl border border-thermax-line shadow-card hover:border-thermax-saffron/60 hover:shadow-md transition overflow-hidden' };

  return (
    <Wrapper {...(wrapperProps as any)}>
      {/* Agent avatar banner */}
      <div className="relative h-28 overflow-hidden" style={{ backgroundColor: stage.colorLight }}>
        <Image
          src={stage.agentAvatar}
          alt={stage.agent.name}
          width={400}
          height={200}
          className={`w-full h-full object-cover object-top group-hover:scale-105 transition duration-500 ${isDisabled ? 'grayscale opacity-50' : 'opacity-90'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {isLocked && <div className="absolute inset-0 bg-gray-500/30" />}
        {isSkipped && <div className="absolute inset-0 bg-slate-400/30" />}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2.5 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-mono text-white/70 tracking-wide">
              Stage {stage.number}
            </div>
            <div className="font-bold text-white leading-tight text-[15px] drop-shadow-sm">
              {stage.title}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm ${config.badgeClass}`}>
              {config.badge}
            </span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${stage.mandatory ? 'bg-red-500/80 text-white' : 'bg-white/25 text-white backdrop-blur-sm'}`}>
              {stage.mandatory ? 'REQUIRED' : 'OPTIONAL'}
            </span>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
            style={{ backgroundColor: stage.colorLight }}
          >
            {stage.icon}
          </div>
          <div className="text-[12px] font-semibold text-thermax-navy leading-tight">
            {stage.agent.name}
          </div>
        </div>

        <p className="text-[12px] text-thermax-slate leading-relaxed flex-1">
          {stage.subtitle}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1">
          {stage.tools.map((t) => (
            <span
              key={t.name}
              className="text-[9px] font-mono bg-thermax-mist text-thermax-slate px-1.5 py-0.5 rounded"
            >
              {t.icon} {t.name}
            </span>
          ))}
        </div>

        <div className="mt-3 pt-2.5 border-t border-thermax-line flex items-center justify-between text-[10px]">
          <div className="text-thermax-slate">
            <span className="font-semibold">{stage.agent.shortId}</span> · {stage.dataSources.length} data sources · {totalRows} rows
          </div>
          <div className="flex items-center gap-2">
            {canSkip && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); skipStage(stage.slug); }}
                className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold hover:bg-slate-100 px-1.5 py-0.5 rounded transition"
              >
                Skip →
              </button>
            )}
            {!isDisabled && (
              <span className="text-thermax-saffronDeep font-semibold group-hover:translate-x-0.5 transition">
                Open →
              </span>
            )}
            {isSkipped && (
              <span className="text-slate-400 font-semibold italic">
                Skipped
              </span>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
