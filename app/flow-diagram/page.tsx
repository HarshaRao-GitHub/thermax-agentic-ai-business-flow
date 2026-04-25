import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "'9-Stage' Business Flow Diagram — Thermax's AI OS 2030",
  description:
    'Visual pipeline diagram of the Thermax 9-stage business workflow — three phases, nine stages, with HITL gates and data flow.'
};

interface DiagramStage {
  n: number;
  title: string;
  narrative: string;
  icon: string;
  color: string;
  colorLight: string;
  produces: string;
  hitlApprover: string;
  reads: string;
  writes: string;
}

const PHASES = [
  {
    name: 'PHASE 1: OPPORTUNITY CREATION',
    color: '#3B82F6',
    colorLight: '#DBEAFE',
    stages: [
      {
        n: 1,
        title: 'Marketing',
        narrative: 'Opportunity sensing and framing',
        icon: '📡',
        color: '#3B82F6',
        colorLight: '#DBEAFE',
        produces: 'Account Brief',
        hitlApprover: 'Marketing Director',
        reads: 'customers_master.csv',
        writes: 'market_signals.csv \u2192 account_briefs.csv'
      },
      {
        n: 2,
        title: 'Sales',
        narrative: 'Qualification and pursuit decision',
        icon: '🎯',
        color: '#8B5CF6',
        colorLight: '#EDE9FE',
        produces: 'Qualified Opportunity',
        hitlApprover: 'BU Head Sales',
        reads: 'account_briefs.csv',
        writes: 'opportunities.csv \u2192 stakeholder_map.csv'
      },
      {
        n: 3,
        title: 'Pre-sales',
        narrative: 'Turning the problem into a proposal',
        icon: '📝',
        color: '#06B6D4',
        colorLight: '#CFFAFE',
        produces: 'Proposal + BoM',
        hitlApprover: 'Solution Director',
        reads: 'opportunities.csv',
        writes: 'proposals.csv \u2192 bill_of_materials.csv'
      }
    ]
  },
  {
    name: 'PHASE 2: SOLUTION SHAPING',
    color: '#EF4444',
    colorLight: '#FEE2E2',
    stages: [
      {
        n: 4,
        title: 'Engineering',
        narrative: 'Keeper of technical truth',
        icon: '⚙️',
        color: '#EF4444',
        colorLight: '#FEE2E2',
        produces: 'Validated Scope + PG',
        hitlApprover: 'Chief Engineer',
        reads: 'proposals.csv',
        writes: 'engineering_validations \u2192 performance_guarantees'
      },
      {
        n: 5,
        title: 'Finance + Legal',
        narrative: 'Protecting margin, cash and contract',
        icon: '💼',
        color: '#F59E0B',
        colorLight: '#FEF3C7',
        produces: 'Signed Contract',
        hitlApprover: 'CFO + Legal',
        reads: 'proposals.csv + performance_guarantees',
        writes: 'commercial_risk_assessments \u2192 contract_reviews'
      },
      {
        n: 6,
        title: 'HR + PMO',
        narrative: 'Mobilising the right team and readiness',
        icon: '👷',
        color: '#10B981',
        colorLight: '#D1FAE5',
        produces: 'Project Charter',
        hitlApprover: 'PMO Head',
        reads: 'contract_reviews + employees_master',
        writes: 'projects.csv \u2192 resource_assignments'
      }
    ]
  },
  {
    name: 'PHASE 3: DELIVERY & SUSTENANCE',
    color: '#6366F1',
    colorLight: '#E0E7FF',
    stages: [
      {
        n: 7,
        title: 'Site Operations',
        narrative: 'Execution on the ground',
        icon: '🏗️',
        color: '#6366F1',
        colorLight: '#E0E7FF',
        produces: 'Mechanical Completion',
        hitlApprover: 'Project Director',
        reads: 'projects.csv + resource_assignments',
        writes: 'site_progress \u2192 safety_incidents \u2192 quality_ncrs'
      },
      {
        n: 8,
        title: 'Commissioning',
        narrative: 'Moment of truth',
        icon: '🔬',
        color: '#EC4899',
        colorLight: '#FCE7F3',
        produces: 'PAC Document',
        hitlApprover: 'Commissioning Head',
        reads: 'site_progress + quality_ncrs',
        writes: 'commissioning_tests'
      },
      {
        n: 9,
        title: 'O&M Services',
        narrative: 'Keeping the plant performing + Service Co-pilot (always-on AI Q&A)',
        icon: '🔧',
        color: '#14B8A6',
        colorLight: '#CCFBF1',
        produces: 'Diagnosis + Spare Parts + SOP Guidance + Co-pilot Q&A',
        hitlApprover: 'Service Director',
        reads: 'service_cases + sop_library + telemetry',
        writes: 'diagnosis_reports \u2192 spare_parts_orders'
      }
    ]
  }
];

export default function FlowDiagramPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-thermax-mist to-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-thermax-navyDeep via-thermax-navy to-thermax-slate text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] font-mono mb-5">
            <span className="w-1.5 h-1.5 bg-thermax-saffron rounded-full animate-pulse" />
            Visual Architecture
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            &lsquo;9-Stage&rsquo; Business Flow
            <br />
            <span className="text-thermax-saffron">Process Diagram</span>
          </h1>
          <p className="mt-4 text-white/70 max-w-3xl text-[15px] leading-relaxed">
            Three phases, nine stages, mandatory HITL gates between every handoff,
            and a feedback loop that converts every well-delivered project into the next opportunity.
          </p>
        </div>
      </section>

      {/* Diagram */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {PHASES.map((phase, pi) => (
            <div key={phase.name}>
              {/* Phase header */}
              <div
                className="rounded-t-xl px-6 py-3 font-bold text-white text-sm tracking-wide"
                style={{ backgroundColor: phase.color }}
              >
                {phase.name}
              </div>

              <div
                className="rounded-b-xl border-l-4 border-r border-b border-thermax-line bg-white p-6"
                style={{ borderLeftColor: phase.color }}
              >
                <div className="space-y-4">
                  {phase.stages.map((stage, si) => (
                    <div key={stage.n}>
                      {/* Stage card */}
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Stage identity */}
                        <div
                          className="shrink-0 w-full lg:w-64 rounded-xl p-4 flex flex-col items-center justify-center text-center"
                          style={{ backgroundColor: stage.colorLight }}
                        >
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-2 shadow-sm"
                            style={{ backgroundColor: stage.color }}
                          >
                            {stage.icon}
                          </div>
                          <div
                            className="text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded-full mb-1"
                            style={{ backgroundColor: stage.color }}
                          >
                            STAGE {stage.n}
                          </div>
                          <h3 className="font-bold text-thermax-navy text-base">
                            {stage.title}
                          </h3>
                          <p className="text-[11px] text-thermax-slate italic mt-0.5">
                            {stage.narrative}
                          </p>
                        </div>

                        {/* Data flow details */}
                        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <MiniField
                            label="Reads From"
                            value={stage.reads}
                            icon="📥"
                          />
                          <MiniField
                            label="Writes To"
                            value={stage.writes}
                            icon="📤"
                          />
                          <MiniField
                            label="Produces"
                            value={stage.produces}
                            icon="📄"
                          />
                          <MiniField
                            label="HITL Approver"
                            value={stage.hitlApprover}
                            icon="👤"
                            highlight
                          />
                        </div>
                      </div>

                      {/* Connector arrow */}
                      {si < phase.stages.length - 1 && (
                        <div className="flex justify-center py-2">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-0.5 h-5"
                              style={{ backgroundColor: stage.color }}
                            />
                            <div className="flex items-center gap-2">
                              <div
                                className="text-[9px] font-mono px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: '#DC2626' }}
                              >
                                HITL GATE
                              </div>
                            </div>
                            <div
                              className="w-0.5 h-5"
                              style={{
                                backgroundColor:
                                  phase.stages[si + 1]?.color ?? stage.color
                              }}
                            />
                            <div
                              className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
                              style={{
                                borderTopColor:
                                  phase.stages[si + 1]?.color ?? stage.color
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase connector */}
              {pi < PHASES.length - 1 && (
                <div className="flex justify-center py-3">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-thermax-navy" />
                    <div className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-600 text-white">
                      HITL GATE
                    </div>
                    <div className="w-0.5 h-6 bg-thermax-navy" />
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-thermax-navy" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Feedback loop */}
        <div className="mt-8 bg-gradient-to-r from-teal-50 to-blue-50 border-2 border-dashed border-teal-400 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🔄</div>
            <div>
              <h3 className="font-bold text-thermax-navy text-lg">
                Feedback Loop: Stage 9 &rarr; Stage 1 + AI Nexus
              </h3>
              <p className="text-[13px] text-thermax-slate mt-1 leading-relaxed">
                Retrofit opportunities, renewal contracts, customer success stories,
                and operational insights become new market signals — flowing back to
                Marketing &amp; Sales. The AI Nexus apps (Asset Performance Platform &amp;
                Tender Intelligence Tool) extend this loop by providing real-time fleet
                monitoring across 2,000+ failure modes and automated tender extraction
                for faster proposal turnaround. Every well-delivered project becomes the
                starting point for the next one.
              </p>
            </div>
          </div>
        </div>

        {/* Orchestrator */}
        <div className="mt-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🛡️</div>
            <div>
              <h3 className="font-bold text-thermax-navy text-base">
                ORCHESTRATOR (AgentGuard)
              </h3>
              <ul className="text-[13px] text-thermax-slate mt-1 space-y-1">
                <li>
                  &bull; Reads workflow state to find current stage
                </li>
                <li>&bull; Invokes agent for current stage</li>
                <li>
                  &bull; Waits for HITL approval before advancing
                </li>
                <li>
                  &bull; Appends each transition to the audit trail
                </li>
                <li>
                  &bull; Routes data to AI Nexus apps (Asset Performance, Tender Intelligence)
                </li>
                <li>
                  &bull; Provides 4 experience modes: Prompting, Doc Intelligence, Agentic AI, AI Nexus
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data flow table */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-thermax-navy mb-4">
            End-to-End Data Flow: Signal to Service
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-thermax-navy text-white">
                  <th className="px-3 py-2 text-left font-semibold">Stage</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Reads From
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Writes To
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    HITL Output
                  </th>
                </tr>
              </thead>
              <tbody>
                {DATA_FLOW.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0 ? 'bg-white' : 'bg-thermax-mist'
                    }
                  >
                    <td className="px-3 py-2 font-semibold text-thermax-navy border-b border-thermax-line">
                      [{row.n}] {row.title}
                    </td>
                    <td className="px-3 py-2 font-mono text-thermax-slate border-b border-thermax-line">
                      {row.reads}
                    </td>
                    <td className="px-3 py-2 font-mono text-thermax-slate border-b border-thermax-line">
                      {row.writes}
                    </td>
                    <td className="px-3 py-2 text-thermax-slate border-b border-thermax-line">
                      {row.hitl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-thermax-slate mt-2 italic">
            &rarr; feedback loop: retrofit opportunities become new signals &larr;
          </p>
        </div>
      </section>

      {/* Navigation */}
      <section className="max-w-6xl mx-auto px-6 py-8 pb-16">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/business-flow"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
          >
            &larr; Business Flow Details
          </Link>
          <Link
            href="/operating-system"
            className="bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition text-sm"
          >
            View AI Operating System &rarr;
          </Link>
          <Link
            href="/storyline"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
          >
            Business Storyline
          </Link>
          <Link
            href="/ai-nexus"
            className="border border-violet-600 text-violet-600 font-semibold px-5 py-2.5 rounded-md hover:bg-violet-600 hover:text-white transition text-sm"
          >
            Explore AI Nexus &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

function MiniField({
  label,
  value,
  icon,
  highlight
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        highlight
          ? 'bg-red-50 border border-red-200'
          : 'bg-thermax-mist border border-thermax-line'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">{icon}</span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-thermax-slate font-semibold">
          {label}
        </span>
      </div>
      <p
        className={`text-[11px] leading-relaxed ${
          highlight ? 'text-red-800 font-semibold' : 'text-thermax-navy'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const DATA_FLOW = [
  {
    n: 1,
    title: 'Marketing',
    reads: 'customers_master.csv',
    writes: 'market_signals.csv \u2192 account_briefs.csv',
    hitl: 'Marketing Director OK'
  },
  {
    n: 2,
    title: 'Sales',
    reads: 'account_briefs.csv',
    writes: 'opportunities.csv \u2192 stakeholder_map.csv',
    hitl: 'BU Head go/no-go'
  },
  {
    n: 3,
    title: 'Pre-sales',
    reads: 'opportunities.csv',
    writes: 'proposals.csv \u2192 bill_of_materials.csv',
    hitl: 'Solution Director OK'
  },
  {
    n: 4,
    title: 'Engineering',
    reads: 'proposals.csv',
    writes: 'engineering_validations \u2192 performance_guarantees',
    hitl: 'Chief Engineer OK'
  },
  {
    n: 5,
    title: 'Finance + Legal',
    reads: 'proposals + performance_guarantees',
    writes: 'commercial_risk_assessments \u2192 contract_reviews',
    hitl: 'CFO + Legal OK'
  },
  {
    n: 6,
    title: 'HR + PMO',
    reads: 'contract_reviews + employees_master',
    writes: 'projects.csv \u2192 resource_assignments',
    hitl: 'PMO Head OK'
  },
  {
    n: 7,
    title: 'Site Ops',
    reads: 'projects + resource_assignments',
    writes: 'site_progress \u2192 safety_incidents \u2192 quality_ncrs',
    hitl: 'Site Mgr OK per event'
  },
  {
    n: 8,
    title: 'Commissioning',
    reads: 'site_progress + quality_ncrs',
    writes: 'commissioning_tests',
    hitl: 'Commissioning Head OK'
  },
  {
    n: 9,
    title: 'O&M Services + Co-pilot',
    reads: 'service_cases + sop_library + telemetry',
    writes: 'diagnosis_reports \u2192 spare_parts_orders',
    hitl: 'Service Director OK'
  }
];
