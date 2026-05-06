'use client';

import { useState, useCallback } from 'react';
import { addApproval } from '@/lib/client-store';
import Markdown from './Markdown';
import type { BiasCheckResult, CriticalFactorResult } from '@/data/hitl-bias-config';

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

// ── Hallucination types ──
interface HallucinationClaim { id: number; text: string; category: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; riskReason: string; verificationStatus: string; groundedIn: string; }
interface HallucinationResult {
  overallRiskScore: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; summary: string; claims: HallucinationClaim[];
  mitigationPlan: { immediateActions: string[]; removalCandidates: string[]; regenerationInstructions: string; groundingSuggestions: string[]; };
  confidenceFactors: { dataGrounding: number; logicalConsistency: number; specificityCheck: number; contextAlignment: number; };
}

type CheckStatus = 'idle' | 'checking' | 'passed' | 'issues' | 'error' | 'mitigated';
type DecisionState = 'pending' | 'approved' | 'modified' | 'rejected' | 'submitting' | 'processing_modifications' | 'review_modifications';

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  LOW:      { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  MEDIUM:   { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  HIGH:     { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-800',  dot: 'bg-orange-500' },
  CRITICAL: { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     badge: 'bg-red-100 text-red-800',        dot: 'bg-red-500' },
};
function rc(level: string) { return RISK_COLORS[level] || RISK_COLORS.LOW; }

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

  // ── AI Quality Checks State ──
  const [halStatus, setHalStatus] = useState<CheckStatus>('idle');
  const [halResult, setHalResult] = useState<HallucinationResult | null>(null);
  const [halMitigated, setHalMitigated] = useState(false);
  const [biasStatus, setBiasStatus] = useState<CheckStatus>('idle');
  const [biasResult, setBiasResult] = useState<BiasCheckResult | null>(null);
  const [biasMitigated, setBiasMitigated] = useState(false);
  const [critStatus, setCritStatus] = useState<CheckStatus>('idle');
  const [critResult, setCritResult] = useState<CriticalFactorResult | null>(null);
  const [critMitigated, setCritMitigated] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<'hal' | 'bias' | 'crit' | null>(null);

  const allChecksRun = halStatus !== 'idle' && halStatus !== 'checking' && biasStatus !== 'idle' && biasStatus !== 'checking' && critStatus !== 'idle' && critStatus !== 'checking';
  const halPassed = halStatus === 'passed' || halMitigated;
  const biasPassed = biasStatus === 'passed' || biasMitigated;
  const critPassed = critStatus === 'passed' || critMitigated;
  const allChecksPassed = allChecksRun && halPassed && biasPassed && critPassed;
  const checksNotStarted = halStatus === 'idle' && biasStatus === 'idle' && critStatus === 'idle';

  const contentForCheck = modifiedOutput || originalResult || hitl.summary;

  const runAllChecks = useCallback(async () => {
    if (!contentForCheck) return;
    setHalStatus('checking'); setBiasStatus('checking'); setCritStatus('checking');
    setHalResult(null); setBiasResult(null); setCritResult(null);
    setHalMitigated(false); setBiasMitigated(false); setCritMitigated(false);
    const payload = JSON.stringify({ content: contentForCheck, originalPrompt: '', context: `Thermax Agentic AI - Stage ${hitl.stageNumber}: ${hitl.stageTitle} — ${hitl.agentName}` });
    const headers = { 'Content-Type': 'application/json' };

    fetch('/api/hallucination-check', { method: 'POST', headers, body: payload })
      .then(async res => { if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed'); return res.json(); })
      .then((d: HallucinationResult) => { setHalResult(d); setHalStatus(d.claims.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL').length === 0 && d.riskLevel === 'LOW' ? 'passed' : 'issues'); })
      .catch(() => { setHalStatus('error'); });

    fetch('/api/bias-check', { method: 'POST', headers, body: payload })
      .then(async res => { if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed'); return res.json(); })
      .then((d: BiasCheckResult) => { setBiasResult(d); setBiasStatus(d.detectedBiases.filter(b => b.severity === 'HIGH' || b.severity === 'CRITICAL').length === 0 && d.riskLevel === 'LOW' ? 'passed' : 'issues'); })
      .catch(() => { setBiasStatus('error'); });

    fetch('/api/critical-factors-check', { method: 'POST', headers, body: payload })
      .then(async res => { if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed'); return res.json(); })
      .then((d: CriticalFactorResult) => { setCritResult(d); setCritStatus(d.factors.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length === 0 && d.riskLevel === 'LOW' ? 'passed' : 'issues'); })
      .catch(() => { setCritStatus('error'); });
  }, [contentForCheck, hitl.stageNumber, hitl.stageTitle, hitl.agentName]);

  function getEffStatus(status: CheckStatus, mitigated: boolean): CheckStatus { return mitigated ? 'mitigated' : status; }

  const confPct = ((hitl.confidence ?? 0) * 100).toFixed(0);
  const threshPct = ((hitl.confidenceThreshold ?? 0.8) * 100).toFixed(0);
  const isLowConfidence = hitl.isConfidenceTriggered ?? false;

  async function handleApplyChanges() {
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

        let currentEvt = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvt = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvt === 'text_delta' || (!currentEvt && typeof data === 'string')) {
                assembled += typeof data === 'string' ? data : '';
              }
            } catch { /* skip parse errors */ }
            currentEvt = '';
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
      setState('review_modifications');
    } catch {
      setState('pending');
      setProcessingMods(false);
    } finally {
      setProcessingMods(false);
    }
  }

  function handleApproveModified() {
    if (!approverName.trim()) return;
    setState('submitting');
    const now = new Date().toISOString();
    try {
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
      setState('review_modifications');
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

  const isDecided = state === 'approved' || state === 'modified' || state === 'rejected';

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${isDecided ? 'border-slate-300 opacity-75 pointer-events-none select-none' : 'border-slate-200'} bg-gradient-to-b from-slate-50 to-blue-50/30`}>
      {/* Decision banner */}
      {isDecided && (
        <div className={`px-5 py-3 flex items-center gap-3 ${state === 'rejected' ? 'bg-rose-100 border-b border-rose-200' : 'bg-teal-100 border-b border-teal-200'}`}>
          <span className="text-xl">{state === 'rejected' ? '⊘' : '✓'}</span>
          <div className="flex-1">
            <h3 className={`font-bold text-[14px] ${state === 'rejected' ? 'text-rose-700' : 'text-teal-700'}`}>
              HITL Decision: {state === 'approved' ? 'Approved' : state === 'modified' ? 'Approved with Modifications' : 'Rejected'}
            </h3>
            <p className="text-[11px] text-thermax-slate mt-0.5">
              {hitl.approvalId} · Decided by {approverName} · Stage {hitl.stageNumber}: {hitl.stageTitle}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${state === 'rejected' ? 'bg-rose-200 text-rose-800' : 'bg-teal-200 text-teal-800'}`}>
            {state === 'rejected' ? 'Closed — Rejected' : 'Closed — Approved'}
          </div>
        </div>
      )}

      {/* Modified output (shown after approval with modifications) */}
      {isDecided && modifiedOutput && (
        <div className="border-b border-sky-200 bg-sky-50/50">
          <div className="px-5 py-2.5 bg-sky-100/60 border-b border-sky-200">
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <span className="text-[12px] font-bold text-sky-800">Modified Agent Results</span>
              <span className="text-[10px] text-sky-600 bg-sky-200/60 px-2 py-0.5 rounded-full">Updated per reviewer feedback</span>
            </div>
          </div>
          <div className="p-5 max-h-[300px] overflow-y-auto pointer-events-auto">
            <Markdown>{modifiedOutput}</Markdown>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`px-5 py-3 flex items-center gap-3 ${isDecided ? 'bg-slate-400' : 'bg-gradient-to-r from-slate-600 to-slate-500'}`}>
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

        {/* ── AI Quality Checks (Hallucination + Bias + Critical Factors) ── */}
        {!isDecided && (
          <div className="border-2 border-indigo-300 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🔬</span>
                <div>
                  <h4 className="text-[13px] font-black text-white tracking-tight">AI Output Quality Checks</h4>
                  <p className="text-[9px] text-white/70">Hallucination · Bias · Critical Factors — must pass before approval</p>
                </div>
              </div>
              <span className="text-[8px] font-bold text-red-200 bg-red-500/25 px-2 py-0.5 rounded-full border border-red-300/30">MANDATORY</span>
            </div>

            {checksNotStarted ? (
              <div className="px-4 py-3">
                <button onClick={runAllChecks} className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-[12px] font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  Run All Quality Checks (Hallucination + Bias + Critical Factors)
                </button>
              </div>
            ) : (
              <>
                {/* Status bar */}
                <div className="px-4 py-2.5 border-b border-indigo-200 bg-white/50">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Hallucination', status: getEffStatus(halStatus, halMitigated), level: halResult?.riskLevel },
                      { label: 'Bias', status: getEffStatus(biasStatus, biasMitigated), level: biasResult?.riskLevel },
                      { label: 'Critical Factors', status: getEffStatus(critStatus, critMitigated), level: critResult?.riskLevel },
                    ].map(g => {
                      const ok = g.status === 'passed' || g.status === 'mitigated';
                      const chk = g.status === 'checking';
                      const iss = g.status === 'issues';
                      return (
                        <div key={g.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${ok ? 'bg-emerald-50 border-emerald-200' : chk ? 'bg-blue-50 border-blue-200' : iss ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                          {chk ? <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" /> : <div className={`w-3 h-3 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : iss ? 'bg-orange-500' : 'bg-red-500'}`} />}
                          <div>
                            <p className="text-[8px] font-bold text-gray-700">{g.label}</p>
                            <p className={`text-[7px] font-black ${ok ? 'text-emerald-600' : chk ? 'text-blue-600' : iss ? 'text-orange-600' : 'text-red-600'}`}>
                              {g.status === 'passed' ? 'PASSED' : g.status === 'mitigated' ? 'MITIGATED' : g.status === 'checking' ? 'ANALYZING...' : g.status === 'error' ? 'ERROR' : g.level || 'ISSUES'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expandable check sections */}
                {halStatus !== 'idle' && (
                  <div className="border-b border-gray-200">
                    <button onClick={() => setExpandedCheck(expandedCheck === 'hal' ? null : 'hal')} className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50/50 transition">
                      <div className="flex items-center gap-2"><span className="text-sm">🔍</span><span className="text-[11px] font-bold text-gray-800">Hallucination</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${getEffStatus(halStatus, halMitigated) === 'passed' || getEffStatus(halStatus, halMitigated) === 'mitigated' ? 'bg-emerald-100 text-emerald-800' : halStatus === 'checking' ? 'bg-blue-100 text-blue-700 animate-pulse' : halStatus === 'issues' ? rc(halResult?.riskLevel || 'MEDIUM').badge : 'bg-red-100 text-red-700'}`}>
                          {getEffStatus(halStatus, halMitigated) === 'passed' ? 'Passed' : getEffStatus(halStatus, halMitigated) === 'mitigated' ? 'Mitigated' : halStatus === 'checking' ? 'Analyzing...' : halStatus === 'error' ? 'Error' : 'Issues Found'}
                        </span>
                      </div>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedCheck === 'hal' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {expandedCheck === 'hal' && halResult && (
                      <div className="px-4 pb-3 space-y-2">
                        <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-gray-200">
                          <div className="relative shrink-0"><svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="6" /><circle cx="50" cy="50" r="38" fill="none" className={rc(halResult.riskLevel).text} stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${((100 - halResult.overallRiskScore) / 100) * 239} 239`} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className={`text-xs font-black ${rc(halResult.riskLevel).text}`}>{100 - halResult.overallRiskScore}%</span><span className="text-[5px] text-gray-500 font-bold">TRUST</span></div></div>
                          <div className="flex-1"><div className="flex items-center gap-1.5 mb-0.5"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${rc(halResult.riskLevel).badge}`}>{halResult.riskLevel} RISK</span><span className="text-[9px] text-gray-500">{halResult.claims.length} claims</span></div><p className="text-[10px] text-gray-700">{halResult.summary}</p></div>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200"><div className="grid grid-cols-4 gap-2">{[{l:'Grounding',v:halResult.confidenceFactors.dataGrounding},{l:'Logic',v:halResult.confidenceFactors.logicalConsistency},{l:'Specificity',v:halResult.confidenceFactors.specificityCheck},{l:'Alignment',v:halResult.confidenceFactors.contextAlignment}].map(f=>(<div key={f.l} className="text-center"><div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${f.v>=70?'bg-emerald-500':f.v>=40?'bg-amber-500':'bg-red-500'}`} style={{width:`${f.v}%`}} /></div><p className="text-[7px] text-gray-500 mt-0.5">{f.l}</p><p className={`text-[8px] font-bold ${f.v>=70?'text-emerald-700':f.v>=40?'text-amber-700':'text-red-700'}`}>{f.v}%</p></div>))}</div></div>
                        {halResult.claims.filter(c => c.riskLevel !== 'LOW').length > 0 && (
                          <div className="bg-white rounded-lg p-2.5 border border-gray-200 max-h-[150px] overflow-y-auto space-y-1.5">
                            {halResult.claims.filter(c => c.riskLevel !== 'LOW').map(cl => (
                              <div key={cl.id} className={`${rc(cl.riskLevel).bg} border ${rc(cl.riskLevel).border} rounded-md p-2`}>
                                <div className="flex items-center gap-1.5 mb-0.5"><span className={`text-[7px] font-black px-1 py-0.5 rounded ${rc(cl.riskLevel).badge}`}>{cl.riskLevel}</span><span className="text-[7px] text-gray-400">{cl.category}</span></div>
                                <p className="text-[9px] text-gray-900">&ldquo;{cl.text}&rdquo;</p><p className="text-[8px] text-gray-500 mt-0.5">{cl.riskReason}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {halStatus === 'issues' && !halMitigated && (
                          <button onClick={() => setHalMitigated(true)} className="w-full py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">✓ Acknowledge & Mark as Mitigated</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {biasStatus !== 'idle' && (
                  <div className="border-b border-gray-200">
                    <button onClick={() => setExpandedCheck(expandedCheck === 'bias' ? null : 'bias')} className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50/50 transition">
                      <div className="flex items-center gap-2"><span className="text-sm">⚖️</span><span className="text-[11px] font-bold text-gray-800">Bias Check</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${getEffStatus(biasStatus, biasMitigated) === 'passed' || getEffStatus(biasStatus, biasMitigated) === 'mitigated' ? 'bg-emerald-100 text-emerald-800' : biasStatus === 'checking' ? 'bg-blue-100 text-blue-700 animate-pulse' : biasStatus === 'issues' ? rc(biasResult?.riskLevel || 'MEDIUM').badge : 'bg-red-100 text-red-700'}`}>
                          {getEffStatus(biasStatus, biasMitigated) === 'passed' ? 'Passed' : getEffStatus(biasStatus, biasMitigated) === 'mitigated' ? 'Mitigated' : biasStatus === 'checking' ? 'Analyzing...' : biasStatus === 'error' ? 'Error' : 'Issues Found'}
                        </span>
                      </div>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedCheck === 'bias' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {expandedCheck === 'bias' && biasResult && (
                      <div className="px-4 pb-3 space-y-2">
                        <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-gray-200">
                          <div className="relative shrink-0"><svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="6" /><circle cx="50" cy="50" r="38" fill="none" className={rc(biasResult.riskLevel).text} stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${((100 - biasResult.overallBiasScore) / 100) * 239} 239`} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className={`text-xs font-black ${rc(biasResult.riskLevel).text}`}>{100 - biasResult.overallBiasScore}%</span><span className="text-[5px] text-gray-500 font-bold">FAIR</span></div></div>
                          <div className="flex-1"><div className="flex items-center gap-1.5 mb-0.5"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${rc(biasResult.riskLevel).badge}`}>{biasResult.riskLevel} BIAS RISK</span><span className="text-[9px] text-gray-500">{biasResult.detectedBiases.length} patterns</span></div><p className="text-[10px] text-gray-700">{biasResult.summary}</p></div>
                        </div>
                        {biasResult.detectedBiases.length > 0 && (
                          <div className="bg-white rounded-lg p-2.5 border border-gray-200 max-h-[150px] overflow-y-auto space-y-1.5">
                            {biasResult.detectedBiases.map(b => (
                              <div key={b.id} className={`${rc(b.severity).bg} border ${rc(b.severity).border} rounded-md p-2`}>
                                <div className="flex items-center gap-1.5 mb-0.5"><span className={`text-[7px] font-black px-1 py-0.5 rounded ${rc(b.severity).badge}`}>{b.severity}</span><span className="text-[7px] text-gray-400">{b.biasTypeName}</span></div>
                                <p className="text-[9px] text-gray-900">{b.evidence}</p><p className="text-[8px] text-blue-600 mt-0.5">→ {b.recommendation}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {biasStatus === 'issues' && !biasMitigated && (
                          <button onClick={() => setBiasMitigated(true)} className="w-full py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">✓ Acknowledge & Mark as Mitigated</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {critStatus !== 'idle' && (
                  <div className="border-b border-gray-200">
                    <button onClick={() => setExpandedCheck(expandedCheck === 'crit' ? null : 'crit')} className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50/50 transition">
                      <div className="flex items-center gap-2"><span className="text-sm">🚨</span><span className="text-[11px] font-bold text-gray-800">Critical Factors</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${getEffStatus(critStatus, critMitigated) === 'passed' || getEffStatus(critStatus, critMitigated) === 'mitigated' ? 'bg-emerald-100 text-emerald-800' : critStatus === 'checking' ? 'bg-blue-100 text-blue-700 animate-pulse' : critStatus === 'issues' ? rc(critResult?.riskLevel || 'MEDIUM').badge : 'bg-red-100 text-red-700'}`}>
                          {getEffStatus(critStatus, critMitigated) === 'passed' ? 'Passed' : getEffStatus(critStatus, critMitigated) === 'mitigated' ? 'Mitigated' : critStatus === 'checking' ? 'Analyzing...' : critStatus === 'error' ? 'Error' : 'Issues Found'}
                        </span>
                      </div>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedCheck === 'crit' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {expandedCheck === 'crit' && critResult && (
                      <div className="px-4 pb-3 space-y-2">
                        <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-gray-200">
                          <div className="relative shrink-0"><svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="6" /><circle cx="50" cy="50" r="38" fill="none" className={rc(critResult.riskLevel).text} stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${((100 - critResult.overallRiskScore) / 100) * 239} 239`} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className={`text-xs font-black ${rc(critResult.riskLevel).text}`}>{100 - critResult.overallRiskScore}%</span><span className="text-[5px] text-gray-500 font-bold">SAFE</span></div></div>
                          <div className="flex-1"><div className="flex items-center gap-1.5 mb-0.5"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${rc(critResult.riskLevel).badge}`}>{critResult.riskLevel} RISK</span><span className="text-[9px] text-gray-500">{critResult.factors.length} factors</span></div><p className="text-[10px] text-gray-700">{critResult.summary}</p></div>
                        </div>
                        {critResult.factors.length > 0 && (
                          <div className="bg-white rounded-lg p-2.5 border border-gray-200 max-h-[150px] overflow-y-auto space-y-1.5">
                            {critResult.factors.map(f => {
                              const icons: Record<string, string> = { DATA_PRIVACY: '🔒', REGULATORY: '📜', COMPLIANCE: '📋', ACCURACY: '🎯', ETHICAL: '⚖️', OPERATIONAL: '⚙️' };
                              return (
                                <div key={f.id} className={`${rc(f.severity).bg} border ${rc(f.severity).border} rounded-md p-2`}>
                                  <div className="flex items-center gap-1.5 mb-0.5"><span className="text-xs">{icons[f.category] || '📌'}</span><span className={`text-[7px] font-black px-1 py-0.5 rounded ${rc(f.severity).badge}`}>{f.severity}</span><span className="text-[8px] font-bold text-gray-700">{f.title}</span></div>
                                  <p className="text-[9px] text-gray-700">{f.description}</p><p className="text-[8px] text-blue-600 mt-0.5">→ {f.recommendation}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {critStatus === 'issues' && !critMitigated && (
                          <button onClick={() => setCritMitigated(true)} className="w-full py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">✓ Acknowledge & Mark as Mitigated</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {allChecksRun && !allChecksPassed && (
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
                    <p className="text-[10px] text-amber-800 font-semibold flex items-center gap-1.5"><span className="text-amber-500">⚠</span>Approve is disabled until all quality checks pass or are mitigated.</p>
                  </div>
                )}
                {allChecksPassed && (
                  <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200">
                    <p className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1.5"><span>✅</span>All quality checks passed — ready for human review decision.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
            disabled={isDecided || state === 'submitting' || processingMods}
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
            disabled={isDecided || state === 'submitting' || processingMods}
          />
        </div>

        {/* Modify section */}
        {showModify && !isDecided && (
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
            {!approverName.trim() && (
              <div className="mt-2">
                <label className="block text-[11px] font-semibold text-sky-800 mb-1">
                  Your Name (required to apply changes)
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder={`Enter your name as ${hitl.approverRole}`}
                  className="w-full border border-sky-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  disabled={processingMods}
                />
              </div>
            )}
            {processingMods && (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[12px] text-sky-700">Processing your modifications and regenerating results...</span>
              </div>
            )}
          </div>
        )}

        {/* Reject section */}
        {showReject && !isDecided && (
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
            {!approverName.trim() && (
              <div className="mt-1">
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                  Your Name (required)
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder={`Enter your name as ${hitl.approverRole}`}
                  className="w-full border border-rose-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                  disabled={state === 'submitting'}
                />
              </div>
            )}
          </div>
        )}

        {/* Modified output review */}
        {state === 'review_modifications' && !isDecided && modifiedOutput && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
            <div className="px-5 py-2.5 bg-sky-100/60 border-b border-sky-200">
              <div className="flex items-center gap-2">
                <span className="text-sm">📝</span>
                <span className="text-[12px] font-bold text-sky-800">Modified Agent Results — Ready for Review</span>
                <span className="text-[10px] text-sky-600 bg-sky-200/60 px-2 py-0.5 rounded-full">Pending approval</span>
              </div>
            </div>
            <div className="p-5 max-h-[500px] overflow-y-auto">
              <Markdown>{modifiedOutput}</Markdown>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isDecided && <div className="flex flex-wrap gap-2 pt-1">
          {!showReject && !showModify && state !== 'review_modifications' && (
            <button
              onClick={handleApprove}
              disabled={!approverName.trim() || state === 'submitting' || !allChecksPassed}
              className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg transition text-sm ${allChecksPassed ? 'bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} disabled:cursor-not-allowed`}
            >
              <span>✓</span> Approve{!allChecksPassed ? ' (Run Checks First)' : ''}
            </button>
          )}

          {!showReject && !showModify && state !== 'review_modifications' && (
            <button
              onClick={() => setShowModify(true)}
              disabled={state === 'submitting'}
              className="flex items-center gap-2 bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700 transition disabled:opacity-40 text-sm"
            >
              <span>📝</span> Modify &amp; Review
            </button>
          )}

          {showModify && !showReject && state !== 'review_modifications' && (
            <>
              <button
                onClick={handleApplyChanges}
                disabled={!approverName.trim() || !modifications.trim() || processingMods}
                className="flex items-center gap-2 bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <span>📝</span> Apply Changes &amp; Review
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

          {!showReject && !showModify && state !== 'review_modifications' && (
            <button
              onClick={() => setShowReject(true)}
              disabled={state === 'submitting'}
              className="flex items-center gap-2 bg-rose-500 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-rose-600 transition disabled:opacity-40 text-sm"
            >
              <span>↩️</span> Reject
            </button>
          )}

          {showReject && state !== 'review_modifications' && (
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

          {state === 'review_modifications' && (
            <>
              <button
                onClick={handleApproveModified}
                disabled={!approverName.trim() || !allChecksPassed}
                className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg transition text-sm ${allChecksPassed ? 'bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} disabled:cursor-not-allowed`}
              >
                <span>✓</span> Approve{!allChecksPassed ? ' (Run Checks First)' : ''}
              </button>
              <button
                onClick={() => { setState('pending'); setShowModify(true); setModifiedOutput(null); }}
                className="flex items-center gap-2 text-slate-500 text-sm hover:text-thermax-navy transition"
              >
                ← Back to Edit
              </button>
            </>
          )}
        </div>}

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
            {isDecided
              ? `Decision recorded · ${state === 'rejected' ? 'Rejected' : 'Approved'} by ${approverName}`
              : `Next: Stage ${hitl.stageNumber < 9 ? hitl.stageNumber + 1 : '1 (loop)'} blocked until ${hitl.approverRole} decides`}
          </span>
        </div>
      </div>
    </div>
  );
}
