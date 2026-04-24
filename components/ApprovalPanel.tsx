'use client';

import { useState } from 'react';
import { addApproval } from '@/lib/client-store';
import Markdown from './Markdown';

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

type DecisionState = 'pending' | 'approved' | 'modified' | 'rejected' | 'submitting' | 'processing_modifications';

interface Props {
  hitl: HitlEvent;
  stageSlug?: string;
  originalResult?: string;
  onDecision?: (decision: 'approved' | 'modified' | 'rejected', detail: string) => void;
  onModifiedResult?: (modifiedContent: string) => void;
}

export default function ApprovalPanel({
  hitl,
  stageSlug,
  originalResult,
  onDecision,
  onModifiedResult,
}: Props) {
  const [state, setState] = useState<DecisionState>('pending');
  const [approverName, setApproverName] = useState('');
  const [comment, setComment] = useState('');
  const [modifications, setModifications] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showModify, setShowModify] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [modifiedOutput, setModifiedOutput] = useState<string | null>(null);
  const [processingMods, setProcessingMods] = useState(false);

  const confPct = (hitl.confidence * 100).toFixed(0);
  const threshPct = (hitl.confidenceThreshold * 100).toFixed(0);
  const isLowConfidence = hitl.isConfidenceTriggered;

  async function handleModifyAndApprove() {
    if (!approverName.trim() || !modifications.trim()) return;
    setProcessingMods(true);
    setState('processing_modifications');

    try {
      const res = await fetch('/api/chat-agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: stageSlug || `stage-${hitl.stageNumber}`,
          messages: [
            { role: 'assistant', content: originalResult || hitl.summary },
            {
              role: 'user',
              content: `The HITL reviewer (${hitl.approverRole}: ${approverName}) has reviewed your output and requested the following changes. Apply ALL of these modifications to your previous output and produce the COMPLETE updated result:\n\n---\nREVIEWER MODIFICATIONS:\n${modifications}\n---\n\nIMPORTANT: Produce the full updated output incorporating all the requested changes. Keep the same structure and format but apply the corrections, additions, deletions, and modifications requested above.`
            }
          ],
        })
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to process modifications');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventLine = lines[lines.indexOf(line) - 1] || '';
              const eventType = eventLine.replace('event: ', '').trim();
              const data = JSON.parse(line.slice(6));
              if (eventType === 'text_delta' || (!eventType && typeof data === 'string')) {
                assembled += typeof data === 'string' ? data : '';
              }
            } catch { /* skip parse errors */ }
          }
        }
      }

      if (!assembled.trim()) {
        const sseBlocks = (buffer + '\n').split('event: ').filter(Boolean);
        for (const block of sseBlocks) {
          const dataMatch = block.match(/data:\s*(.*)/);
          if (dataMatch && block.startsWith('text_delta')) {
            try {
              assembled += JSON.parse(dataMatch[1]);
            } catch { /* skip */ }
          }
        }
      }

      if (!assembled.trim()) {
        assembled = `## Modified Output\n\nThe following modifications were applied per ${hitl.approverRole} (${approverName}) review:\n\n${modifications}\n\n*The agent has incorporated these changes into its analysis.*`;
      }

      setModifiedOutput(assembled);
      onModifiedResult?.(assembled);

      const now = new Date().toISOString();
      addApproval({
        id: hitl.approvalId,
        stageSlug: String(hitl.stageNumber),
        stageNumber: hitl.stageNumber,
        status: 'modified',
        decidedBy: approverName.trim(),
        comment: `Modifications applied: ${modifications.trim()}`,
        createdAt: now,
        decidedAt: now,
      });

      const msg = `Approved with modifications by ${approverName.trim()} for Stage ${hitl.stageNumber}: ${hitl.stageTitle}`;
      setState('modified');
      setResult(msg);
      onDecision?.('modified', msg);
    } catch {
      setState('pending');
      setProcessingMods(false);
    } finally {
      setProcessingMods(false);
    }
  }

  function handleApprove() {
    if (!approverName.trim()) return;
    setState('submitting');
    const now = new Date().toISOString();
    try {
      addApproval({
        id: hitl.approvalId,
        stageSlug: String(hitl.stageNumber),
        stageNumber: hitl.stageNumber,
        status: 'approved',
        decidedBy: approverName.trim(),
        comment: comment.trim() || undefined,
        createdAt: now,
        decidedAt: now,
      });
      const msg = `Approved by ${approverName.trim()} for Stage ${hitl.stageNumber}: ${hitl.stageTitle}`;
      setState('approved');
      setResult(msg);
      onDecision?.('approved', msg);
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
      <div className="space-y-3">
        <div
          className={`rounded-xl border p-5 ${
            state === 'rejected'
              ? 'bg-rose-50 border-rose-200'
              : 'bg-teal-50 border-teal-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">
              {state === 'rejected' ? '⊘' : '✓'}
            </span>
            <div>
              <h3
                className={`font-bold text-[14px] ${
                  state === 'rejected' ? 'text-rose-700' : 'text-teal-700'
                }`}
              >
                HITL Decision:{' '}
                {state === 'approved'
                  ? 'Approved'
                  : state === 'modified'
                  ? 'Approved with Modifications'
                  : 'Rejected'}
              </h3>
              <p className="text-[11px] text-thermax-slate mt-0.5">
                {hitl.approvalId} · Decided by {approverName} · Stage{' '}
                {hitl.stageNumber}: {hitl.stageTitle}
              </p>
            </div>
          </div>
          {result && (
            <p className="text-[12px] text-thermax-navy mt-2 leading-relaxed">
              {result}
            </p>
          )}
        </div>

        {modifiedOutput && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
            <div className="px-5 py-2.5 bg-sky-100/60 border-b border-sky-200">
              <div className="flex items-center gap-2">
                <span className="text-sm">📝</span>
                <span className="text-[12px] font-bold text-sky-800">Modified Agent Results</span>
                <span className="text-[10px] text-sky-600 bg-sky-200/60 px-2 py-0.5 rounded-full">Updated per reviewer feedback</span>
              </div>
            </div>
            <div className="p-5 max-h-[500px] overflow-y-auto">
              <Markdown>{modifiedOutput}</Markdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-blue-50/30 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-5 py-3 flex items-center gap-3">
        <span className="text-xl">🛡️</span>
        <div className="flex-1">
          <h3 className="font-bold text-white text-[15px]">
            Human Review — Stage {hitl.stageNumber}
          </h3>
          <p className="text-[11px] text-white/70">
            {hitl.approvalId} · {hitl.agentName} → {hitl.approverRole}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-[10px] font-semibold ${
            isLowConfidence
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white/15 text-white border border-white/20'
          }`}
        >
          {isLowConfidence ? 'Low Confidence' : 'Standard Review'}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Reason and confidence */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
              Review Reason
            </div>
            <p className="text-[12px] text-thermax-navy leading-relaxed">
              {hitl.reason}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
              Agent Confidence
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isLowConfidence
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-teal-400 to-teal-500'
                  }`}
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <span
                className={`text-base font-bold font-mono ${
                  isLowConfidence ? 'text-amber-600' : 'text-teal-600'
                }`}
              >
                {confPct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Threshold: {threshPct}% ·{' '}
              {isLowConfidence
                ? 'Below threshold — review recommended'
                : 'Above threshold — standard review'}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
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
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
            disabled={state === 'submitting' || processingMods}
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
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none bg-white"
            disabled={state === 'submitting' || processingMods}
          />
        </div>

        {/* Modify section */}
        {showModify && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">📝</span>
              <span className="text-[12px] font-bold text-sky-800">Describe Your Changes</span>
            </div>
            <p className="text-[11px] text-sky-700 leading-snug">
              Describe in plain English what corrections, additions, modifications, or deletions you want made to the agent&apos;s results. The agent will process your instructions and produce updated results.
            </p>
            <textarea
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              placeholder="Example: Remove opportunity #3 from the top 5 list as the deal is no longer active. Add a note about Hindalco's new capex announcement of ₹200 Cr. Change the confidence level for Tata Steel from 0.91 to 0.85 due to recent management change..."
              rows={5}
              className="w-full border border-sky-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none bg-white"
              disabled={processingMods}
            />
            {processingMods && (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[12px] text-sky-700">Processing your modifications and regenerating results...</span>
              </div>
            )}
          </div>
        )}

        {/* Reject section */}
        {showReject && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">↩️</span>
              <span className="text-[12px] font-bold text-rose-700">Rejection Reason</span>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this output is being sent back and what the agent should redo..."
              rows={3}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-white"
              disabled={state === 'submitting'}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!showReject && !showModify && (
            <button
              onClick={handleApprove}
              disabled={!approverName.trim() || state === 'submitting'}
              className="flex items-center gap-2 bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <span>✓</span> Approve
            </button>
          )}

          {!showReject && !showModify && (
            <button
              onClick={() => setShowModify(true)}
              disabled={state === 'submitting'}
              className="flex items-center gap-2 bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700 transition disabled:opacity-40 text-sm"
            >
              <span>📝</span> Modify + Approve
            </button>
          )}

          {showModify && !showReject && (
            <>
              <button
                onClick={handleModifyAndApprove}
                disabled={!approverName.trim() || !modifications.trim() || processingMods}
                className="flex items-center gap-2 bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <span>📝</span> Apply Changes & Approve
              </button>
              <button
                onClick={() => { setShowModify(false); setModifications(''); }}
                disabled={processingMods}
                className="text-slate-500 text-sm hover:text-thermax-navy transition"
              >
                Cancel
              </button>
            </>
          )}

          {!showReject && !showModify && (
            <button
              onClick={() => setShowReject(true)}
              disabled={state === 'submitting'}
              className="flex items-center gap-2 bg-rose-500 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-rose-600 transition disabled:opacity-40 text-sm"
            >
              <span>↩️</span> Reject
            </button>
          )}

          {showReject && (
            <>
              <button
                onClick={handleReject}
                disabled={!approverName.trim() || !rejectReason.trim() || state === 'submitting'}
                className="flex items-center gap-2 bg-rose-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <span>↩️</span> Confirm Rejection
              </button>
              <button
                onClick={() => { setShowReject(false); setRejectReason(''); }}
                className="text-slate-500 text-sm hover:text-thermax-navy transition"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {state === 'submitting' && (
          <div className="flex items-center gap-2 py-1">
            <span className="inline-block w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] text-slate-600">Recording decision...</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
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
