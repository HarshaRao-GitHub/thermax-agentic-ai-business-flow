'use client';

import { useRouter } from 'next/navigation';
import type { Stage } from '@/data/stages';
import AgentChat from './AgentChat';
import { useWorkflow } from './WorkflowContext';
import Link from 'next/link';

export default function StagePageClient({ stage }: { stage: Stage }) {
  const { getGateStatus, skipStage, loading } = useWorkflow();
  const router = useRouter();
  const status = getGateStatus(stage.slug);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-thermax-saffron border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-[13px] text-thermax-slate">Loading workflow state...</div>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    const prevStageNum = stage.number - 1;
    const prevSlugMap: Record<number, string> = {
      1: 'marketing', 2: 'sales', 3: 'presales', 4: 'engineering',
      5: 'finance-legal', 6: 'hr-pmo', 7: 'site-operations', 8: 'commissioning'
    };
    const prevSlug = prevSlugMap[prevStageNum];

    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-thermax-navy mb-2">Stage Locked</h2>
          <p className="text-[14px] text-thermax-slate leading-relaxed mb-4">
            <strong>Stage {stage.number}: {stage.title}</strong> is locked because the previous stage
            has not been completed and approved yet.
          </p>
          <p className="text-[13px] text-thermax-slate mb-6">
            The HITL (Human-in-the-Loop) approval for Stage {prevStageNum} must be granted
            before this stage becomes available. This enforces the governance principle:
            <em className="text-thermax-saffronDeep"> &ldquo;AI does the work, humans make the calls.&rdquo;</em>
          </p>
          {prevSlug && (
            <Link
              href={`/stages/${prevSlug}`}
              className="inline-block bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition"
            >
              Go to Stage {prevStageNum} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  function handleSkip() {
    if (!confirm(`Skip "${stage.title}"? This stage is optional for supply-only or non-EPC deals. You can proceed to the next stage without running this agent.`)) return;
    skipStage(stage.slug);
    router.push('/');
  }

  return (
    <div>
      {/* Optional stage banner with skip option */}
      {!stage.mandatory && status === 'available' && (
        <div className="mb-4 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
              Optional Stage
            </span>
            <span className="text-[12px] text-sky-800">
              This stage is optional for supply-only or non-EPC deals. You can skip it or run the agent as needed.
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="shrink-0 ml-4 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:text-white bg-white hover:bg-slate-500 border border-slate-300 hover:border-slate-500 rounded-lg transition"
          >
            Skip Stage &rarr;
          </button>
        </div>
      )}

      {/* Mandatory stage indicator */}
      {stage.mandatory && (
        <div className="mb-4 flex items-center gap-3 bg-red-50/50 border border-red-100 rounded-xl px-5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            Required Stage
          </span>
          <span className="text-[12px] text-red-800/70">
            This stage is mandatory. HITL approval is required before the next stage unlocks.
          </span>
        </div>
      )}

      <AgentChat stage={stage} />
    </div>
  );
}
