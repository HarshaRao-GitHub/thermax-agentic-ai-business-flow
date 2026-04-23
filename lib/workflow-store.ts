/**
 * Workflow Store — persistent (in-memory, survives across requests) store
 * for stage results, gate statuses, and the active workflow flow.
 *
 * Stages 1-5 (mandatory): Sequential gating — each requires HITL approval
 * before the next unlocks.
 * Stages 6-9 (optional): Available once Stage 5 is approved. Each maintains
 * sequential order but can be skipped to unlock the next.
 */

import { getAllApprovals } from './hitl-gate';

export interface StageResult {
  slug: string;
  stageNumber: number;
  messages: { role: 'user' | 'assistant'; content: string }[];
  toolEvents: { type: 'start' | 'result'; tool: string; input?: Record<string, unknown>; result?: string; timestamp: number }[];
  usageStats: Record<string, unknown> | null;
  hitlEvent: Record<string, unknown> | null;
  hitlDecision: string | null;
  mode: 'live' | 'mock' | null;
  completedAt: string;
}

export type GateStatus = 'locked' | 'available' | 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'skipped';

export interface WorkflowFlow {
  id: string;
  createdAt: string;
  stageResults: Record<string, StageResult>;
  skippedStages: Set<string>;
}

let activeFlow: WorkflowFlow | null = null;

function ensureFlow(): WorkflowFlow {
  if (!activeFlow) {
    activeFlow = {
      id: `FLOW-${Date.now()}`,
      createdAt: new Date().toISOString(),
      stageResults: {},
      skippedStages: new Set()
    };
  }
  if (!activeFlow.skippedStages) {
    activeFlow.skippedStages = new Set();
  }
  return activeFlow;
}

export function getActiveFlow(): WorkflowFlow | null {
  return activeFlow;
}

export function saveStageResult(result: StageResult): void {
  const flow = ensureFlow();
  flow.stageResults[result.slug] = result;
}

export function getStageResult(slug: string): StageResult | null {
  return activeFlow?.stageResults[slug] ?? null;
}

export function resetFlow(): void {
  activeFlow = null;
}

export function skipStage(slug: string): boolean {
  const meta = STAGE_META[slug];
  if (!meta || meta.mandatory) return false;
  const flow = ensureFlow();
  flow.skippedStages.add(slug);
  return true;
}

export function isStageSkipped(slug: string): boolean {
  return activeFlow?.skippedStages?.has(slug) ?? false;
}

const STAGE_ORDER = [
  'marketing', 'sales', 'presales', 'engineering',
  'finance-legal', 'hr-pmo', 'site-operations',
  'commissioning', 'digital-service'
];

const STAGE_META: Record<string, { mandatory: boolean }> = {
  'marketing': { mandatory: true },
  'sales': { mandatory: true },
  'presales': { mandatory: true },
  'engineering': { mandatory: true },
  'finance-legal': { mandatory: true },
  'hr-pmo': { mandatory: false },
  'site-operations': { mandatory: false },
  'commissioning': { mandatory: false },
  'digital-service': { mandatory: false },
};

function isPrevStageCleared(i: number, result: Record<string, GateStatus>): boolean {
  if (i === 0) return true;
  const prevSlug = STAGE_ORDER[i - 1];
  const prevStatus = result[prevSlug];
  return prevStatus === 'approved' || prevStatus === 'skipped';
}

export function getGateStatuses(): Record<string, GateStatus> {
  const result: Record<string, GateStatus> = {};
  const approvals = getAllApprovals();
  const flow = activeFlow;

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const slug = STAGE_ORDER[i];
    const meta = STAGE_META[slug];

    if (flow?.skippedStages?.has(slug)) {
      result[slug] = 'skipped';
      continue;
    }

    const stageApprovals = approvals
      .filter(a => a.stageSlug === slug)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latestApproval = stageApprovals[0];

    if (latestApproval) {
      if (latestApproval.status === 'pending') {
        result[slug] = 'awaiting_approval';
        continue;
      }
      if (latestApproval.status === 'approved' || latestApproval.status === 'modified') {
        result[slug] = 'approved';
        continue;
      }
      if (latestApproval.status === 'rejected') {
        result[slug] = 'rejected';
        continue;
      }
    }

    const savedResult = flow?.stageResults[slug];
    if (savedResult) {
      result[slug] = 'awaiting_approval';
      continue;
    }

    if (isPrevStageCleared(i, result)) {
      result[slug] = 'available';
    } else {
      result[slug] = 'locked';
    }
  }

  return result;
}

export function isStageAccessible(slug: string): boolean {
  const statuses = getGateStatuses();
  const status = statuses[slug];
  return status !== 'locked';
}

export function getStageMeta() {
  return STAGE_META;
}

export function getFlowSummary() {
  const statuses = getGateStatuses();
  const flow = activeFlow;
  return {
    flowId: flow?.id ?? null,
    createdAt: flow?.createdAt ?? null,
    stages: STAGE_ORDER.map((slug, i) => ({
      slug,
      stageNumber: i + 1,
      gateStatus: statuses[slug],
      mandatory: STAGE_META[slug].mandatory,
      hasResult: !!flow?.stageResults[slug],
      completedAt: flow?.stageResults[slug]?.completedAt ?? null
    }))
  };
}
