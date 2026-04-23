'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApprovals, addApproval, updateApproval, type ApprovalRecord } from '@/lib/client-store';

interface ApprovalRequest {
  id: string;
  workflowId: string;
  stageNumber: number;
  stageSlug: string;
  stageTitle: string;
  agentId: string;
  agentName: string;
  approverRole: string;
  reason: string;
  confidence: number;
  isMandatory: boolean;
  isConfidenceTriggered: boolean;
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  comment?: string;
  modifications?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
}

const STAGE_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#8B5CF6',
  3: '#06B6D4',
  4: '#EF4444',
  5: '#F59E0B',
  6: '#10B981',
  7: '#6366F1',
  8: '#EC4899',
  9: '#14B8A6'
};

export default function ApprovalQueueClient() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    try {
      const records = getApprovals();
      const mapped: ApprovalRequest[] = records.map(r => ({
        id: r.id,
        workflowId: '',
        stageNumber: r.stageNumber,
        stageSlug: r.stageSlug,
        stageTitle: `Stage ${r.stageNumber}`,
        agentId: '',
        agentName: `Stage ${r.stageNumber} Agent`,
        approverRole: 'Approver',
        reason: r.comment ?? 'HITL Gate',
        confidence: 0.85,
        isMandatory: true,
        isConfidenceTriggered: false,
        summary: r.comment ?? '',
        status: r.status === 'modified' ? 'modified' : r.status,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
        decidedBy: r.decidedBy,
        comment: r.comment,
      }));
      setApprovals(mapped);
      const total = mapped.length;
      const pending = mapped.filter(a => a.status === 'pending').length;
      const approved = mapped.filter(a => a.status === 'approved' || a.status === 'modified').length;
      const rejected = mapped.filter(a => a.status === 'rejected').length;
      setStats({ total, pending, approved, rejected, escalated: 0 });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onFocus = () => fetchData();
    const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('thermax_')) fetchData(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchData]);

  const filtered = approvals.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'approved') return a.status === 'approved' || a.status === 'modified';
    return a.status === filter;
  });

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard
          n={stats.total}
          label="Total Decisions"
          color="#0A2540"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <StatCard
          n={stats.pending}
          label="Pending Review"
          color="#F59E0B"
          onClick={() => setFilter('pending')}
          active={filter === 'pending'}
          pulse={stats.pending > 0}
        />
        <StatCard
          n={stats.approved}
          label="Approved"
          color="#10B981"
          onClick={() => setFilter('approved')}
          active={filter === 'approved'}
        />
        <StatCard
          n={stats.rejected}
          label="Rejected"
          color="#EF4444"
          onClick={() => setFilter('rejected')}
          active={filter === 'rejected'}
        />
        <StatCard
          n={stats.escalated}
          label="Conf. Escalated"
          color="#DC2626"
        />
      </div>

      {/* Queue */}
      {loading ? (
        <div className="text-center py-16 text-thermax-slate">
          Loading approval queue...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="font-bold text-thermax-navy text-lg">
            No {filter === 'all' ? '' : filter} approvals yet
          </h3>
          <p className="text-[13px] text-thermax-slate mt-1 max-w-md mx-auto">
            Run any stage agent to generate HITL approval requests.
            Each agent run creates a mandatory approval gate that appears here.
          </p>
          <Link
            href="/stages/marketing"
            className="inline-block mt-4 bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition text-sm"
          >
            Start Stage 1: Market Intelligence
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} onRefresh={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  onRefresh
}: {
  approval: ApprovalRequest;
  onRefresh: () => void;
}) {
  const [approverName, setApproverName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const color = STAGE_COLORS[approval.stageNumber] ?? '#6366F1';
  const confPct = (approval.confidence * 100).toFixed(0);
  const isPending = approval.status === 'pending';

  function handleQuickApprove() {
    if (!approverName.trim()) return;
    setSubmitting(true);
    updateApproval(approval.id, {
      status: 'approved',
      decidedBy: approverName.trim(),
      decidedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    onRefresh();
  }

  function handleQuickReject() {
    if (!approverName.trim()) return;
    setSubmitting(true);
    updateApproval(approval.id, {
      status: 'rejected',
      decidedBy: approverName.trim(),
      comment: 'Rejected via approval queue',
      decidedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    onRefresh();
  }

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
        isPending ? 'border-amber-300' : 'border-thermax-line'
      }`}
    >
      <div className="flex items-stretch">
        {/* Stage indicator */}
        <div
          className="w-2 shrink-0"
          style={{ backgroundColor: color }}
        />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={approval.status} />
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono font-bold text-white px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: color }}
                  >
                    S{approval.stageNumber}
                  </span>
                  <span className="font-semibold text-thermax-navy text-[14px]">
                    {approval.stageTitle}
                  </span>
                  <span className="text-[11px] text-thermax-slate">
                    &mdash; {approval.agentName}
                  </span>
                </div>
                <div className="text-[11px] text-thermax-slate mt-0.5">
                  {approval.id} &middot; {approval.approverRole} &middot;{' '}
                  Confidence: {confPct}%
                  {approval.isConfidenceTriggered && (
                    <span className="text-red-600 font-semibold ml-1">
                      ESCALATED
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-[10px] text-thermax-slate shrink-0">
              <div>
                {new Date(approval.createdAt).toLocaleTimeString()}
              </div>
              {approval.decidedAt && (
                <div className="text-emerald-600">
                  Decided: {new Date(approval.decidedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <p className="text-[12px] text-thermax-slate mt-2">{approval.reason}</p>

          {approval.decidedBy && (
            <p className="text-[12px] mt-1">
              <span className="font-semibold text-thermax-navy">
                {approval.decidedBy}
              </span>
              {approval.comment && (
                <span className="text-thermax-slate">
                  {' '}
                  &mdash; {approval.comment}
                </span>
              )}
            </p>
          )}

          {isPending && (
            <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder={`Your name (as ${approval.approverRole})`}
                className="border border-amber-300 rounded-lg px-3 py-1.5 text-[12px] w-60 focus:outline-none focus:ring-2 focus:ring-amber-400"
                disabled={submitting}
              />
              <button
                onClick={handleQuickApprove}
                disabled={!approverName.trim() || submitting}
                className="bg-emerald-600 text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                Approve
              </button>
              <button
                onClick={handleQuickReject}
                disabled={!approverName.trim() || submitting}
                className="bg-red-600 text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                Reject
              </button>
              <Link
                href={`/stages/${approval.stageSlug}`}
                className="text-[12px] text-thermax-saffron font-semibold hover:underline"
              >
                Open Stage &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'PENDING' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'APPROVED' },
    modified: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'MODIFIED' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'REJECTED' }
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      className={`${s.bg} ${s.text} text-[9px] font-mono font-bold px-2 py-0.5 rounded-full`}
    >
      {s.label}
    </span>
  );
}

function StatCard({
  n,
  label,
  color,
  onClick,
  active,
  pulse
}: {
  n: number;
  label: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 text-left transition hover:shadow-md ${
        active ? 'ring-2 ring-offset-1' : ''
      }`}
      style={active ? { borderColor: color, ringColor: color } as React.CSSProperties : {}}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-2xl font-bold font-mono ${pulse ? 'animate-pulse' : ''}`}
          style={{ color }}
        >
          {n}
        </span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-thermax-slate mt-1">
        {label}
      </div>
    </button>
  );
}
