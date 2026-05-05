'use client';

import { useState } from 'react';

interface Props {
  prompt: string;
  onEnhanced: (enhanced: string) => void;
  disabled?: boolean;
  pageContext?: string;
  className?: string;
}

export default function EnhanceToCraft({ prompt, onEnhanced, disabled, pageContext, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done' | 'already'>('idle');

  const canEnhance = prompt.trim().length >= 5 && !loading && !disabled;

  async function enhance() {
    if (!canEnhance) return;
    setLoading(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), pageContext }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        console.error('Enhance failed:', err);
        return;
      }

      const data = await res.json();
      if (data.alreadyCraft) {
        setStatus('already');
        setTimeout(() => setStatus('idle'), 2500);
      } else if (data.enhanced) {
        onEnhanced(data.enhanced);
        setStatus('done');
        setTimeout(() => setStatus('idle'), 2500);
      }
    } catch (err) {
      console.error('Enhance error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={enhance}
      disabled={!canEnhance}
      title="Enhance your prompt using the CRAFT framework (Context · Role · Action · Format · Target)"
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold transition-all rounded-lg border px-3 py-1.5 ${
        loading
          ? 'bg-blue-50 border-blue-300 text-blue-600 cursor-wait'
          : status === 'done'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : status === 'already'
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : canEnhance
                ? 'bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200 text-blue-700 hover:border-blue-400 hover:shadow-sm hover:from-blue-100 hover:to-teal-100 cursor-pointer'
                : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
      } ${className ?? ''}`}
    >
      {loading ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Enhancing...
        </>
      ) : status === 'done' ? (
        <>✅ Enhanced!</>
      ) : status === 'already' ? (
        <>✨ Already CRAFT-level</>
      ) : (
        <>
          <span className="text-sm">✨</span>
          Enhance to CRAFT
        </>
      )}
    </button>
  );
}
