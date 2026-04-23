import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Storyline — Thermax\'s Agentic AI Operating System 2030',
  description:
    'The Thermax business storyline: how every project flows from opportunity sensing to long-term customer value in a continuous loop.'
};

const STORYLINE_PARAGRAPHS = [
  {
    highlight: 'Every Thermax project begins long before a tender lands on the table.',
    body: `It starts with Marketing sensing where the next opportunity is taking shape — such as a cement plant planning an expansion, a refinery preparing for stricter emission norms, a pharma company struggling with high utility costs, or a steel unit facing reliability issues.`,
    accent: 'Marketing'
  },
  {
    highlight: 'Instead of treating this as just another lead,',
    body: `Marketing frames it as a business problem: where is the customer losing money, where are they exposed to risk, and where can Thermax genuinely help.`,
    accent: 'Marketing'
  },
  {
    highlight: 'Sales then picks up the thread',
    body: `and tests whether the opportunity is real by checking who the decision-makers are, how urgent the need is, who else is competing, and whether the customer is looking for a quick purchase or a long-term partner.`,
    accent: 'Sales'
  },
  {
    highlight: 'Once the opportunity looks serious,',
    body: `Pre-sales steps in to shape it into a concrete proposal — with a clear scope, a technical approach, a commercial structure, and a solution story built around outcomes, not just equipment.`,
    accent: 'Pre-sales'
  },
  {
    highlight: 'From here, the focus shifts from selling the idea to making sure Thermax can truly deliver it.',
    body: `Engineering takes a hard look at the proposal and validates what is actually possible — based on process conditions, site constraints, performance guarantees, and safety standards. This is where Thermax decides what it will confidently commit to, and what it will not.`,
    accent: 'Engineering'
  },
  {
    highlight: 'Finance ensures the deal protects margin, cash flow, and delivery economics.',
    body: `Legal reviews contract terms to avoid hidden liabilities, penalty risks, and unfair clauses.`,
    accent: 'Finance & Legal'
  },
  {
    highlight:
      'Once the opportunity is both technically sound and commercially safe, the organisation quietly gears up for execution.',
    body: `HR and PMO now play a critical role by mobilising the right engineers, project managers, and site teams, ensuring the right skills and certifications are in place, and making sure everything and everyone is ready when the project kicks off.`,
    accent: 'HR & PMO'
  },
  {
    highlight: 'The real test begins when the project moves to the ground.',
    body: `Site Operations take charge of execution — managing safety, quality, schedule, subcontractors, and the many day-to-day issues that decide whether a project runs smoothly or slips.`,
    accent: 'Site Operations'
  },
  {
    highlight: 'Commissioning is the moment where all the effort comes together:',
    body: `the system is started, tested, stabilised, and proven in live operating conditions. This is where promises turn into performance.`,
    accent: 'Commissioning'
  },
  {
    highlight: 'But the story does not end at handover.',
    body: `O&M Services take over the plant's ongoing life — supporting field engineers with SOPs and diagnosis guidance, resolving service cases through structured root cause analysis, managing spare parts intelligence, and helping the customer get the most out of their investment.`,
    accent: 'O&M Services'
  },
  {
    highlight:
      'Over time, this same customer becomes the source of the next opportunity',
    body: `— through renewals, retrofits, upgrades, service contracts, and success stories that go back to Marketing and Sales.`,
    accent: 'Loop'
  }
];

const CLOSING =
  'In this way, the Thermax workflow is not a straight line from order to delivery — it is a continuous loop, where every well-delivered project becomes the starting point for the next one.';

const STAGE_COLORS: Record<string, string> = {
  Marketing: '#3B82F6',
  Sales: '#8B5CF6',
  'Pre-sales': '#06B6D4',
  Engineering: '#EF4444',
  'Finance & Legal': '#F59E0B',
  'HR & PMO': '#10B981',
  'Site Operations': '#6366F1',
  Commissioning: '#EC4899',
  'O&M Services': '#14B8A6',
  Loop: '#DC2626'
};

export default function StorylinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-thermax-mist to-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-thermax-navyDeep via-thermax-navy to-thermax-slate text-white">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[11px] font-mono mb-5">
            <span className="w-1.5 h-1.5 bg-thermax-saffron rounded-full animate-pulse" />
            From the Thermax Business Flow Document v1.0
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            Business Storyline
          </h1>
          <p className="mt-4 text-white/70 max-w-2xl text-[15px] leading-relaxed">
            The narrative of how a Thermax project flows — from the first market
            signal to a long-term customer relationship, and back again.
          </p>
        </div>
      </section>

      {/* Storyline */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-emerald-300 to-teal-300 hidden md:block" />

          <div className="space-y-8">
            {STORYLINE_PARAGRAPHS.map((para, i) => {
              const color = STAGE_COLORS[para.accent] ?? '#6366F1';
              return (
                <div key={i} className="relative md:pl-16">
                  {/* Timeline dot */}
                  <div
                    className="absolute left-4 top-3 w-5 h-5 rounded-full border-4 border-white shadow-md hidden md:block"
                    style={{ backgroundColor: color }}
                  />

                  <div className="bg-white rounded-xl border border-thermax-line shadow-sm p-6 hover:shadow-md transition">
                    <div
                      className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full text-white mb-3"
                      style={{ backgroundColor: color }}
                    >
                      {para.accent}
                    </div>
                    <p className="text-[15px] leading-relaxed text-thermax-navy">
                      <span className="font-semibold">{para.highlight}</span>{' '}
                      {para.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Closing */}
        <div className="mt-12 bg-gradient-to-r from-thermax-navy to-thermax-slate text-white rounded-xl p-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl mt-1">🔄</div>
            <div>
              <h3 className="text-lg font-bold mb-2">The Continuous Loop</h3>
              <p className="text-[15px] leading-relaxed text-white/90">
                {CLOSING}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/business-flow"
            className="bg-thermax-saffron text-white font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-saffronDeep transition text-sm"
          >
            View 9-Stage Business Flow &rarr;
          </Link>
          <Link
            href="/flow-diagram"
            className="border border-thermax-navy text-thermax-navy font-semibold px-5 py-2.5 rounded-md hover:bg-thermax-navy hover:text-white transition text-sm"
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
