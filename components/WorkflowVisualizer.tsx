'use client';

import Link from 'next/link';
import { stages } from '@/data/stages';

const FLOW_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#EF4444', '#F59E0B',
  '#10B981', '#6366F1', '#EC4899', '#14B8A6'
];

export default function WorkflowVisualizer() {
  return (
    <div className="bg-white border border-thermax-line rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-thermax-navy">Enterprise Workflow Pipeline</h3>
          <p className="text-[12px] text-thermax-slate mt-0.5">Signal → Brief → Opportunity → Proposal → Validation → Assessment → Contract → Project → Service → (loop)</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/approvals" className="text-[11px] font-semibold text-amber-600 hover:underline flex items-center gap-1">
            <span>🛡️</span> HITL Queue →
          </Link>
          <Link href="/governance" className="text-[11px] font-semibold text-thermax-saffronDeep hover:underline">
            AgentGuard →
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage.slug} className="flex items-center shrink-0">
              <Link
                href={`/stages/${stage.slug}`}
                className="group flex flex-col items-center p-2 rounded-lg hover:bg-thermax-mist transition min-w-[90px]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-1.5 transition group-hover:scale-110 shadow-sm"
                  style={{ backgroundColor: stage.colorLight, color: stage.color }}
                >
                  {stage.icon}
                </div>
                <div className="text-[10px] font-bold text-thermax-navy text-center leading-tight">
                  {stage.number}. {stage.title}
                </div>
                <div className="text-[9px] font-mono text-thermax-slate mt-0.5">
                  {stage.agent.shortId}
                </div>
                <div className="text-[8px] text-amber-600 font-semibold mt-0.5">
                  HITL: {stage.hitlApprover}
                </div>
              </Link>
              {i < stages.length - 1 && (
                <div className="flex flex-col items-center mx-1 gap-0.5">
                  <div className="text-[7px] font-mono text-red-600 font-bold bg-red-50 px-1 rounded">
                    GATE
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-0.5 bg-gradient-to-r" style={{
                      backgroundImage: `linear-gradient(to right, ${FLOW_COLORS[i]}, ${FLOW_COLORS[i + 1]})`
                    }} />
                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px]"
                      style={{ borderLeftColor: FLOW_COLORS[i + 1] }} />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center mx-1 shrink-0">
            <div className="w-6 h-0.5 bg-gradient-to-r from-teal-500 to-blue-500" />
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-blue-500" />
          </div>

          <div className="shrink-0 flex flex-col items-center p-2 min-w-[80px]">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-1.5 bg-blue-100 text-blue-600 opacity-60">
              🔄
            </div>
            <div className="text-[10px] font-bold text-thermax-slate text-center">Loop Back</div>
            <div className="text-[9px] font-mono text-thermax-slate/60">→ Stage 1</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200">
            <span className="text-[11px]">🛡️</span>
            <span className="text-[10px] font-bold text-red-700">AgentGuard</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700">HITL Gates</span>
            <span className="text-[10px] text-amber-600">between every stage</span>
          </div>
          <span className="text-[10px] text-thermax-slate italic">
            &ldquo;AI does the work, humans make the calls&rdquo;
          </span>
        </div>
      </div>
    </div>
  );
}
