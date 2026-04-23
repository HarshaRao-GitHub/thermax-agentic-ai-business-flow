import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "'9-Stage' Business Flow/Process — Thermax's AI OS 2030",
  description:
    'The disciplined 9-stage Thermax business flow with clear entry, process, exit, and handoff documents between every function.'
};

interface FlowStage {
  number: number;
  title: string;
  narrativeSubtitle: string;
  icon: string;
  color: string;
  colorLight: string;
  entry: string;
  inputs: string;
  process: string;
  outputs: string;
  handoff: string;
}

const FLOW_STAGES: FlowStage[] = [
  {
    number: 1,
    title: 'Marketing',
    narrativeSubtitle: 'Opportunity sensing and framing',
    icon: '📡',
    color: '#3B82F6',
    colorLight: '#DBEAFE',
    entry:
      'Early market signals — capex announcements, new emission norms, rising energy costs, plant reliability concerns, sustainability mandates.',
    inputs:
      'Industry reports, customer annual reports, regulatory updates, CRM account data, competitor intelligence, trade body inputs.',
    process:
      'Identify the target account, frame the customer\u2019s business problem, shape the value hypothesis, plan the account-based engagement.',
    outputs:
      'Account brief, opportunity hypothesis note, customer pain-point map, initial value proposition, outreach plan.',
    handoff:
      'Account brief + opportunity hypothesis + first-level contacts \u2192 Sales'
  },
  {
    number: 2,
    title: 'Sales',
    narrativeSubtitle: 'Qualification and pursuit decision',
    icon: '🎯',
    color: '#8B5CF6',
    colorLight: '#EDE9FE',
    entry: 'Qualified account and hypothesis received from Marketing.',
    inputs:
      'Account brief, opportunity hypothesis, customer RFP/enquiry (if issued), earlier customer history.',
    process:
      'Qualify the opportunity (budget, authority, need, timeline), map stakeholders, study competitors, assess win probability, take a go / no-go decision.',
    outputs:
      'Qualification report, stakeholder map, pursuit plan, NDA (if required), clarification set, sales forecast entry in CRM.',
    handoff:
      'Qualified pursuit + customer requirements + win themes \u2192 Pre-sales'
  },
  {
    number: 3,
    title: 'Pre-sales / Solutioning',
    narrativeSubtitle: 'Turning the problem into a proposal',
    icon: '📝',
    color: '#06B6D4',
    colorLight: '#CFFAFE',
    entry: 'Qualified pursuit handed over by Sales.',
    inputs:
      'Customer RFP / specifications, site conditions, utility data, customer pain-point map, qualification report.',
    process:
      'Define solution concept, size equipment, build Bill of Materials, develop scope, prepare techno-commercial proposal and presentation.',
    outputs:
      'Solution concept document, Bill of Materials (BoM), scope of supply, proposal (technical + commercial), pricing sheet, clarification log.',
    handoff:
      'Proposed solution + scope + performance expectations \u2192 Engineering for technical validation'
  },
  {
    number: 4,
    title: 'Engineering',
    narrativeSubtitle: 'Keeper of technical truth',
    icon: '⚙️',
    color: '#EF4444',
    colorLight: '#FEE2E2',
    entry: 'Proposed solution and scope received from Pre-sales.',
    inputs:
      'Solution concept, BoM, customer specifications, site/process data, statutory norms, safety standards.',
    process:
      'Validate design feasibility, finalise process and equipment design, run HAZOP / safety reviews, lock performance guarantees, flag execution risks.',
    outputs:
      'Process Flow Diagrams (PFDs), P&IDs, General Arrangement (GA) drawings, performance guarantee document, HAZOP report, engineering risk register.',
    handoff:
      'Validated scope + performance commitments + risk register \u2192 Finance & Legal for commercial and contractual review'
  },
  {
    number: 5,
    title: 'Finance & Legal',
    narrativeSubtitle: 'Protecting margin, cash and contract',
    icon: '💼',
    color: '#F59E0B',
    colorLight: '#FEF3C7',
    entry: 'Technically validated scope and pricing.',
    inputs:
      'Validated scope, cost estimate, customer MSA / draft contract, payment terms, tax and regulatory inputs.',
    process:
      'Run margin and cash-flow analysis, stress-test pricing, review contract clauses (LDs, warranties, IP, indemnities), decide on bank guarantees, insurance, forex cover.',
    outputs:
      'Margin and cash-flow model, risk-adjusted pricing, reviewed and marked-up contract, BG / insurance plan, approval note, signed order.',
    handoff:
      'Signed contract + delivery obligations + milestone and payment schedule \u2192 HR & PMO'
  },
  {
    number: 6,
    title: 'HR & PMO',
    narrativeSubtitle: 'Mobilising the right team and readiness',
    icon: '👷',
    color: '#10B981',
    colorLight: '#D1FAE5',
    entry: 'Signed contract and approved delivery plan.',
    inputs:
      'Contract, delivery milestones, resource forecast, skill and certification requirements, site location data.',
    process:
      'Build project charter, assign project manager and core team, mobilise skilled engineers, welders, commissioning leads, set up governance, plan site readiness.',
    outputs:
      'Project charter, resource plan, skill/certification matrix, mobilisation plan, baseline schedule, kick-off meeting minutes, risk and communication plan.',
    handoff:
      'Project charter + team assignments + baseline schedule + drawings and approvals \u2192 Site Operations'
  },
  {
    number: 7,
    title: 'Site Operations',
    narrativeSubtitle: 'Execution on the ground',
    icon: '🏗️',
    color: '#6366F1',
    colorLight: '#E0E7FF',
    entry:
      'Project team mobilised, drawings released, site available.',
    inputs:
      'Engineering drawings, project charter, HSE plan, Quality Assurance Plan (QAP), procurement and logistics plan.',
    process:
      'Set up site, manage procurement and logistics, execute civil / mechanical / electrical works, enforce safety and quality, track progress, resolve day-to-day issues.',
    outputs:
      'Daily and weekly progress reports, Material Inspection Reports (MIRs), method statements, safety / HSE reports, Non-Conformance Reports (NCRs), mechanical completion certificate.',
    handoff:
      'Mechanical completion certificate + system ready for start-up \u2192 Commissioning'
  },
  {
    number: 8,
    title: 'Commissioning',
    narrativeSubtitle: 'Moment of truth',
    icon: '🔬',
    color: '#EC4899',
    colorLight: '#FCE7F3',
    entry: 'Mechanical completion of the system.',
    inputs:
      'Mechanical completion certificate, commissioning procedures, Performance Guarantee (PG) test protocol, vendor manuals, utility readiness.',
    process:
      'Pre-commissioning checks, cold and hot commissioning, stabilisation, performance guarantee testing, customer witness and sign-off.',
    outputs:
      'Commissioning reports, PG test report, Provisional Acceptance Certificate (PAC), snag and punch list, as-built drawings, training records for operators.',
    handoff:
      'PAC + as-built drawings + O&M manuals + handover dossier \u2192 O&M Services'
  },
  {
    number: 9,
    title: 'O&M Services',
    narrativeSubtitle: 'Keeping the plant performing and feeding the next cycle',
    icon: '🔧',
    color: '#14B8A6',
    colorLight: '#CCFBF1',
    entry: 'Provisional / Final Acceptance and handover dossier.',
    inputs:
      'Handover dossier, O&M manuals, as-built drawings, PG test report, service contract, field engineer observations, service cases.',
    process:
      'Support field engineers with SOPs and diagnosis guidance, perform why-why root cause analysis on service cases, manage spare parts intelligence, provide post-installation O&M insights.',
    outputs:
      'Service case diagnoses with root cause analysis, SOP-guided repair procedures, spare parts recommendations, O&M improvement insights, customer success stories, renewal and spare parts sales opportunities.',
    handoff:
      'Service insights, recurring issue patterns, spare parts demand signals, customer renewal opportunities \u2192 back to Marketing & Sales for the next cycle'
  }
];

const EFFICIENCY_QUOTE =
  "Thermax\u2019s efficiency does not come from any single function being brilliant \u2014 it comes from the discipline of handoffs. Every stage has a clear entry trigger, a defined set of inputs, a structured process, and a fixed set of deliverables that become the next stage\u2019s inputs. Nothing moves forward until its document set is complete. Nothing gets re-invented downstream. And most importantly, the last stage does not close the loop \u2014 it feeds the first one. That is what converts a one-time project into a long-term customer, and a delivery organisation into a compounding growth engine.";

export default function BusinessFlowPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-thermax-mist to-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-thermax-navyDeep via-thermax-navy to-thermax-slate text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] font-mono mb-5">
            <span className="w-1.5 h-1.5 bg-thermax-saffron rounded-full animate-pulse" />
            9-Stage Disciplined Business Flow
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            &lsquo;9-Stage&rsquo; Business
            <br />
            <span className="text-thermax-saffron">Flow / Process</span>
          </h1>
          <p className="mt-4 text-white/70 max-w-3xl text-[15px] leading-relaxed">
            The same Thermax story, re-drawn as a disciplined business flow — with clear entry,
            process, exit, and the documents that move from one function to the next.
          </p>
        </div>
      </section>

      {/* Stages */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="space-y-6">
          {FLOW_STAGES.map((stage) => (
            <div
              key={stage.number}
              className="bg-white rounded-xl border border-thermax-line shadow-sm overflow-hidden hover:shadow-md transition"
            >
              {/* Header */}
              <div
                className="px-6 py-4 flex items-center gap-4"
                style={{ backgroundColor: stage.colorLight }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ backgroundColor: stage.color }}
                >
                  <span className="grayscale-0">{stage.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    >
                      STAGE {stage.number}
                    </span>
                    <h2 className="text-lg font-bold text-thermax-navy">
                      {stage.title}
                    </h2>
                  </div>
                  <p className="text-[13px] text-thermax-slate italic">
                    {stage.narrativeSubtitle}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 grid md:grid-cols-2 gap-4">
                <FlowField
                  label="Entry (trigger)"
                  value={stage.entry}
                  icon="🚪"
                />
                <FlowField
                  label="Inputs (documents received)"
                  value={stage.inputs}
                  icon="📥"
                />
                <FlowField
                  label="Process"
                  value={stage.process}
                  icon="⚙️"
                  className="md:col-span-2"
                />
                <FlowField
                  label="Outputs (documents produced)"
                  value={stage.outputs}
                  icon="📤"
                />
                <FlowField
                  label="Handoff"
                  value={stage.handoff}
                  icon="🤝"
                  highlight
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Efficiency Quote */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-thermax-navy to-thermax-slate text-white rounded-xl p-8">
          <h3 className="text-lg font-bold mb-3">
            Why this flow is most efficient?
          </h3>
          <p className="text-[15px] leading-relaxed text-white/90">
            {EFFICIENCY_QUOTE}
          </p>
        </div>
      </section>

      {/* Navigation */}
      <section className="max-w-5xl mx-auto px-6 py-8 pb-16">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/storyline"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
          >
            &larr; Business Storyline
          </Link>
          <Link
            href="/flow-diagram"
            className="bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition text-sm"
          >
            View Flow Diagram &rarr;
          </Link>
          <Link
            href="/operating-system"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
          >
            View AI Operating System &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

function FlowField({
  label,
  value,
  icon,
  highlight,
  className
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${
        highlight
          ? 'bg-thermax-saffron/5 border border-thermax-saffron/20'
          : 'bg-thermax-mist'
      } rounded-lg p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[11px] font-mono uppercase tracking-wider text-thermax-slate font-semibold">
          {label}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-thermax-navy">{value}</p>
    </div>
  );
}
