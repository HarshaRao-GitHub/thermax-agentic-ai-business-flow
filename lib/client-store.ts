// ============= TYPES =============

export type GateStatus =
  | 'locked'
  | 'available'
  | 'running'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'skipped';

export interface StageResult {
  slug: string;
  stageNumber: number;
  messages: { role: 'user' | 'assistant'; content: string }[];
  toolEvents: {
    type: 'start' | 'result';
    tool: string;
    input?: Record<string, unknown>;
    result?: string;
    timestamp: number;
  }[];
  usageStats: Record<string, unknown> | null;
  hitlEvent: Record<string, unknown> | null;
  hitlDecision: string | null;
  mode: 'live' | null;
  completedAt: string;
}

export interface ApprovalRecord {
  id: string;
  stageSlug: string;
  stageNumber: number;
  status: 'pending' | 'approved' | 'modified' | 'rejected';
  decidedBy?: string;
  comment?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface CustomAgentTask {
  id: string;
  label: string;
  description: string;
}

export interface BaseDocument {
  filename: string;
  text: string;
  sizeKb: number;
}

export interface CustomAgent {
  id: string;
  name: string;
  avatarUrl: string;
  description: string;
  instructions: string;
  tasks: CustomAgentTask[];
  baseDocuments: BaseDocument[];
  acceptedFiles: string;
  createdAt: string;
  lastUsedAt: string | null;
  runCount: number;
}

// ============= CONSTANTS =============

const KEYS = {
  STAGE_RESULTS: 'thermax_stage_results',
  APPROVALS: 'thermax_approvals',
  SKIPPED_STAGES: 'thermax_skipped_stages',
  FLOW_ID: 'thermax_flow_id',
  FLOW_CREATED: 'thermax_flow_created',
  CUSTOM_AGENTS: 'thermax_custom_agents',
} as const;

const STAGE_ORDER = [
  'marketing',
  'sales',
  'presales',
  'commercial-legal',
  'project-planning',
  'engineering-design',
  'procurement-mfg',
  'commissioning',
  'service-troubleshooting',
] as const;

const MANDATORY_SLUGS = new Set<string>([
  'marketing',
  'sales',
  'presales',
  'commercial-legal',
  'project-planning',
  'engineering-design',
  'procurement-mfg',
  'commissioning',
  'service-troubleshooting',
]);

// ============= HELPERS =============

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ============= WORKFLOW FLOW =============

export function getFlowId(): string | null {
  return load<string | null>(KEYS.FLOW_ID, null);
}

export function ensureFlow(): { id: string; createdAt: string } {
  const existing = getFlowId();
  if (existing) {
    const createdAt = load<string>(KEYS.FLOW_CREATED, new Date().toISOString());
    return { id: existing, createdAt };
  }

  const id = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  save(KEYS.FLOW_ID, id);
  save(KEYS.FLOW_CREATED, createdAt);
  return { id, createdAt };
}

export function resetFlow(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.STAGE_RESULTS);
  localStorage.removeItem(KEYS.APPROVALS);
  localStorage.removeItem(KEYS.SKIPPED_STAGES);
  localStorage.removeItem(KEYS.FLOW_ID);
  localStorage.removeItem(KEYS.FLOW_CREATED);
}

// ============= STAGE RESULTS =============

export function getStageResult(slug: string): StageResult | null {
  const all = load<Record<string, StageResult>>(KEYS.STAGE_RESULTS, {});
  return all[slug] ?? null;
}

export function saveStageResult(result: StageResult): void {
  const all = load<Record<string, StageResult>>(KEYS.STAGE_RESULTS, {});
  all[result.slug] = result;
  save(KEYS.STAGE_RESULTS, all);
}

// ============= APPROVALS =============

export function getApprovals(): ApprovalRecord[] {
  return load<ApprovalRecord[]>(KEYS.APPROVALS, []);
}

export function addApproval(record: ApprovalRecord): void {
  const approvals = getApprovals();
  approvals.push(record);
  save(KEYS.APPROVALS, approvals);
}

export function updateApproval(
  id: string,
  updates: Partial<ApprovalRecord>,
): void {
  const approvals = getApprovals();
  const idx = approvals.findIndex((a) => a.id === id);
  if (idx === -1) return;
  approvals[idx] = { ...approvals[idx], ...updates };
  save(KEYS.APPROVALS, approvals);
}

export function getLatestApprovalForStage(
  slug: string,
): ApprovalRecord | null {
  const approvals = getApprovals().filter((a) => a.stageSlug === slug);
  if (approvals.length === 0) return null;
  return approvals[approvals.length - 1];
}

// ============= SKIP STAGES =============

export function getSkippedStages(): string[] {
  return load<string[]>(KEYS.SKIPPED_STAGES, []);
}

export function skipStage(slug: string): boolean {
  if (MANDATORY_SLUGS.has(slug)) return false;
  const skipped = getSkippedStages();
  if (!skipped.includes(slug)) {
    skipped.push(slug);
    save(KEYS.SKIPPED_STAGES, skipped);
  }
  return true;
}

export function isStageSkipped(slug: string): boolean {
  return getSkippedStages().includes(slug);
}

// ============= GATE STATUS COMPUTATION =============

export function computeGateStatuses(): Record<string, GateStatus> {
  const result: Record<string, GateStatus> = {};
  const skipped = new Set(getSkippedStages());

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const slug = STAGE_ORDER[i];

    if (skipped.has(slug)) {
      result[slug] = 'skipped';
      continue;
    }

    const approval = getLatestApprovalForStage(slug);
    if (approval) {
      if (approval.status === 'pending') {
        result[slug] = 'awaiting_approval';
        continue;
      }
      if (approval.status === 'approved' || approval.status === 'modified') {
        result[slug] = 'approved';
        continue;
      }
      if (approval.status === 'rejected') {
        result[slug] = 'rejected';
        continue;
      }
    }

    const stageResult = getStageResult(slug);
    if (stageResult) {
      result[slug] = 'awaiting_approval';
      continue;
    }

    if (i === 0) {
      result[slug] = 'available';
      continue;
    }

    const prevSlug = STAGE_ORDER[i - 1];
    const prevStatus = result[prevSlug];
    if (prevStatus === 'approved' || prevStatus === 'skipped') {
      result[slug] = 'available';
    } else {
      result[slug] = 'locked';
    }
  }

  return result;
}

export function isStageMandatory(slug: string): boolean {
  return MANDATORY_SLUGS.has(slug);
}

export function getFlowSummary() {
  const statuses = computeGateStatuses();
  return {
    flowId: getFlowId(),
    createdAt: load<string | null>(KEYS.FLOW_CREATED, null),
    stages: STAGE_ORDER.map((slug, i) => ({
      slug,
      stageNumber: i + 1,
      gateStatus: statuses[slug],
      mandatory: MANDATORY_SLUGS.has(slug),
      hasResult: !!getStageResult(slug),
      completedAt: getStageResult(slug)?.completedAt ?? null,
    })),
  };
}

// ============= UPSTREAM RESULTS =============

export function getUpstreamResults(slug: string): { slug: string; stageNumber: number; agentOutput: string }[] {
  const idx = STAGE_ORDER.indexOf(slug as (typeof STAGE_ORDER)[number]);
  if (idx <= 0) return [];

  const results: { slug: string; stageNumber: number; agentOutput: string }[] = [];
  for (let i = 0; i < idx; i++) {
    const upSlug = STAGE_ORDER[i];
    const sr = getStageResult(upSlug);
    if (!sr) continue;
    const assistantMsgs = sr.messages.filter(m => m.role === 'assistant').map(m => m.content);
    if (assistantMsgs.length === 0) continue;
    results.push({
      slug: upSlug,
      stageNumber: sr.stageNumber,
      agentOutput: assistantMsgs[0],
    });
  }
  return results;
}

// ============= CUSTOM AGENTS =============

export function listCustomAgents(): CustomAgent[] {
  return load<CustomAgent[]>(KEYS.CUSTOM_AGENTS, []);
}

export function getCustomAgent(id: string): CustomAgent | null {
  const agents = listCustomAgents();
  return agents.find((a) => a.id === id) ?? null;
}

export function createCustomAgent(
  data: Omit<CustomAgent, 'id' | 'createdAt' | 'lastUsedAt' | 'runCount'>,
): CustomAgent {
  const agent: CustomAgent = {
    ...data,
    id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    runCount: 0,
  };
  const agents = listCustomAgents();
  agents.push(agent);
  save(KEYS.CUSTOM_AGENTS, agents);
  return agent;
}

export function deleteCustomAgent(id: string): boolean {
  const agents = listCustomAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  agents.splice(idx, 1);
  save(KEYS.CUSTOM_AGENTS, agents);
  return true;
}

export function recordCustomAgentRun(id: string): void {
  const agents = listCustomAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) return;
  agents[idx].runCount += 1;
  agents[idx].lastUsedAt = new Date().toISOString();
  save(KEYS.CUSTOM_AGENTS, agents);
}
