import Link from 'next/link';
import { stages, governanceConfig } from '@/data/stages';
import StageCard from '@/components/StageCard';
import StageFlowGrid from '@/components/StageFlowGrid';
import WorkflowVisualizer from '@/components/WorkflowVisualizer';

export default function Home() {
  const totalDataRows = stages.reduce(
    (acc, s) => acc + s.dataSources.reduce((a, d) => a + d.rowEstimate, 0),
    0
  ) + governanceConfig.dataSources.reduce((a, d) => a + d.rowEstimate, 0);

  const totalTools = stages.reduce((a, s) => a + s.tools.length, 0) + governanceConfig.tools.length;

  return (
    <div>
      <section className="bg-gradient-to-br from-thermax-navyDeep via-thermax-navy to-thermax-slate text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-20 grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] font-mono mb-5">
              <span className="w-1.5 h-1.5 bg-thermax-saffron rounded-full animate-pulse" />
              Thermax's Agentic AI Operating System 2030 · Enterprise LLM
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              9-Stage Enterprise
              <br />
              <span className="text-thermax-saffron">Agentic AI System.</span>
            </h1>
            <p className="mt-4 text-white/75 max-w-2xl text-[15px] leading-relaxed">
              End-to-end AI operating system for Thermax — from Market Intelligence to O&amp;M Services,
              with AgentGuard governance. 10 autonomous agents, 31 tools, 4,086+ data records,
              processing every stage of the enterprise workflow.
            </p>
            <p className="mt-2 text-thermax-saffron font-semibold italic text-[15px]">
              &ldquo;AI does the work, humans make the calls.&rdquo;
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/stages/marketing"
                className="bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition"
              >
                Start with Stage 1: Market Intelligence
              </Link>
              <Link
                href="/governance"
                className="border border-white/30 text-white px-5 py-2.5 rounded-md hover:bg-white/10 transition"
              >
                AgentGuard Governance
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat n="9" label="Workflow Stages" />
            <Stat n="10" label="AI Agents" />
            <Stat n={String(totalTools)} label="Agentic Tools" />
            <Stat n={totalDataRows.toLocaleString()} label="Data Records" />
            <Stat n="27" label="CSV Data Files" />
            <Stat n="LLM" label="Foundation Model" mono />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <WorkflowVisualizer />
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="text-[11px] font-mono uppercase tracking-wider text-thermax-saffronDeep">
            Signal → Service Pipeline
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-thermax-navy mt-1">
            9-Stage Agentic AI Agents
          </h2>
          <p className="text-thermax-slate mt-2 max-w-3xl text-[14px] leading-relaxed">
            Each stage has a dedicated AI agent with specialized tools, operating on real enterprise data.
            Every agent action is governed by AgentGuard — approval gates, audit trails, confidence-based escalations, and human override tracking.
          </p>
        </div>
        <StageFlowGrid stages={stages} />
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <Link
          href="/governance"
          className="block bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6 hover:shadow-md transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center text-2xl">
              🛡️
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-red-600">
                Cross-Cutting Governance
              </div>
              <h3 className="text-lg font-bold text-thermax-navy">
                AgentGuard — {governanceConfig.title}
              </h3>
              <p className="text-[13px] text-thermax-slate mt-1">
                {governanceConfig.subtitle}. Monitors {governanceConfig.dataSources.reduce((a, d) => a + d.rowEstimate, 0)}+ governance records across approval gates,
                audit trails, human overrides, and confidence escalations.
              </p>
            </div>
            <div className="hidden md:flex flex-col gap-1 text-[11px]">
              {governanceConfig.tools.map((t) => (
                <span key={t.name} className="font-mono bg-white/80 text-red-700 px-2 py-0.5 rounded">
                  {t.icon} {t.name}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="text-[11px] font-mono uppercase tracking-wider text-thermax-saffronDeep">
            From the Business Flow Document v1.0
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-thermax-navy mt-1">
            Business Reference Pages
          </h2>
          <p className="text-thermax-slate mt-2 max-w-3xl text-[14px] leading-relaxed">
            Explore the Thermax business storyline, the 9-stage disciplined workflow,
            visual flow diagrams, and the agentic AI operating system architecture —
            all derived from the official Business Flow document.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: '/storyline',
              icon: '📖',
              title: 'Business Storyline',
              description:
                'The narrative of how every Thermax project flows from opportunity to delivery and back — a continuous loop.',
              color: '#3B82F6'
            },
            {
              href: '/business-flow',
              icon: '📋',
              title: "'9-Stage' Business Flow",
              description:
                'Disciplined entry, inputs, process, outputs, and handoff documents for each of the 9 stages.',
              color: '#8B5CF6'
            },
            {
              href: '/flow-diagram',
              icon: '🗺️',
              title: "'9-Stage' Flow Diagram",
              description:
                'Visual pipeline with three phases, HITL gates, data flow between stages, and the feedback loop.',
              color: '#10B981'
            },
            {
              href: '/operating-system',
              icon: '🤖',
              title: "'9-Stage' AI Operating System",
              description:
                'Four-layer architecture, AI vs human breakdown per stage, AgentGuard governance principles.',
              color: '#DC2626'
            }
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-xl border border-thermax-line p-5 hover:shadow-lg transition relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: card.color }}
              />
              <div className="text-2xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-thermax-navy text-[15px] group-hover:text-thermax-saffron transition">
                {card.title}
              </h3>
              <p className="text-[12px] text-thermax-slate mt-1.5 leading-relaxed">
                {card.description}
              </p>
              <div className="mt-3 text-[11px] font-semibold text-thermax-saffron">
                Explore &rarr;
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-thermax-navy">Data Backbone</h2>
          <p className="text-[13px] text-thermax-slate mt-1">
            27 interlinked CSV files with referential integrity across all 9 stages + governance.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {[
            { folder: '00_master_data', label: 'Master Data', files: 4, icon: '🗄️' },
            { folder: '01_marketing', label: 'Marketing', files: 2, icon: '📡' },
            { folder: '02_sales', label: 'Sales', files: 2, icon: '🎯' },
            { folder: '03_presales', label: 'Pre-sales', files: 2, icon: '📝' },
            { folder: '04_engineering', label: 'Engineering', files: 2, icon: '⚙️' },
            { folder: '05_finance_legal', label: 'Finance & Legal', files: 2, icon: '💼' },
            { folder: '06_hr_pmo', label: 'HR & PMO', files: 2, icon: '👷' },
            { folder: '07_site_operations', label: 'Site Ops', files: 3, icon: '🏗️' },
            { folder: '08_commissioning', label: 'Commissioning', files: 1, icon: '🔬' },
            { folder: '09_digital_service', label: 'O&M Services', files: 4, icon: '🔧' },
            { folder: '10_governance', label: 'Governance', files: 4, icon: '🛡️' }
          ].map((f) => (
            <div key={f.folder} className="bg-white border border-thermax-line rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{f.icon}</span>
                <span className="text-[12px] font-semibold text-thermax-navy">{f.label}</span>
              </div>
              <div className="text-[10px] font-mono text-thermax-slate">{f.folder}/ · {f.files} files</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label, mono }: { n: string; label: string; mono?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur">
      <div className={`text-2xl md:text-3xl font-bold text-thermax-saffron ${mono ? 'font-mono text-xl md:text-2xl' : ''}`}>
        {n}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-white/60 mt-1">{label}</div>
    </div>
  );
}
