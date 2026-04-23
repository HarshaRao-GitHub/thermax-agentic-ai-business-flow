'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CustomAgentChat from '@/components/CustomAgentChat';
import {
  getCustomAgent,
  deleteCustomAgent,
  type CustomAgent,
} from '@/lib/client-store';

export default function CustomAgentRunPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [agent, setAgent] = useState<CustomAgent | null>(null);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  function handleDelete() {
    if (!confirm(`Permanently delete "${agent?.name}"? This will remove the agent and all its data. This cannot be undone.`)) return;
    deleteCustomAgent(id);
    router.push('/custom-agents');
  }

  useEffect(() => {
    const found = getCustomAgent(id);
    if (found) {
      setAgent(found);
    } else {
      setError('Agent not found');
    }
  }, [id]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-thermax-navy mb-2">{error}</h1>
        <Link href="/custom-agents" className="text-sm text-thermax-saffronDeep font-semibold hover:underline">
          ← Back to Custom Agents
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="animate-pulse text-thermax-slate">Loading agent...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6 shadow-card">
        <div className="h-40 relative" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2440 40%, #d97706 100%)' }}>
          {agent.avatarUrl && (
            <Image src={agent.avatarUrl} alt="" fill className="object-cover opacity-15 blur-md" unoptimized />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-thermax-navy/90 via-thermax-navy/60 to-transparent" />

          <div className="relative z-10 flex items-center gap-5 h-full px-6">
            <div className="w-20 h-20 rounded-2xl border-4 border-white/20 shadow-lg overflow-hidden bg-thermax-mist shrink-0">
              {agent.avatarUrl ? (
                <Image src={agent.avatarUrl} alt={agent.name} width={80} height={80} className="object-cover w-full h-full" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-thermax-saffron to-thermax-saffronDeep text-white font-bold">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-thermax-saffron/20 text-thermax-saffron text-[10px] font-bold rounded-full uppercase">Custom Agent</span>
              </div>
              <h1 className="text-xl font-bold text-white truncate">{agent.name}</h1>
              <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{agent.description}</p>
              <div className="flex items-center gap-3 mt-2 text-white/50 text-[10px]">
                <span>{agent.tasks.length} task{agent.tasks.length !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{agent.runCount} run{agent.runCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>ID: {agent.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation breadcrumb + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-thermax-slate">
          <Link href="/custom-agents" className="hover:text-thermax-navy transition font-medium">Custom Agents</Link>
          <span>›</span>
          <span className="text-thermax-navy font-semibold">{agent.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs text-thermax-navy font-semibold hover:underline"
          >
            {showInstructions ? 'Hide Instructions ▲' : 'View Instructions ▼'}
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs text-red-500 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition font-semibold"
          >
            Delete Agent
          </button>
        </div>
      </div>

      {/* Collapsible instructions */}
      {showInstructions && (
        <div className="mb-6 bg-white border border-thermax-line rounded-xl shadow-card p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-thermax-slate mb-2">Agent Instructions</h3>
          <pre className="text-xs text-thermax-navy font-mono whitespace-pre-wrap leading-relaxed bg-thermax-mist rounded-lg p-3 max-h-60 overflow-y-auto">
            {agent.instructions}
          </pre>
          {agent.acceptedFiles && (
            <div className="mt-3 pt-3 border-t border-thermax-line">
              <span className="text-[10px] font-bold text-thermax-slate uppercase">Accepted Files: </span>
              <span className="text-[11px] text-thermax-navy">{agent.acceptedFiles}</span>
            </div>
          )}
        </div>
      )}

      {/* Chat Interface */}
      <CustomAgentChat agent={agent} />
    </div>
  );
}
