import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "'9-Stage' Agentic AI Operating System — Thermax",
  description:
    'The five-layer agentic AI architecture — Knowledge Foundation, Agent Network, Human-in-the-Loop Controls, AgentGuard Governance, and Experience Modes — with 9 agents, Service Co-pilot, AI Nexus apps, and stage-by-stage AI vs human breakdown.'
};

const LAYERS = [
  {
    number: 1,
    name: 'Knowledge Foundation',
    color: '#3B82F6',
    icon: '🧠',
    items: [
      'Unified data lake of customer records, past proposals, engineering designs, project histories, service data',
      'Document AI to extract and classify every inbound document (Doc Intelligence & Visualization mode)',
      'A knowledge graph linking customers, sites, equipment, contracts, and outcomes',
      'Synthetic data backbone: 27+ interlinked CSV files, PDFs, and domain-specific datasets across all 9 stages'
    ]
  },
  {
    number: 2,
    name: 'Agent Network',
    color: '#8B5CF6',
    icon: '🤖',
    items: [
      'Nine specialist domain agents (one per stage) with real-time streaming output',
      'One Orchestrator Agent that manages handoffs, enforces gates, and routes exceptions',
      'Proactive Service Co-pilot on O&M agent — always-on AI Q&A without requiring agent run',
      'AI Nexus enterprise apps: Asset Performance Platform (2,000+ failure modes) and Tender Intelligence Tool'
    ]
  },
  {
    number: 3,
    name: 'Human-in-the-Loop Controls',
    color: '#10B981',
    icon: '👤',
    items: [
      'Approval gates at every commercial, legal, technical, and safety-critical decision',
      'Automatic escalation when agent confidence drops below a defined threshold',
      'Apply Changes & Review workflow with separate Approve/Reject actions'
    ]
  },
  {
    number: 4,
    name: 'Governance (AgentGuard)',
    color: '#DC2626',
    icon: '🛡️',
    items: [
      'Full audit trail, explainability',
      'Red-team testing, bias and hallucination monitoring',
      'Compliance gates for data protection, export control, and safety standards'
    ]
  },
  {
    number: 5,
    name: 'Experience Modes',
    color: '#7C3AED',
    icon: '⚡',
    items: [
      'Prompting Mode — prompt ladder library with Thermax-specific templates and web search',
      'Doc Intelligence & Visualization — document upload, extraction, chart generation, side-by-side layout',
      'Agentic AI — 9-stage workflow with per-agent chatbot and HITL governance',
      'AI Nexus — enterprise apps for asset monitoring, tender intelligence, and future AI-powered tools'
    ]
  }
];

interface AgentStage {
  number: number;
  title: string;
  agentName: string;
  icon: string;
  color: string;
  aiAutomates: string;
  humanInLoop: string;
  mandatoryApproval: string;
}

const AGENT_STAGES: AgentStage[] = [
  {
    number: 1,
    title: 'Market Intelligence',
    agentName: 'Market Intelligence Agent',
    icon: '📡',
    color: '#3B82F6',
    aiAutomates:
      'Scans news, regulatory filings, customer annual reports, capex and emission-norm announcements; identifies accounts matching Thermax\u2019s ideal customer profile; drafts account briefs and value hypotheses; identifies the TOP 5 IMMEDIATE LEADS with confidence levels.',
    humanInLoop:
      'Marketing/BU head reviews the shortlisted accounts and validates the value hypothesis.',
    mandatoryApproval:
      'Final target account selection and GTM approach.'
  },
  {
    number: 2,
    title: 'Lead Qualification',
    agentName: 'Lead Qualification Agent',
    icon: '🎯',
    color: '#8B5CF6',
    aiAutomates:
      'Takes the top 5 leads from Stage 1, runs BANT / MEDDIC scoring, builds stakeholder maps from CRM and public sources, synthesises competitive intelligence, estimates win probability. Remaining opportunities summarised for context.',
    humanInLoop:
      'Sales lead validates political reality, customer urgency, and stakeholder relationships.',
    mandatoryApproval: 'Go / no-go pursuit decision and NDA signing.'
  },
  {
    number: 3,
    title: 'Proposal',
    agentName: 'Proposal Agent',
    icon: '📝',
    color: '#06B6D4',
    aiAutomates:
      'Drafts proposals only for qualified leads from Stage 2, sizes equipment using parametric models, drafts BoM, scope, technical narrative and proposal, runs first-cut cost estimate.',
    humanInLoop:
      'Solution architect reviews technical approach; pricing and margin review by commercial leader.',
    mandatoryApproval:
      'Final proposal scope, pricing, and customer commitments before submission.'
  },
  {
    number: 4,
    title: 'Engineering Review',
    agentName: 'Engineering Review Agent',
    icon: '⚙️',
    color: '#EF4444',
    aiAutomates:
      'Validates only proposals for qualified leads — feasibility checks against design codes, preliminary HAZOP screening, generation of draft PFDs, P&IDs, GA drawings, simulation of performance against guarantees.',
    humanInLoop:
      'Chief engineer reviews every technical commitment; safety officer reviews HAZOP output; performance guarantees calibrated by domain experts.',
    mandatoryApproval:
      'All performance guarantees, safety certifications, and technical commitments \u2014 signed by the head of engineering. AI never signs a guarantee.'
  },
  {
    number: 5,
    title: 'Commercial & Legal',
    agentName: 'Commercial Risk Agent',
    icon: '💼',
    color: '#F59E0B',
    aiAutomates:
      'Assesses only validated proposals for qualified leads — builds margin and cash-flow models, scans contracts for risky clauses (LDs, indemnities, IP, warranty), compares against Thermax\u2019s playbook and precedents, generates redlines.',
    humanInLoop:
      'CFO reviews margin and cash-flow position; Legal counsel reviews redlines; Risk committee reviews high-exposure items.',
    mandatoryApproval:
      'Contract signing per Delegation of Authority (DoA), bank guarantees, insurance, and forex decisions.'
  },
  {
    number: 6,
    title: 'Project Planning',
    agentName: 'Project Planning Agent',
    icon: '👷',
    color: '#10B981',
    aiAutomates:
      'Charters only approved qualified deals — matches project needs to available resources (skills, certifications, location), builds mobilisation schedule, drafts project charter, tracks certification expiries and readiness gaps.',
    humanInLoop:
      'PMO head approves the resource plan; HR validates availability and mobility.',
    mandatoryApproval:
      'Final resource assignments (especially for safety-critical roles) and project charter sign-off.'
  },
  {
    number: 7,
    title: 'Execution & Monitoring',
    agentName: 'Project Execution & Monitoring Agent',
    icon: '🏗️',
    color: '#6366F1',
    aiAutomates:
      'Monitors only active qualified projects — real-time progress tracking from site reports; predictive schedule-slippage alerts; automated quality and safety compliance checks; draft progress, MIR and NCR reports; subcontractor performance scoring.',
    humanInLoop:
      'Site manager validates progress claims; safety officer reviews incident flags; project manager approves changes.',
    mandatoryApproval:
      'Safety stop-work decisions (never AI alone), change orders, NCR disposition, material deviations.'
  },
  {
    number: 8,
    title: 'Commissioning',
    agentName: 'Commissioning Agent',
    icon: '🔬',
    color: '#EC4899',
    aiAutomates:
      'Commissions only projects from the qualified pipeline — pre-commissioning checklist execution, performance trend analysis during stabilisation, deviation detection against PG targets, draft commissioning and PG test reports.',
    humanInLoop:
      'Commissioning lead supervises startup; customer witness validates test results; operations team confirms handover readiness.',
    mandatoryApproval:
      'PG test acceptance, PAC issuance, handover sign-off.'
  },
  {
    number: 9,
    title: 'O&M Services + Service Co-pilot',
    agentName: 'O&M Service Intelligence Agent + Always-On Co-pilot',
    icon: '🔧',
    color: '#14B8A6',
    aiAutomates:
      'SOP lookup and field engineer guidance, service case diagnosis with why-why root cause analysis, spare parts availability checks and recommendations, O&M contract intelligence, recurring issue pattern analysis. The proactive Service Co-pilot provides always-on AI Q&A — answering field engineer questions, processing uploaded files, and querying the data backbone in real time without requiring an agent run.',
    humanInLoop:
      'Service head reviews critical diagnoses; field engineer validates root cause before communicating to customer; spare parts orders above threshold need approval.',
    mandatoryApproval:
      'Any customer-facing diagnosis report, field intervention dispatch, spare parts order above threshold, retrofit or renewal proposal.'
  }
];

const GOVERNANCE_PRINCIPLES = [
  {
    title: 'Accountability stays human',
    description:
      'AI drafts, humans sign. No commitment, guarantee, or contract is executed by an agent alone.',
    icon: '✋'
  },
  {
    title: 'Explainability by design',
    description:
      'Every agent output is accompanied by a reasoning trail and source citations.',
    icon: '🔍'
  },
  {
    title: 'Confidence-based escalation',
    description:
      'When agent confidence drops below a defined threshold, the task automatically routes to a human.',
    icon: '📊'
  },
  {
    title: 'Safety-first guardrails',
    description:
      'HSE, HAZOP, and site safety decisions are never fully automated.',
    icon: '🦺'
  },
  {
    title: 'Full audit trail',
    description:
      'Every agent action is logged, replayable, and auditable.',
    icon: '📋'
  },
  {
    title: 'Regulated data discipline',
    description:
      'Customer data, pricing, and IP are segregated with role-based access controls.',
    icon: '🔒'
  },
  {
    title: 'Continuous learning',
    description:
      'Every human override becomes a training signal for the next cycle.',
    icon: '🔄'
  },
  {
    title: 'Red-team cycles',
    description:
      'Periodic adversarial testing of agents against pricing errors, bad clauses, hallucinated specs and unsafe recommendations.',
    icon: '🔴'
  }
];

const ADVANTAGES = [
  {
    title: 'Cycle times compress',
    description:
      'Proposals that took weeks can be drafted in hours; engineering validation that took days happens in minutes; monthly performance reports generate themselves overnight.',
    icon: '⚡'
  },
  {
    title: 'Quality becomes more consistent',
    description:
      'The best past proposal, the safest past design, and the tightest past contract become the default starting point for every new opportunity.',
    icon: '🎯'
  },
  {
    title: 'Humans focus on what only humans can do',
    description:
      'Building relationships, making judgement calls, owning commitments, and leading teams.',
    icon: '🧑‍💼'
  },
  {
    title: 'Accountability actually strengthens',
    description:
      'Because every decision is logged, explainable, and traceable back to a named human owner.',
    icon: '🔗'
  },
  {
    title: 'Predictive intelligence at scale',
    description:
      'The AI Nexus platform monitors 2,000+ failure modes across the entire fleet in real time, predicts asset failures before they happen, and reads 500-page tenders in minutes — turning reactive operations into proactive value creation.',
    icon: '🔮'
  },
  {
    title: 'Always-on field support',
    description:
      'The O&M Service Co-pilot provides instant AI Q&A for field engineers — answering questions, guiding diagnosis, and querying data in real time without waiting for an agent run or manager availability.',
    icon: '💬'
  }
];

const CLOSING =
  'This is not AI replacing Thermax\u2019s people. It is AI giving every Thermax engineer, salesperson, project manager, and leader a tireless team of digital assistants \u2014 with 9 specialised agents, a proactive Service Co-pilot, real-time asset performance monitoring, automated tender intelligence, and four experience modes \u2014 so the organisation can grow its top line, while keeping its engineering rigour, safety culture, and customer trust fully intact.';

export default function OperatingSystemPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-thermax-mist to-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-thermax-navyDeep via-thermax-navy to-thermax-slate text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] font-mono mb-5">
            <span className="w-1.5 h-1.5 bg-thermax-saffron rounded-full animate-pulse" />
            Five-Layer Architecture
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            &lsquo;9-Stage&rsquo; Agentic AI
            <br />
            <span className="text-thermax-saffron">Operating System</span>
          </h1>
          <p className="mt-4 text-white/70 max-w-3xl text-[15px] leading-relaxed">
            9 specialised agents, a proactive Service Co-pilot, 4 experience modes (Prompting,
            Doc Intelligence, Agentic AI, AI Nexus), and enterprise apps for asset performance
            monitoring and tender intelligence — while humans stay firmly in control of
            every commitment, risk acceptance, and accountability decision.
          </p>
          <p className="mt-3 text-thermax-saffron font-semibold text-lg italic">
            &ldquo;AI does the work, humans make the calls.&rdquo;
          </p>
        </div>
      </section>

      {/* Four-Layer Architecture */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-thermax-navy">
            The Five-Layer Architecture
          </h2>
          <p className="text-[14px] text-thermax-slate mt-2 max-w-3xl leading-relaxed">
            The automation is not a single chatbot bolted onto the workflow. It is a
            stack of five layers working in concert — from the data foundation through
            agent intelligence to the experience modes that bring it all together:
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {LAYERS.map((layer) => (
            <div
              key={layer.number}
              className="bg-white rounded-xl border border-thermax-line shadow-sm overflow-hidden hover:shadow-md transition"
            >
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ backgroundColor: layer.color }}
              >
                <span className="text-2xl">{layer.icon}</span>
                <div>
                  <span className="text-[9px] font-mono uppercase text-white/80">
                    Layer {layer.number}
                  </span>
                  <h3 className="font-bold text-white text-base leading-tight">
                    {layer.name}
                  </h3>
                </div>
              </div>
              <div className="px-5 py-4">
                <ul className="space-y-2">
                  {layer.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-thermax-navy leading-relaxed flex gap-2"
                    >
                      <span className="text-thermax-saffron mt-0.5 shrink-0">
                        &bull;
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stage-by-Stage: What AI Does, Where Humans Step In */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-thermax-navy">
            Stage-by-Stage: What AI Does, Where Humans Step In
          </h2>
          <p className="text-[14px] text-thermax-slate mt-2 max-w-3xl leading-relaxed">
            For each of the nine stages, a clear delineation of AI automation
            versus mandatory human-in-the-loop controls.
          </p>
        </div>

        <div className="space-y-4">
          {AGENT_STAGES.map((stage) => (
            <div
              key={stage.number}
              className="bg-white rounded-xl border border-thermax-line shadow-sm overflow-hidden hover:shadow-md transition"
            >
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ backgroundColor: stage.color }}
              >
                <span className="text-2xl">{stage.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded-full">
                      STAGE {stage.number}
                    </span>
                    <h3 className="font-bold text-white text-base">
                      {stage.title}
                    </h3>
                    <span className="text-[11px] text-white/80">
                      &mdash; {stage.agentName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 grid md:grid-cols-3 gap-4">
                <RoleField
                  label="AI Automates"
                  value={stage.aiAutomates}
                  bgColor="bg-blue-50"
                  borderColor="border-blue-200"
                  labelColor="text-blue-700"
                  icon="🤖"
                />
                <RoleField
                  label="Human-in-the-Loop"
                  value={stage.humanInLoop}
                  bgColor="bg-green-50"
                  borderColor="border-green-200"
                  labelColor="text-green-700"
                  icon="👤"
                />
                <RoleField
                  label="Mandatory Human Approval"
                  value={stage.mandatoryApproval}
                  bgColor="bg-red-50"
                  borderColor="border-red-200"
                  labelColor="text-red-700"
                  icon="✋"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Governance Principles */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-thermax-navy">
            Governance Principles (AgentGuard)
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GOVERNANCE_PRINCIPLES.map((p) => (
            <div
              key={p.title}
              className="bg-white rounded-xl border border-thermax-line p-5 hover:shadow-md transition"
            >
              <div className="text-2xl mb-3">{p.icon}</div>
              <h3 className="font-bold text-thermax-navy text-[14px] mb-1">
                {p.title}
              </h3>
              <p className="text-[12px] text-thermax-slate leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Business Advantage */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-thermax-navy">
            Business Advantage: The Payoff
          </h2>
          <p className="text-[14px] text-thermax-slate mt-2 max-w-3xl">
            When this architecture is in place, the Thermax workflow behaves very
            differently:
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {ADVANTAGES.map((a) => (
            <div
              key={a.title}
              className="bg-gradient-to-br from-thermax-navy to-thermax-slate text-white rounded-xl p-6"
            >
              <div className="text-2xl mb-2">{a.icon}</div>
              <h3 className="font-bold text-lg mb-2">{a.title}</h3>
              <p className="text-[13px] text-white/85 leading-relaxed">
                {a.description}
              </p>
            </div>
          ))}
        </div>

        {/* Closing statement */}
        <div className="mt-6 bg-thermax-saffron/10 border border-thermax-saffron/30 rounded-xl p-6">
          <p className="text-[15px] text-thermax-navy leading-relaxed italic font-medium">
            {CLOSING}
          </p>
        </div>
      </section>

      {/* Synthetic Data Summary */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-thermax-navy">
            Synthetic Data Files
          </h2>
          <p className="text-[14px] text-thermax-slate mt-2 max-w-4xl leading-relaxed">
            The system datasets contain 27+ interlinked CSV files across 11 folders
            plus AI Nexus data, organised exactly along the nine-stage workflow plus
            master data, governance, and enterprise apps. Every file has 50+ rows, and
            all IDs cross-reference consistently (a CUST-xxxx in customers_master.csv
            flows through signals &rarr; briefs &rarr; opportunities &rarr; proposals
            &rarr; projects &rarr; telemetry &rarr; tickets). The AI Nexus adds asset
            telemetry, incident histories, and tender documents across 4 divisions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DATA_FOLDERS.map((f) => (
            <div
              key={f.folder}
              className="bg-white rounded-lg border border-thermax-line p-4 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{f.icon}</span>
                <span className="text-[10px] font-mono text-thermax-slate">
                  {f.folder}
                </span>
              </div>
              <p className="text-[12px] text-thermax-navy font-medium">
                {f.description}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-thermax-slate mt-3 leading-relaxed">
          Total: <strong>4,300+ data rows</strong> of realistic, interconnected
          records using authentic Indian industrial customers, Thermax products, and
          employee names — plus AI Nexus datasets for asset telemetry (boilers,
          heaters, water treatment, solar thermal), incident histories, and tender
          documents across 4 divisions — ready to drop into a database, BI tool, or
          agent simulator.
        </p>
      </section>

      {/* Navigation */}
      <section className="max-w-6xl mx-auto px-6 py-8 pb-16">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/flow-diagram"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
          >
            &larr; Flow Diagram
          </Link>
          <Link
            href="/stages/marketing"
            className="bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition text-sm"
          >
            Start Stage 1: Market Intelligence &rarr;
          </Link>
          <Link
            href="/storyline"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
          >
            Business Storyline
          </Link>
          <Link
            href="/governance"
            className="border border-red-600 text-red-600 font-semibold px-5 py-2.5 rounded-md hover:bg-red-600 hover:text-white transition text-sm"
          >
            AgentGuard Governance
          </Link>
          <Link
            href="/ai-nexus"
            className="border border-violet-600 text-violet-600 font-semibold px-5 py-2.5 rounded-md hover:bg-violet-600 hover:text-white transition text-sm"
          >
            Explore AI Nexus
          </Link>
        </div>
      </section>
    </div>
  );
}

function RoleField({
  label,
  value,
  bgColor,
  borderColor,
  labelColor,
  icon
}: {
  label: string;
  value: string;
  bgColor: string;
  borderColor: string;
  labelColor: string;
  icon: string;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span
          className={`text-[10px] font-mono uppercase tracking-wider font-bold ${labelColor}`}
        >
          {label}
        </span>
      </div>
      <p className="text-[12px] text-thermax-navy leading-relaxed">{value}</p>
    </div>
  );
}

const DATA_FOLDERS = [
  {
    folder: '00_master_data',
    icon: '🗄️',
    description: '4 files: customers (53), products (55), employees (75), agent deployments (60)'
  },
  {
    folder: '01_marketing',
    icon: '📡',
    description: 'Market Intelligence — Market signals (70) and account briefs (60)'
  },
  {
    folder: '02_sales',
    icon: '🎯',
    description: 'Lead Qualification — Opportunities (60) and stakeholder map (309)'
  },
  {
    folder: '03_presales',
    icon: '📝',
    description: 'Proposal — Proposals (55) and Bill of Materials (297)'
  },
  {
    folder: '04_engineering',
    icon: '⚙️',
    description: 'Engineering Review — Validations (55) and performance guarantees (106)'
  },
  {
    folder: '05_finance_legal',
    icon: '💼',
    description: 'Commercial & Legal — Risk assessments (55) and contract reviews (55)'
  },
  {
    folder: '06_hr_pmo',
    icon: '👷',
    description: 'Project Planning — Projects (55) and resource assignments (410)'
  },
  {
    folder: '07_site_operations',
    icon: '🏗️',
    description: 'Execution & Monitoring — Site progress (417), safety incidents (55), NCRs (55)'
  },
  {
    folder: '08_commissioning',
    icon: '🔬',
    description: 'Commissioning tests (190)'
  },
  {
    folder: '09_digital_service',
    icon: '🔧',
    description: 'Service cases (15), SOP library (12), spare parts (20), service tickets (60)'
  },
  {
    folder: '10_governance',
    icon: '🛡️',
    description:
      'Approval gates (70), agent audit log (450), human overrides (60), confidence escalations (55)'
  },
  {
    folder: 'ai-nexus/assets',
    icon: '⚡',
    description:
      'Asset Performance — boiler telemetry, incident history, 2,000+ failure modes, 4 site locations'
  },
  {
    folder: 'ai-nexus/tenders',
    icon: '📑',
    description:
      'Tender Intelligence — sample RFPs for Water Treatment, CFBC Boiler, Heating Systems, Solar Thermal'
  }
];
