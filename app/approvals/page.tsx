import type { Metadata } from 'next';
import ApprovalQueueClient from '@/components/ApprovalQueueClient';

export const metadata: Metadata = {
  title: 'HITL Approval Queue — Thermax Agentic AI',
  description:
    'Human-in-the-Loop approval queue — pending, approved, and rejected agent decisions across all 9 stages.'
};

export default function ApprovalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-thermax-mist to-white">
      <section className="bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-16">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] font-mono mb-5">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Human-in-the-Loop Control Plane
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            HITL Approval Queue
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl text-[15px] leading-relaxed">
            Every agent output must pass through a mandatory approval gate before
            the workflow advances. Review pending approvals, make decisions, and
            track the audit trail.
          </p>
          <p className="mt-2 text-amber-200 font-semibold italic text-[14px]">
            &ldquo;AI does the work, humans make the calls.&rdquo;
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-8">
        <ApprovalQueueClient />
      </section>
    </div>
  );
}
