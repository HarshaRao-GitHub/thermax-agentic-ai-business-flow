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

      {/* Navigation bar: two-line layout */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Line 1: Primary navigation */}
          <nav className="hidden md:flex items-center justify-center gap-1 pt-1.5 pb-0.5">
            <NavLink href="/">Dashboard</NavLink>
            <NavSep />
            <NavLink href="/governance">Governance</NavLink>
            <NavSep />
            <NavLink href="/doc-intelligence">Doc Intelligence</NavLink>
            <NavSep />
            <NavLink href="/agentic-experience">Agentic Experience</NavLink>
            <NavSep />
            <Link
              href="/custom-agents"
              className="px-3 py-1.5 rounded-md text-thermax-saffron hover:text-white hover:bg-thermax-saffron/20 transition font-semibold text-[13px]"
            >
              + Custom Agents
            </Link>
          </nav>
          {/* Line 2: Workflow exploration */}
          <nav className="hidden md:flex items-center justify-center gap-1 pb-1.5 pt-0.5">
            <NavLink href="/storyline">Storyline</NavLink>
            <NavDot />
            <NavLink href="/business-flow">Business Flow</NavLink>
            <NavDot />
            <NavLink href="/flow-diagram">Flow Diagram</NavLink>
            <NavDot />
            <NavLink href="/operating-system">AI OS</NavLink>
            <NavDot />
            <NavLink href="/approvals">HITL Queue</NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

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

function NavDot() {
  return <span className="w-1 h-1 rounded-full bg-white/25" />;
}
