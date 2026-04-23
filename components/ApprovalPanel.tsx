'use client';

import { useState } from 'react';
import { addApproval, updateApproval } from '@/lib/client-store';

export interface HitlEvent {
  approvalId: string;
  workflowId: string;
  stageNumber: number;
  stageTitle: string;
  agentName: string;
  approverRole: string;
  confidence: number;
  confidenceThreshold: number;
  isMandatory: boolean;
  isConfidenceTriggered: boolean;
  reason: string;
  summary: string;
}

type DecisionState = 'pending' | 'approved' | 'modified' | 'rejected' | 'submitting';

export default function ApprovalPanel({
  hitl,
  onDecision
}: {
  hitl: HitlEvent;
  onDecision?: (decision: 'approved' | 'modified' | 'rejected', detail: string) => void;
}) {
  const [state, setState] = useState<DecisionState>('pending');
  const [approverName, setApproverName] = useState('');
  const [comment, setComment] = useState('');
  const [modifications, setModifications] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showModify, setShowModify] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const confPct = (hitl.confidence * 100).toFixed(0);
  const threshPct = (hitl.confidenceThreshold * 100).toFixed(0);
  const isLowConfidence = hitl.isConfidenceTriggered;

  function handleApprove() {
    if (!approverName.trim()) return;
    setState('submitting');
    const decision = modifications.trim() ? 'modified' : 'approved';
    const now = new Date().toISOString();
    try {
      addApproval({
        id: hitl.approvalId,
        stageSlug: String(hitl.stageNumber),
        stageNumber: hitl.stageNumber,
        status: decision as 'approved' | 'modified',
        decidedBy: approverName.trim(),
        comment: comment.trim() || modifications.trim() || undefined,
        createdAt: now,
        decidedAt: now,
      });
      const msg = `${decision === 'modified' ? 'Approved with modifications' : 'Approved'} by ${approverName.trim()} for Stage ${hitl.stageNumber}: ${hitl.stageTitle}`;
      setState(decision);
      setResult(msg);
      onDecision?.(decision, msg);
    } catch {
      setState('pending');
    }
  }

  function handleReject() {
    if (!approverName.trim() || !rejectReason.trim()) return;
    setState('submitting');
    const now = new Date().toISOString();
    try {
      addApproval({
        id: hitl.approvalId,
        stageSlug: String(hitl.stageNumber),
        stageNumber: hitl.stageNumber,
        status: 'rejected',
        decidedBy: approverName.trim(),
        comment: rejectReason.trim(),
        createdAt: now,
        decidedAt: now,
      });
      const msg = `Rejected by ${approverName.trim()} for Stage ${hitl.stageNumber}: ${hitl.stageTitle}. Reason: ${rejectReason.trim()}`;
      setState('rejected');
      setResult(msg);
      onDecision?.('rejected', msg);
    } catch {
      setState('pending');
    }
  }

  if (state === 'approved' || state === 'modified' || state === 'rejected') {
    return (
      <div
        className={`rounded-xl border-2 p-5 ${
          state === 'rejected'
            ? 'bg-red-50 border-red-300'
            : 'bg-emerald-50 border-emerald-300'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">
            {state === 'rejected' ? '❌' : '✅'}
          </span>
          <div>
            <h3
              className={`font-bold text-base ${
                state === 'rejected' ? 'text-red-800' : 'text-emerald-800'
              }`}
            >
              HITL Decision:{' '}
              {state === 'approved'
                ? 'APPROVED'
                : state === 'modified'
                ? 'APPROVED WITH MODIFICATIONS'
                : 'REJECTED'}
            </h3>
            <p className="text-[12px] text-thermax-slate mt-0.5">
              {hitl.approvalId} &middot; Decided by {approverName} &middot; Stage{' '}
              {hitl.stageNumber}: {hitl.stageTitle}
            </p>
          </div>
        </div>
        {result && (
          <p className="text-[13px] text-thermax-navy mt-2 leading-relaxed">
            {result}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center gap-3">
        <span className="text-2xl">🛡️</span>
        <div className="flex-1">
          <h3 className="font-bold text-white text-base">
            HITL Approval Gate — Stage {hitl.stageNumber}
          </h3>
          <p className="text-[11px] text-white/80">
            {hitl.approvalId} &middot; {hitl.agentName} &rarr;{' '}
            {hitl.approverRole}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
            isLowConfidence
              ? 'bg-red-600 text-white'
              : 'bg-white/20 text-white'
          }`}
        >
          {isLowConfidence ? '⚠ LOW CONFIDENCE' : 'MANDATORY REVIEW'}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Reason and confidence */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <div className="text-[10px] font-mono uppercase text-amber-700 mb-1">
              Reason for HITL Gate
            </div>
            <p className="text-[12px] text-thermax-navy leading-relaxed">
              {hitl.reason}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <div className="text-[10px] font-mono uppercase text-amber-700 mb-1">
              Agent Confidence
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isLowConfidence ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <span
                className={`text-lg font-bold font-mono ${
                  isLowConfidence ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {confPct}%
              </span>
            </div>
            <p className="text-[10px] text-thermax-slate mt-1">
              Threshold: {threshPct}% &middot;{' '}
              {isLowConfidence
                ? 'Below threshold — escalation triggered'
                : 'Above threshold — standard review'}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-[10px] font-mono uppercase text-amber-700 mb-1">
            Agent Output Summary
          </div>
          <p className="text-[12px] text-thermax-navy">{hitl.summary}</p>
        </div>

        {/* Approver info */}
        <div>
          <label className="block text-[11px] font-semibold text-thermax-navy mb-1">
            Your Name (as {hitl.approverRole})
          </label>
          <input
            type="text"
            value={approverName}
            onChange={(e) => setApproverName(e.target.value)}
            placeholder={`Enter your name as ${hitl.approverRole}`}
            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            disabled={state === 'submitting'}
          />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-[11px] font-semibold text-thermax-navy mb-1">
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any observations or notes..."
            rows={2}
            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            disabled={state === 'submitting'}
          />
        </div>

        {/* Modify section */}
        {showModify && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <label className="block text-[11px] font-semibold text-blue-800 mb-1">
              Modifications (describe what to change)
            </label>
            <textarea
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              placeholder="Describe the modifications required before advancing..."
              rows={3}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              disabled={state === 'submitting'}
            />
          </div>
        )}

        {/* Reject section */}
        {showReject && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <label className="block text-[11px] font-semibold text-red-800 mb-1">
              Rejection Reason (required)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this output is being rejected and what the agent should redo..."
              rows={3}
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              disabled={state === 'submitting'}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!showReject && (
            <button
              onClick={handleApprove}
              disabled={!approverName.trim() || state === 'submitting'}
              className="flex items-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span>✅</span>
              {modifications.trim() ? 'Approve with Modifications' : 'Approve'}
            </button>
          )}

          {!showReject && !showModify && (
            <button
              onClick={() => setShowModify(true)}
              disabled={state === 'submitting'}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              <span>✏️</span> Modify + Approve
            </button>
          )}

          {!showReject && (
            <button
              onClick={() => {
                setShowReject(true);
                setShowModify(false);
              }}
              disabled={state === 'submitting'}
              className="flex items-center gap-2 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
            >
              <span>❌</span> Reject
            </button>
          )}

          {showReject && (
            <>
              <button
                onClick={handleReject}
                disabled={
                  !approverName.trim() ||
                  !rejectReason.trim() ||
                  state === 'submitting'
                }
                className="flex items-center gap-2 bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <span>❌</span> Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowReject(false);
                  setRejectReason('');
                }}
                className="text-thermax-slate text-sm underline hover:text-thermax-navy"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {state === 'submitting' && (
          <div className="text-[12px] text-amber-700 animate-pulse">
            Submitting HITL decision...
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-amber-200 flex items-center justify-between text-[10px] text-thermax-slate">
          <span>
            Delegation of Authority: {hitl.isMandatory ? 'Mandatory Review' : 'Standard'}
          </span>
          <span>
            Next: Stage {hitl.stageNumber < 9 ? hitl.stageNumber + 1 : '1 (loop)'}{' '}
            blocked until {hitl.approverRole} decides
          </span>
        </div>
      </div>
    </div>
  );
}
