'use client';

import { useState } from 'react';

interface Claim {
  id: number;
  text: string;
  category: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReason: string;
  verificationStatus: string;
  groundedIn: string;
}

interface MitigationPlan {
  immediateActions: string[];
  removalCandidates: string[];
  regenerationInstructions: string;
  groundingSuggestions: string[];
}

interface ConfidenceFactors {
  dataGrounding: number;
  logicalConsistency: number;
  specificityCheck: number;
  contextAlignment: number;
}

interface HallucinationResult {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  claims: Claim[];
  mitigationPlan: MitigationPlan;
  confidenceFactors: ConfidenceFactors;
}

type MitigationAction = 'accept' | 'regenerate' | 'remove-claims';

interface HallucinationDetectorProps {
  content: string;
  originalPrompt: string;
  context?: string;
  onRegenerate?: (instructions: string) => void;
  onContentCleaned?: (cleanedContent: string) => void;
}

export default function HallucinationDetector({
  content,
  originalPrompt,
  context,
  onRegenerate,
  onContentCleaned,
}: HallucinationDetectorProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<HallucinationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showMitigation, setShowMitigation] = useState(false);
  const [selectedAction, setSelectedAction] = useState<MitigationAction | null>(null);
  const [actionExecuted, setActionExecuted] = useState(false);
  const [claimsToRemove, setClaimsToRemove] = useState<number[]>([]);

  async function runCheck() {
    if (checking || !content) return;
    setChecking(true);
    setError(null);
    setResult(null);
    setActionExecuted(false);
    setSelectedAction(null);
    setClaimsToRemove([]);

    try {
      const res = await fetch('/api/hallucination-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, originalPrompt, context }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Hallucination check failed');
        return;
      }

      const data: HallucinationResult = await res.json();
      setResult(data);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setChecking(false);
    }
  }

  function getRiskColor(level: string) {
    switch (level) {
      case 'LOW': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
      case 'MEDIUM': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
      case 'HIGH': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' };
      case 'CRITICAL': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' };
    }
  }

  function toggleClaimRemoval(claimId: number) {
    setClaimsToRemove(prev =>
      prev.includes(claimId) ? prev.filter(id => id !== claimId) : [...prev, claimId]
    );
  }

  function executeAction() {
    if (!result || !selectedAction) return;

    if (selectedAction === 'accept') {
      setActionExecuted(true);
    } else if (selectedAction === 'regenerate' && onRegenerate) {
      const instructions = result.mitigationPlan.regenerationInstructions;
      onRegenerate(instructions);
      setActionExecuted(true);
    } else if (selectedAction === 'remove-claims' && onContentCleaned) {
      const claimsText = result.claims
        .filter(c => claimsToRemove.includes(c.id))
        .map(c => c.text);
      let cleaned = content;
      for (const claimText of claimsText) {
        cleaned = cleaned.replace(claimText, '[REMOVED — unverified claim]');
      }
      onContentCleaned(cleaned);
      setActionExecuted(true);
    }
  }

  const riskyClaims = result?.claims.filter(c => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL') ?? [];
  const mediumClaims = result?.claims.filter(c => c.riskLevel === 'MEDIUM') ?? [];

  return (
    <div className="mt-2">
      {!result && !checking && (
        <button
          onClick={runCheck}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-indigo-700 px-2.5 py-1.5 border border-slate-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Check for Hallucinations
        </button>
      )}

      {checking && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-indigo-700 font-medium">Analyzing response for hallucination risk...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-[11px] text-red-700">Error: {error}</span>
          <button onClick={runCheck} className="text-[10px] font-bold text-red-700 underline">Retry</button>
        </div>
      )}

      {result && (
        <div className={`border rounded-xl overflow-hidden ${getRiskColor(result.riskLevel).border} ${getRiskColor(result.riskLevel).bg}`}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="38" fill="none"
                    className={getRiskColor(result.riskLevel).text}
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${((100 - result.overallRiskScore) / 100) * 239} 239`}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-lg font-black ${getRiskColor(result.riskLevel).text}`}>{100 - result.overallRiskScore}%</span>
                  <span className="text-[7px] text-gray-500 font-bold">TRUST</span>
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getRiskColor(result.riskLevel).badge}`}>
                    {result.riskLevel} RISK
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {result.claims.length} claims analyzed
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 mt-1 max-w-md">{result.summary}</p>
                {riskyClaims.length > 0 && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                    {riskyClaims.length} high-risk claim{riskyClaims.length !== 1 ? 's' : ''} detected
                  </p>
                )}
              </div>
            </div>
            <svg className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expanded && (
            <div className="border-t border-gray-200 bg-white">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Confidence Factors</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Data Grounding', value: result.confidenceFactors.dataGrounding },
                    { label: 'Logical Consistency', value: result.confidenceFactors.logicalConsistency },
                    { label: 'Specificity', value: result.confidenceFactors.specificityCheck },
                    { label: 'Context Alignment', value: result.confidenceFactors.contextAlignment },
                  ].map(f => (
                    <div key={f.label} className="text-center">
                      <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${f.value >= 70 ? 'bg-green-500' : f.value >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${f.value}%`, transition: 'width 0.8s ease-out' }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-500 mt-1">{f.label}</p>
                      <p className={`text-[10px] font-bold ${f.value >= 70 ? 'text-green-700' : f.value >= 40 ? 'text-amber-700' : 'text-red-700'}`}>{f.value}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {(riskyClaims.length > 0 || mediumClaims.length > 0) && (
                <div className="px-4 py-3 border-b border-gray-100 max-h-[250px] overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Flagged Claims ({riskyClaims.length + mediumClaims.length})
                  </h4>
                  <div className="space-y-2">
                    {[...riskyClaims, ...mediumClaims].map(claim => {
                      const colors = getRiskColor(claim.riskLevel);
                      return (
                        <div key={claim.id} className={`${colors.bg} border ${colors.border} rounded-lg p-2.5`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${colors.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${colors.badge}`}>{claim.riskLevel}</span>
                                <span className="text-[8px] text-gray-400 font-medium">{claim.category}</span>
                              </div>
                              <p className="text-[10px] text-gray-900 font-medium leading-snug">&ldquo;{claim.text}&rdquo;</p>
                              <p className="text-[9px] text-gray-500 mt-0.5">{claim.riskReason}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] text-gray-400">Status: {claim.verificationStatus}</span>
                                {selectedAction === 'remove-claims' && (
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={claimsToRemove.includes(claim.id)}
                                      onChange={() => toggleClaimRemoval(claim.id)}
                                      className="w-3 h-3 rounded border-gray-300"
                                    />
                                    <span className="text-[8px] text-red-600 font-bold">Remove</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-4 py-3 border-b border-gray-100">
                <button
                  onClick={() => setShowMitigation(!showMitigation)}
                  className="flex items-center gap-2 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 transition"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${showMitigation ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  View Mitigation Plan
                </button>

                {showMitigation && (
                  <div className="mt-3 space-y-3">
                    {result.mitigationPlan.immediateActions.length > 0 && (
                      <div>
                        <h5 className="text-[9px] font-bold text-gray-600 uppercase mb-1">Immediate Verification Actions</h5>
                        <ul className="space-y-1">
                          {result.mitigationPlan.immediateActions.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-700">
                              <span className="text-amber-500 shrink-0 mt-0.5">●</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.mitigationPlan.removalCandidates.length > 0 && (
                      <div>
                        <h5 className="text-[9px] font-bold text-red-600 uppercase mb-1">Removal Candidates</h5>
                        <ul className="space-y-1">
                          {result.mitigationPlan.removalCandidates.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-red-700">
                              <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.mitigationPlan.groundingSuggestions.length > 0 && (
                      <div>
                        <h5 className="text-[9px] font-bold text-blue-600 uppercase mb-1">Grounding Suggestions</h5>
                        <ul className="space-y-1">
                          {result.mitigationPlan.groundingSuggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-blue-700">
                              <span className="text-blue-500 shrink-0 mt-0.5">→</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.mitigationPlan.regenerationInstructions && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                        <h5 className="text-[9px] font-bold text-indigo-700 uppercase mb-1">Regeneration Instructions</h5>
                        <p className="text-[10px] text-indigo-800">{result.mitigationPlan.regenerationInstructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!actionExecuted && (
                <div className="px-4 py-3 bg-gray-50">
                  <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Choose Action</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={() => setSelectedAction('accept')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${selectedAction === 'accept' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                    >
                      ✓ Accept As-Is
                    </button>
                    {onRegenerate && (
                      <button
                        onClick={() => setSelectedAction('regenerate')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${selectedAction === 'regenerate' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'}`}
                      >
                        ↻ Regenerate with Constraints
                      </button>
                    )}
                    {onContentCleaned && riskyClaims.length > 0 && (
                      <button
                        onClick={() => setSelectedAction('remove-claims')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${selectedAction === 'remove-claims' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                      >
                        ✕ Remove Risky Claims
                      </button>
                    )}
                  </div>

                  {selectedAction && (
                    <div className="flex items-center gap-2">
                      {selectedAction === 'accept' && (
                        <p className="text-[10px] text-green-700 flex-1">Response will be accepted without modification. User acknowledges potential risks.</p>
                      )}
                      {selectedAction === 'regenerate' && (
                        <p className="text-[10px] text-indigo-700 flex-1">AI will regenerate with tighter grounding constraints to reduce hallucination.</p>
                      )}
                      {selectedAction === 'remove-claims' && (
                        <p className="text-[10px] text-red-700 flex-1">Select claims above to remove, then confirm. Claims will be replaced with [REMOVED] markers.</p>
                      )}
                      <button
                        onClick={executeAction}
                        disabled={selectedAction === 'remove-claims' && claimsToRemove.length === 0}
                        className="px-4 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg hover:bg-gray-800 transition disabled:opacity-30"
                      >
                        Confirm Action
                      </button>
                    </div>
                  )}
                </div>
              )}

              {actionExecuted && (
                <div className="px-4 py-3 bg-green-50 border-t border-green-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[11px] text-green-700 font-bold">
                      {selectedAction === 'accept' && 'Response accepted — user acknowledges hallucination risks noted above.'}
                      {selectedAction === 'regenerate' && 'Regeneration triggered with anti-hallucination constraints.'}
                      {selectedAction === 'remove-claims' && `${claimsToRemove.length} claim(s) removed from response.`}
                    </span>
                  </div>
                </div>
              )}

              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => { setResult(null); setExpanded(false); setShowMitigation(false); setActionExecuted(false); setSelectedAction(null); }}
                  className="text-[9px] text-gray-500 hover:text-gray-700 font-medium transition"
                >
                  Reset & Re-check
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
