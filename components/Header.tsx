'use client';

import Link from 'next/link';
import { useWorkflow } from './WorkflowContext';

export default function Header() {
  const { flow, resetFlow } = useWorkflow();
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
          <div className="w-11 h-11 rounded-lg bg-thermax-saffron flex items-center justify-center font-bold text-thermax-navy text-xl group-hover:scale-105 transition">
            T
          </div>
          <div className="font-bold text-[18px] tracking-tight">
            Thermax&apos;s Agentic AI Operating System 2030
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

      {/* Navigation: 2-line layout */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Line 1: Three Experience Modes */}
          <nav className="hidden md:flex items-center justify-center gap-3 py-2">
            <ModeLink href="/prompting" icon="💬" label="Prompting" />
            <ModeLink href="/doc-intelligence" icon="📊" label="Doc Intelligence & Visualization" />
            <ModeLink href="/agentic-experience" icon="🤖" label="Agentic AI" />
            <ModeLink href="/ai-nexus" icon="⚡" label="AI Nexus" />
          </nav>
          {/* Line 2: All secondary navigation */}
          <nav className="hidden md:flex items-center justify-center gap-1 pb-2 -mt-0.5">
            <NavLink href="/">Dashboard</NavLink>
            <NavSep />
            <NavLink href="/governance">Governance</NavLink>
            <NavSep />
            <NavLink href="/approvals">HITL Queue</NavLink>
            <NavSep />
            <Link
              href="/custom-agents"
              className="px-3 py-1 rounded-md text-thermax-saffron hover:text-white hover:bg-thermax-saffron/20 transition font-semibold text-[12px]"
            >
              + Custom Agents
            </Link>
            <span className="mx-1.5 w-px h-4 bg-gradient-to-b from-transparent via-white/25 to-transparent" />
            <NavLink href="/storyline">Storyline</NavLink>
            <NavDot />
            <NavLink href="/business-flow">Business Flow</NavLink>
            <NavDot />
            <NavLink href="/flow-diagram">Flow Diagram</NavLink>
            <NavDot />
            <NavLink href="/operating-system">AI OS</NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

function ModeLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white/85 hover:text-white bg-white/5 hover:bg-white/15 transition flex items-center gap-1.5 border border-white/10 hover:border-white/25"
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2.5 py-1 rounded-md text-[12px] text-white/70 hover:text-white hover:bg-white/10 transition font-medium"
    >
      {children}
    </Link>
  );
}

function NavSep() {
  return <span className="w-px h-3.5 bg-white/15" />;
}

function NavDot() {
  return <span className="w-1 h-1 rounded-full bg-white/25" />;
}
