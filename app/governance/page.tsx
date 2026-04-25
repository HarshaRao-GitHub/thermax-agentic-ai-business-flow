import { governanceConfig } from '@/data/stages';
import GovernanceClient from '@/components/GovernanceClient';

export const metadata = {
  title: 'AgentGuard Governance — Thermax\'s AI OS 2030',
  description: 'Cross-cutting governance layer for the Thermax 9-stage agentic AI operating system.'
};

export default function GovernancePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-2xl">
            🛡️
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-red-600">
              Cross-Cutting Governance
            </div>
            <h1 className="text-2xl font-bold text-thermax-navy">{governanceConfig.title}</h1>
          </div>
        </div>
        <p className="text-[14px] text-thermax-slate max-w-3xl">
          {governanceConfig.subtitle}. Powered by the <strong>{governanceConfig.agent.name}</strong> ({governanceConfig.agent.shortId})
          with {governanceConfig.tools.length} governance tools monitoring {governanceConfig.dataSources.reduce((a, d) => a + d.rowEstimate, 0)}+ records
          across 9 agents, the O&amp;M Service Co-pilot, and AI Nexus enterprise apps.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 mb-8">
        <GovernanceStat
          icon="🚦"
          label="Approval Gates"
          value="70"
          detail="Across 9 stages"
          color="bg-amber-50 border-amber-200"
        />
        <GovernanceStat
          icon="📋"
          label="Audit Trail"
          value="450"
          detail="Agent actions logged"
          color="bg-blue-50 border-blue-200"
        />
        <GovernanceStat
          icon="🔄"
          label="Human Overrides"
          value="60"
          detail="AI decisions reversed"
          color="bg-purple-50 border-purple-200"
        />
        <GovernanceStat
          icon="⬆️"
          label="Escalations"
          value="55"
          detail="Low-confidence cases"
          color="bg-red-50 border-red-200"
        />
        <GovernanceStat
          icon="⚡"
          label="AI Nexus Apps"
          value="2"
          detail="Asset Perf. + Tender Intel."
          color="bg-violet-50 border-violet-200"
        />
      </div>

      <GovernanceClient />
    </div>
  );
}

function GovernanceStat({
  icon,
  label,
  value,
  detail,
  color
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className={`${color} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-[12px] font-semibold text-thermax-navy">{label}</span>
      </div>
      <div className="text-2xl font-bold text-thermax-navy">{value}</div>
      <div className="text-[11px] text-thermax-slate mt-0.5">{detail}</div>
    </div>
  );
}
