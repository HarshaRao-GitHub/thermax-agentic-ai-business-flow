'use client';

import { useState, useCallback } from 'react';
import type { BiasCheckResult, CriticalFactorResult } from '@/data/hitl-bias-config';

// ── Hallucination types (mirrored from HallucinationDetector) ──
interface HallucinationClaim {
  id: number;
  text: string;
  category: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReason: string;
  verificationStatus: string;
  groundedIn: string;
}
interface HallucinationResult {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  claims: HallucinationClaim[];
  mitigationPlan: {
    immediateActions: string[];
    removalCandidates: string[];
    regenerationInstructions: string;
    groundingSuggestions: string[];
  };
  confidenceFactors: {
    dataGrounding: number;
    logicalConsistency: number;
    specificityCheck: number;
    contextAlignment: number;
  };
}

type CheckStatus = 'idle' | 'checking' | 'passed' | 'issues' | 'error' | 'mitigated';
type FinalDecision = 'pending' | 'approved' | 'rejected';

interface AIOutputReviewPanelProps {
  content: string;
  originalPrompt: string;
  context?: string;
  onRegenerate?: (instructions: string) => void;
  onContentCleaned?: (cleanedContent: string) => void;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; dot: string; gradient: string }> = {
  LOW:      { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', gradient: 'from-emerald-500 to-green-500' },
  MEDIUM:   { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',   gradient: 'from-amber-500 to-yellow-500' },
  HIGH:     { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-800',  dot: 'bg-orange-500',  gradient: 'from-orange-500 to-red-400' },
  CRITICAL: { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     badge: 'bg-red-100 text-red-800',        dot: 'bg-red-500',     gradient: 'from-red-600 to-rose-600' },
};

function riskColor(level: string) {
  return RISK_COLORS[level] || RISK_COLORS.LOW;
}

function SectionHeader({ icon, title, status, riskLevel, onToggle, expanded }: {
  icon: string; title: string; status: CheckStatus; riskLevel?: string; onToggle: () => void; expanded: boolean;
}) {
  const statusConfig: Record<CheckStatus, { label: string; color: string; animate?: boolean }> = {
    idle:      { label: 'Not Checked', color: 'bg-gray-200 text-gray-600' },
    checking:  { label: 'Analyzing...', color: 'bg-blue-200 text-blue-700', animate: true },
    passed:    { label: 'Passed', color: 'bg-emerald-200 text-emerald-800' },
    issues:    { label: 'Issues Found', color: riskLevel ? riskColor(riskLevel).badge : 'bg-orange-200 text-orange-800' },
    error:     { label: 'Error', color: 'bg-red-200 text-red-700' },
    mitigated: { label: 'Mitigated', color: 'bg-emerald-200 text-emerald-800' },
  };
  const cfg = statusConfig[status];

  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${cfg.color} ${cfg.animate ? 'animate-pulse' : ''}`}>
          {cfg.label}
        </span>
      </div>
      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = value >= 70 ? 'text-emerald-700' : value >= 40 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="text-center">
      <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${value}%`, transition: 'width 0.8s ease-out' }} />
      </div>
      <p className="text-[8px] text-gray-500 mt-1 leading-tight">{label}</p>
      <p className={`text-[10px] font-bold ${textColor}`}>{value}%</p>
    </div>
  );
}

function TrustRing({ score, riskLevel }: { score: number; riskLevel: string }) {
  const trustPct = 100 - score;
  const c = riskColor(riskLevel);
  return (
    <div className="relative shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="50" cy="50" r="38" fill="none" className={c.text} stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(trustPct / 100) * 239} 239`} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-base font-black ${c.text}`}>{trustPct}%</span>
        <span className="text-[6px] text-gray-500 font-bold">TRUST</span>
      </div>
    </div>
  );
}

export default function AIOutputReviewPanel({
  content, originalPrompt, context, onRegenerate, onContentCleaned,
}: AIOutputReviewPanelProps) {

  // Section expand states
  const [expandedSection, setExpandedSection] = useState<'hallucination' | 'bias' | 'critical' | null>(null);

  // Hallucination state
  const [halStatus, setHalStatus] = useState<CheckStatus>('idle');
  const [halResult, setHalResult] = useState<HallucinationResult | null>(null);
  const [halError, setHalError] = useState<string | null>(null);
  const [halMitigated, setHalMitigated] = useState(false);

  // Bias state
  const [biasStatus, setBiasStatus] = useState<CheckStatus>('idle');
  const [biasResult, setBiasResult] = useState<BiasCheckResult | null>(null);
  const [biasError, setBiasError] = useState<string | null>(null);
  const [biasMitigated, setBiasMitigated] = useState(false);

  // Critical factors state
  const [critStatus, setCritStatus] = useState<CheckStatus>('idle');
  const [critResult, setCritResult] = useState<CriticalFactorResult | null>(null);
  const [critError, setCritError] = useState<string | null>(null);
  const [critMitigated, setCritMitigated] = useState(false);

  // Final decision
  const [decision, setDecision] = useState<FinalDecision>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectPanel, setShowRejectPanel] = useState(false);

  // Computed: all checks done
  const allChecksRun = halStatus !== 'idle' && halStatus !== 'checking' &&
                       biasStatus !== 'idle' && biasStatus !== 'checking' &&
                       critStatus !== 'idle' && critStatus !== 'checking';

  const halPassed = halStatus === 'passed' || halMitigated;
  const biasPassed = biasStatus === 'passed' || biasMitigated;
  const critPassed = critStatus === 'passed' || critMitigated;
  const allPassed = allChecksRun && halPassed && biasPassed && critPassed;

  // Run all checks simultaneously
  const runAllChecks = useCallback(async () => {
    if (!content) return;
    setHalStatus('checking'); setBiasStatus('checking'); setCritStatus('checking');
    setHalResult(null); setBiasResult(null); setCritResult(null);
    setHalError(null); setBiasError(null); setCritError(null);
    setHalMitigated(false); setBiasMitigated(false); setCritMitigated(false);
    setDecision('pending'); setShowRejectPanel(false);

    const payload = JSON.stringify({ content, originalPrompt, context });
    const headers = { 'Content-Type': 'application/json' };

    // Hallucination
    fetch('/api/hallucination-check', { method: 'POST', headers, body: payload })
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
        return res.json();
      })
      .then((data: HallucinationResult) => {
        setHalResult(data);
        const risky = data.claims.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL').length;
        setHalStatus(risky === 0 && data.riskLevel === 'LOW' ? 'passed' : 'issues');
      })
      .catch(e => { setHalError(e.message); setHalStatus('error'); });

    // Bias
    fetch('/api/bias-check', { method: 'POST', headers, body: payload })
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
        return res.json();
      })
      .then((data: BiasCheckResult) => {
        setBiasResult(data);
        const high = data.detectedBiases.filter(b => b.severity === 'HIGH' || b.severity === 'CRITICAL').length;
        setBiasStatus(high === 0 && data.riskLevel === 'LOW' ? 'passed' : 'issues');
      })
      .catch(e => { setBiasError(e.message); setBiasStatus('error'); });

    // Critical Factors
    fetch('/api/critical-factors-check', { method: 'POST', headers, body: payload })
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
        return res.json();
      })
      .then((data: CriticalFactorResult) => {
        setCritResult(data);
        const high = data.factors.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length;
        setCritStatus(high === 0 && data.riskLevel === 'LOW' ? 'passed' : 'issues');
      })
      .catch(e => { setCritError(e.message); setCritStatus('error'); });
  }, [content, originalPrompt, context]);

  function toggleSection(section: 'hallucination' | 'bias' | 'critical') {
    setExpandedSection(prev => prev === section ? null : section);
  }

  function getEffectiveStatus(status: CheckStatus, mitigated: boolean): CheckStatus {
    return mitigated ? 'mitigated' : status;
  }

  // Decision rendered state
  if (decision !== 'pending') {
    const cfg = decision === 'approved'
      ? { bg: 'bg-emerald-50', border: 'border-emerald-400', icon: '✅', label: 'APPROVED — ALL HITL GATES CLEARED', text: 'text-emerald-800', accent: 'bg-emerald-600' }
      : { bg: 'bg-red-50', border: 'border-red-400', icon: '❌', label: 'REJECTED — OUTPUT NOT CLEARED', text: 'text-red-800', accent: 'bg-red-600' };

    return (
      <div className={`mt-4 ${cfg.border} border-2 rounded-2xl overflow-hidden shadow-lg`}>
        <div className={`px-5 py-4 ${cfg.accent} flex items-center gap-3`}>
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">{cfg.label}</h3>
            <p className="text-[11px] text-white/80 mt-0.5">HITL Review — {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </div>
        <div className={`${cfg.bg} px-5 py-4`}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hallucination', status: getEffectiveStatus(halStatus, halMitigated) },
              { label: 'Bias', status: getEffectiveStatus(biasStatus, biasMitigated) },
              { label: 'Critical Factors', status: getEffectiveStatus(critStatus, critMitigated) },
            ].map(g => (
              <div key={g.label} className="text-center bg-white/60 rounded-lg p-2.5 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-600">{g.label}</p>
                <p className={`text-[9px] font-black mt-1 ${g.status === 'passed' || g.status === 'mitigated' ? 'text-emerald-600' : g.status === 'issues' ? 'text-orange-600' : 'text-gray-500'}`}>
                  {g.status === 'passed' ? '✓ PASSED' : g.status === 'mitigated' ? '✓ MITIGATED' : g.status === 'issues' ? '⚠ ISSUES' : g.status.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
          {decision === 'rejected' && rejectionReason && (
            <div className="mt-3 bg-white/70 rounded-lg p-3 border border-red-200">
              <p className="text-[10px] font-bold text-red-700 mb-1">Rejection Reason:</p>
              <p className="text-xs text-gray-700">{rejectionReason}</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] text-gray-400">HITL-GATE-{Date.now().toString(36).toUpperCase()}</span>
            <span className="text-gray-300">|</span>
            <span className="text-[9px] text-gray-400">Per Delegation of Authority matrix</span>
            <span className="text-gray-300">|</span>
            <span className="text-[9px] text-gray-400">Audit-logged</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-2 border-indigo-300 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl overflow-hidden shadow-lg">
      {/* ─── Master Header ─── */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center">
            <span className="text-xl">🛡️</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Human-in-the-Loop Review Gate</h3>
            <p className="text-[10px] text-white/70 mt-0.5">Hallucination · Bias · Critical Factors — all checks must pass before approval</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-red-200 bg-red-500/25 px-2.5 py-1 rounded-full border border-red-300/30">MANDATORY</span>
        </div>
      </div>

      {/* ─── Run All Checks / Status Bar ─── */}
      {halStatus === 'idle' && biasStatus === 'idle' && critStatus === 'idle' ? (
        <div className="px-5 py-4 border-b border-indigo-200 bg-white/50">
          <button
            onClick={runAllChecks}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Run All HITL Checks (Hallucination + Bias + Critical Factors)
          </button>
        </div>
      ) : (
        <div className="px-5 py-3 border-b border-indigo-200 bg-white/50">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hallucination', status: getEffectiveStatus(halStatus, halMitigated), level: halResult?.riskLevel },
              { label: 'Bias', status: getEffectiveStatus(biasStatus, biasMitigated), level: biasResult?.riskLevel },
              { label: 'Critical Factors', status: getEffectiveStatus(critStatus, critMitigated), level: critResult?.riskLevel },
            ].map(g => {
              const isPassed = g.status === 'passed' || g.status === 'mitigated';
              const isChecking = g.status === 'checking';
              const isIssue = g.status === 'issues';
              return (
                <div key={g.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isPassed ? 'bg-emerald-50 border-emerald-200' : isChecking ? 'bg-blue-50 border-blue-200' : isIssue ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                  {isChecking ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isPassed ? 'bg-emerald-500' : isIssue ? 'bg-orange-500' : 'bg-red-500'}`} />
                  )}
                  <div>
                    <p className="text-[9px] font-bold text-gray-700">{g.label}</p>
                    <p className={`text-[8px] font-black ${isPassed ? 'text-emerald-600' : isChecking ? 'text-blue-600' : isIssue ? 'text-orange-600' : 'text-red-600'}`}>
                      {g.status === 'passed' ? 'PASSED' : g.status === 'mitigated' ? 'MITIGATED' : g.status === 'checking' ? 'ANALYZING...' : g.status === 'error' ? 'ERROR' : g.level || 'ISSUES'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Section 1: Hallucination Check ─── */}
      {halStatus !== 'idle' && (
        <div className="border-b border-gray-200">
          <SectionHeader
            icon="🔍"
            title="Hallucination Check"
            status={getEffectiveStatus(halStatus, halMitigated)}
            riskLevel={halResult?.riskLevel}
            onToggle={() => toggleSection('hallucination')}
            expanded={expandedSection === 'hallucination'}
          />
          {expandedSection === 'hallucination' && halResult && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-gray-200">
                <TrustRing score={halResult.overallRiskScore} riskLevel={halResult.riskLevel} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${riskColor(halResult.riskLevel).badge}`}>{halResult.riskLevel} RISK</span>
                    <span className="text-[10px] text-gray-500">{halResult.claims.length} claims analyzed</span>
                  </div>
                  <p className="text-[11px] text-gray-700">{halResult.summary}</p>
                </div>
              </div>

              {/* Confidence Factors */}
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Confidence Factors</h4>
                <div className="grid grid-cols-4 gap-3">
                  <FactorBar label="Data Grounding" value={halResult.confidenceFactors.dataGrounding} />
                  <FactorBar label="Logic Consistency" value={halResult.confidenceFactors.logicalConsistency} />
                  <FactorBar label="Specificity" value={halResult.confidenceFactors.specificityCheck} />
                  <FactorBar label="Context Alignment" value={halResult.confidenceFactors.contextAlignment} />
                </div>
              </div>

              {/* Flagged Claims */}
              {halResult.claims.filter(c => c.riskLevel !== 'LOW').length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200 max-h-[200px] overflow-y-auto">
                  <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flagged Claims</h4>
                  <div className="space-y-2">
                    {halResult.claims.filter(c => c.riskLevel !== 'LOW').map(claim => (
                      <div key={claim.id} className={`${riskColor(claim.riskLevel).bg} border ${riskColor(claim.riskLevel).border} rounded-lg p-2`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${riskColor(claim.riskLevel).dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${riskColor(claim.riskLevel).badge}`}>{claim.riskLevel}</span>
                              <span className="text-[8px] text-gray-400">{claim.category}</span>
                            </div>
                            <p className="text-[10px] text-gray-900 font-medium">&ldquo;{claim.text}&rdquo;</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">{claim.riskReason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mitigation */}
              {halResult.mitigationPlan.immediateActions.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Mitigation Plan</h4>
                  <ul className="space-y-1">
                    {halResult.mitigationPlan.immediateActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-700"><span className="text-amber-500 shrink-0 mt-0.5">●</span>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {halStatus === 'issues' && !halMitigated && (
                <button onClick={() => setHalMitigated(true)} className="w-full py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">
                  ✓ Acknowledge & Mark Hallucination Issues as Mitigated
                </button>
              )}
            </div>
          )}
          {expandedSection === 'hallucination' && halError && (
            <div className="px-4 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[11px] text-red-700">Error: {halError}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Section 2: Bias Check ─── */}
      {biasStatus !== 'idle' && (
        <div className="border-b border-gray-200">
          <SectionHeader
            icon="⚖️"
            title="Bias Check"
            status={getEffectiveStatus(biasStatus, biasMitigated)}
            riskLevel={biasResult?.riskLevel}
            onToggle={() => toggleSection('bias')}
            expanded={expandedSection === 'bias'}
          />
          {expandedSection === 'bias' && biasResult && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-gray-200">
                <TrustRing score={biasResult.overallBiasScore} riskLevel={biasResult.riskLevel} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${riskColor(biasResult.riskLevel).badge}`}>{biasResult.riskLevel} BIAS RISK</span>
                    <span className="text-[10px] text-gray-500">{biasResult.detectedBiases.length} bias patterns checked</span>
                  </div>
                  <p className="text-[11px] text-gray-700">{biasResult.summary}</p>
                </div>
              </div>

              {/* Fairness Factors */}
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Fairness Factors</h4>
                <div className="grid grid-cols-5 gap-2">
                  <FactorBar label="Gender Neutrality" value={biasResult.fairnessFactors.genderNeutrality} />
                  <FactorBar label="Demographic Parity" value={biasResult.fairnessFactors.demographicParity} />
                  <FactorBar label="Linguistic Inclusion" value={biasResult.fairnessFactors.linguisticInclusion} />
                  <FactorBar label="Socioeconomic Fairness" value={biasResult.fairnessFactors.socioeconomicFairness} />
                  <FactorBar label="Regulatory Compliance" value={biasResult.fairnessFactors.regulatoryCompliance} />
                </div>
              </div>

              {/* Detected Biases */}
              {biasResult.detectedBiases.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200 max-h-[200px] overflow-y-auto">
                  <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Detected Biases ({biasResult.detectedBiases.length})</h4>
                  <div className="space-y-2">
                    {biasResult.detectedBiases.map(bias => (
                      <div key={bias.id} className={`${riskColor(bias.severity).bg} border ${riskColor(bias.severity).border} rounded-lg p-2.5`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${riskColor(bias.severity).dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${riskColor(bias.severity).badge}`}>{bias.severity}</span>
                              <span className="text-[8px] text-gray-400 font-medium">{bias.biasTypeName}</span>
                              <span className="text-[7px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{bias.category}</span>
                            </div>
                            <p className="text-[10px] text-gray-900 font-medium">{bias.evidence}</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">Affected: {bias.affectedGroup}</p>
                            <p className="text-[9px] text-blue-600 mt-0.5">→ {bias.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Flags */}
              {biasResult.mitigationPlan.complianceFlags.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <h4 className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-2">Compliance Flags</h4>
                  <ul className="space-y-1">
                    {biasResult.mitigationPlan.complianceFlags.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-red-700"><span className="text-red-500 shrink-0 mt-0.5">⚠</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rewrite Suggestions */}
              {biasResult.mitigationPlan.rewriteSuggestions.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <h4 className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-2">Rewrite Suggestions</h4>
                  <ul className="space-y-1">
                    {biasResult.mitigationPlan.rewriteSuggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-blue-700"><span className="text-blue-500 shrink-0 mt-0.5">→</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {biasStatus === 'issues' && !biasMitigated && (
                <button onClick={() => setBiasMitigated(true)} className="w-full py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">
                  ✓ Acknowledge & Mark Bias Issues as Mitigated
                </button>
              )}
            </div>
          )}
          {expandedSection === 'bias' && biasError && (
            <div className="px-4 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[11px] text-red-700">Error: {biasError}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Section 3: Critical Factors ─── */}
      {critStatus !== 'idle' && (
        <div className="border-b border-gray-200">
          <SectionHeader
            icon="🚨"
            title="Critical Factors Check"
            status={getEffectiveStatus(critStatus, critMitigated)}
            riskLevel={critResult?.riskLevel}
            onToggle={() => toggleSection('critical')}
            expanded={expandedSection === 'critical'}
          />
          {expandedSection === 'critical' && critResult && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-gray-200">
                <TrustRing score={critResult.overallRiskScore} riskLevel={critResult.riskLevel} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${riskColor(critResult.riskLevel).badge}`}>{critResult.riskLevel} RISK</span>
                    <span className="text-[10px] text-gray-500">{critResult.factors.length} factors analyzed</span>
                  </div>
                  <p className="text-[11px] text-gray-700">{critResult.summary}</p>
                </div>
              </div>

              {/* Factors */}
              {critResult.factors.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200 max-h-[200px] overflow-y-auto">
                  <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Identified Factors ({critResult.factors.length})</h4>
                  <div className="space-y-2">
                    {critResult.factors.map(factor => {
                      const catIcons: Record<string, string> = { DATA_PRIVACY: '🔒', REGULATORY: '📜', COMPLIANCE: '📋', ACCURACY: '🎯', ETHICAL: '⚖️', OPERATIONAL: '⚙️' };
                      return (
                        <div key={factor.id} className={`${riskColor(factor.severity).bg} border ${riskColor(factor.severity).border} rounded-lg p-2.5`}>
                          <div className="flex items-start gap-2">
                            <span className="text-sm shrink-0">{catIcons[factor.category] || '📌'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${riskColor(factor.severity).badge}`}>{factor.severity}</span>
                                <span className="text-[9px] font-bold text-gray-700">{factor.title}</span>
                              </div>
                              <p className="text-[10px] text-gray-700">{factor.description}</p>
                              <p className="text-[9px] text-blue-600 mt-1">→ {factor.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Compliance Mitigations */}
              {critResult.complianceMitigations.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <h4 className="text-[9px] font-bold text-purple-600 uppercase tracking-wider mb-2">Compliance Mitigations</h4>
                  <ul className="space-y-1">
                    {critResult.complianceMitigations.map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-purple-700"><span className="text-purple-500 shrink-0 mt-0.5">●</span>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {critStatus === 'issues' && !critMitigated && (
                <button onClick={() => setCritMitigated(true)} className="w-full py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">
                  ✓ Acknowledge & Mark Critical Factor Issues as Mitigated
                </button>
              )}
            </div>
          )}
          {expandedSection === 'critical' && critError && (
            <div className="px-4 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[11px] text-red-700">Error: {critError}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Approve / Reject Actions ─── */}
      {allChecksRun && (
        <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-indigo-50/20">
          {!allPassed && !showRejectPanel && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <p className="text-[11px] text-amber-800 font-semibold flex items-center gap-2">
                <span className="text-amber-500">⚠</span>
                Approve is disabled until all issues are mitigated. Acknowledge outstanding issues in each section above, or Reject the output.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDecision('approved')}
              disabled={!allPassed}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
                allPassed
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>✅</span> Approve Output
            </button>
            <button
              onClick={() => setShowRejectPanel(!showRejectPanel)}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-black rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              <span>❌</span> Reject Output
            </button>
          </div>

          {/* Reject Panel */}
          {showRejectPanel && (
            <div className="mt-3 bg-white rounded-xl p-4 border border-red-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-red-600">❌</span>
                <h4 className="text-sm font-bold text-gray-800">Reject AI Output</h4>
              </div>
              <p className="text-[11px] text-gray-500">Provide the reason for rejection (required):</p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g., The output contains biased language targeting a specific community. The rate calculations are inaccurate. The response violates RBI Fair Practices Code..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowRejectPanel(false)} className="text-xs text-gray-500 hover:text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Cancel</button>
                <button
                  onClick={() => { if (rejectionReason.trim()) setDecision('rejected'); }}
                  disabled={!rejectionReason.trim()}
                  className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg disabled:opacity-30 transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200/50">
            <span className="text-[9px] text-gray-400">HITL-REVIEW-{Date.now().toString(36).toUpperCase()}</span>
            <span className="text-gray-300">|</span>
            <span className="text-[9px] text-gray-400">38 bias types from AI_Bias_Reference</span>
            <span className="text-gray-300">|</span>
            <span className="text-[9px] text-gray-400">Per Delegation of Authority matrix</span>
            <span className="text-gray-300">|</span>
            <span className="text-[9px] text-gray-400">Audit-logged</span>
          </div>
        </div>
      )}
    </div>
  );
}
