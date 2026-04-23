'use client';

import Link from 'next/link';
import { useWorkflow } from './WorkflowContext';

export default function Header() {
  const { flow, resetFlow, getGateStatus } = useWorkflow();
  const hasActiveFlow = flow?.stages?.some(s => s.hasResult) ?? false;

  function handleNewFlow() {
    if (!confirm('Start a new workflow? This will clear all stage results, approvals, and agent outputs from the current flow.')) return;
    resetFlow();
    window.location.href = '/';
  }

  return (
    <header className="bg-thermax-navy text-white">
      {/* Top bar: Logo + brand */}
      <div className="max-w-7xl mx-auto px-6 pt-3 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-thermax-saffron flex items-center justify-center font-bold text-thermax-navy text-lg group-hover:scale-105 transition">
            T
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px] tracking-tight">
              Thermax Agentic AI Operating System
            </div>
            <div className="text-[11px] text-white/60 font-mono">
              9 Stages · 10 Agents · Signal → Service · AgentGuard
            </div>
          </div>
        </Link>

        {hasActiveFlow && (
          <button
            onClick={handleNewFlow}
            className="px-3.5 py-1.5 rounded-md text-[12px] font-semibold bg-red-600/80 text-white hover:bg-red-600 transition"
          >
            New Flow ↻
          </button>
        )}
      </div>

      {/* Navigation bar: full-width, centered, spacious */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="hidden md:flex items-center justify-center gap-1 py-1.5 flex-wrap">
            <NavLink href="/">Dashboard</NavLink>
            <NavSep />
            <NavLink href="/storyline">Storyline</NavLink>
            <NavSep />
            <NavLink href="/business-flow">Business Flow</NavLink>
            <NavSep />
            <NavLink href="/flow-diagram">Flow Diagram</NavLink>
            <NavSep />
            <NavLink href="/operating-system">AI OS</NavLink>
            <NavSep />
            <NavLink href="/approvals">HITL Queue</NavLink>
            <NavSep />
            <NavLink href="/governance">Governance</NavLink>
            <NavSep />
            <Link
              href="/custom-agents"
              className="px-3 py-1.5 rounded-md text-thermax-saffron hover:text-white hover:bg-thermax-saffron/20 transition font-semibold text-[13px]"
            >
              + Custom Agents
            </Link>
          </nav>
        </div>
      </div>

      {/* Stage pipeline strip */}
      <div className="bg-thermax-navyDeep/60 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-1.5">
          <div className="flex items-center justify-center gap-0 overflow-x-auto scrollbar-hide">
            {/* Mandatory label */}
            <span className="text-[8px] font-bold uppercase tracking-widest text-red-400/70 mr-2 shrink-0">Required</span>

            {STAGE_NAV.map((s, i) => {
              const status = getGateStatus(s.slug);
              const isLocked = status === 'locked';
              const isApproved = status === 'approved';
              const isAwaiting = status === 'awaiting_approval';
              const isSkipped = status === 'skipped';

              const statusIcon = isApproved ? '✅' : isAwaiting ? '⏳' : isSkipped ? '⏭' : isLocked ? '🔒' : '';
              const isMandatory = i < 5;

              return (
                <div key={s.slug} className="flex items-center shrink-0">
                  {i === 5 && (
                    <>
                      <span className="w-[2px] h-5 bg-thermax-saffron/40 mx-2 rounded-full" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-sky-400/70 mr-2 shrink-0">Optional</span>
                    </>
                  )}
                  {isLocked || isSkipped ? (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-not-allowed ${
                      isSkipped ? 'text-white/35 line-through decoration-white/20' : 'text-white/30'
                    }`}>
                      <span className="text-xs">{s.icon}</span>
                      <span className="hidden lg:inline">{s.label}</span>
                      <span className="lg:hidden">{s.short}</span>
                      {statusIcon && <span className="text-[9px]">{statusIcon}</span>}
                    </span>
                  ) : (
                    <Link
                      href={`/stages/${s.slug}`}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                        isApproved
                          ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/20'
                          : isAwaiting
                          ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-900/20'
                          : isMandatory
                          ? 'text-white/80 hover:text-white hover:bg-white/10'
                          : 'text-sky-300/80 hover:text-sky-200 hover:bg-sky-900/20'
                      }`}
                    >
                      <span className="text-xs">{s.icon}</span>
                      <span className="hidden lg:inline">{s.label}</span>
                      <span className="lg:hidden">{s.short}</span>
                      {statusIcon && <span className="text-[9px]">{statusIcon}</span>}
                    </Link>
                  )}
                  {i < STAGE_NAV.length - 1 && i !== 4 && (
                    <span className={`text-[10px] mx-0.5 select-none ${isApproved || isSkipped ? 'text-emerald-500/60' : 'text-thermax-saffron/60'}`}>›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

const STAGE_NAV = [
  { slug: 'marketing', icon: '📡', label: '1. Market Intelligence', short: '1' },
  { slug: 'sales', icon: '🎯', label: '2. Sales Qualification', short: '2' },
  { slug: 'presales', icon: '📝', label: '3. Solution Design', short: '3' },
  { slug: 'engineering', icon: '⚙️', label: '4. Engineering', short: '4' },
  { slug: 'finance-legal', icon: '💼', label: '5. Finance & Legal', short: '5' },
  { slug: 'hr-pmo', icon: '👷', label: '6. Mobilisation', short: '6' },
  { slug: 'site-operations', icon: '🏗️', label: '7. Site Operations', short: '7' },
  { slug: 'commissioning', icon: '🔬', label: '8. Commissioning', short: '8' },
  { slug: 'digital-service', icon: '📱', label: '9. Digital & Service', short: '9' }
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-[13px] text-white/75 hover:text-white hover:bg-white/10 transition font-medium"
    >
      {children}
    </Link>
  );
}

function NavSep() {
  return <span className="w-px h-3.5 bg-white/15" />;
}
