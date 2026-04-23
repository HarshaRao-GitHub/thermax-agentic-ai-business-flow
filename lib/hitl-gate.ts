/**
 * HITL Gate — Human-in-the-Loop approval engine.
 *
 * Manages in-memory approval queue, DoA (Delegation of Authority) rules,
 * confidence-based escalation, and workflow state tracking.
 *
 * In a production system this would be backed by a database.
 * Here we use module-level state (persists across requests within a Node process).
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  stageNumber: number;
  stageSlug: string;
  stageTitle: string;
  agentId: string;
  agentName: string;
  approverRole: string;
  reason: string;
  confidence: number;
  isMandatory: boolean;
  isConfidenceTriggered: boolean;
  summary: string;
  handoffDocument: string;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  comment?: string;
  modifications?: string;
}

export interface WorkflowState {
  workflowId: string;
  currentStage: number;
  stageStatuses: Record<
    number,
    {
      status: 'not_started' | 'running' | 'awaiting_approval' | 'approved' | 'rejected';
      approvalId?: string;
      completedAt?: string;
    }
  >;
  createdAt: string;
  updatedAt: string;
}

const CONFIDENCE_THRESHOLD = 0.8;

const MANDATORY_STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DOA_MATRIX: Record<
  number,
  {
    mandatoryReview: boolean;
    approverRole: string;
    artefactsRequired?: string[];
    slaHours: number;
  }
> = {
  1: {
    mandatoryReview: true,
    approverRole: 'Marketing Director',
    artefactsRequired: ['account_brief', 'value_hypothesis'],
    slaHours: 24
  },
  2: {
    mandatoryReview: true,
    approverRole: 'BU Head Sales',
    artefactsRequired: ['qualification_report', 'stakeholder_map'],
    slaHours: 24
  },
  3: {
    mandatoryReview: true,
    approverRole: 'Solution Director',
    artefactsRequired: ['proposal', 'bom', 'pricing_sheet'],
    slaHours: 48
  },
  4: {
    mandatoryReview: true,
    approverRole: 'Chief Engineer',
    artefactsRequired: ['pfd', 'pid', 'pg_document', 'hazop_report'],
    slaHours: 48
  },
  5: {
    mandatoryReview: true,
    approverRole: 'CFO + Legal Counsel',
    artefactsRequired: ['margin_model', 'contract_review'],
    slaHours: 72
  },
  6: {
    mandatoryReview: true,
    approverRole: 'PMO Head',
    artefactsRequired: ['project_charter', 'resource_plan'],
    slaHours: 24
  },
  7: {
    mandatoryReview: true,
    approverRole: 'Project Director',
    artefactsRequired: ['progress_report', 'safety_report'],
    slaHours: 24
  },
  8: {
    mandatoryReview: true,
    approverRole: 'Commissioning Head',
    artefactsRequired: ['pg_test_report', 'pac_document'],
    slaHours: 48
  },
  9: {
    mandatoryReview: true,
    approverRole: 'Service Director',
    artefactsRequired: ['performance_report', 'maintenance_plan'],
    slaHours: 24
  }
};

let approvalQueue: ApprovalRequest[] = [];
let workflows: Record<string, WorkflowState> = {};
let approvalCounter = 0;

function generateApprovalId(): string {
  approvalCounter++;
  return `APR-${String(approvalCounter).padStart(4, '0')}`;
}

function generateWorkflowId(): string {
  return `WF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

export function createApprovalRequest(params: {
  stageNumber: number;
  stageSlug: string;
  stageTitle: string;
  agentId: string;
  agentName: string;
  approverRole: string;
  confidence: number;
  summary: string;
  handoffDocument: string;
  workflowId?: string;
}): ApprovalRequest {
  const doa = DOA_MATRIX[params.stageNumber];
  const isMandatory = doa?.mandatoryReview ?? MANDATORY_STAGES.includes(params.stageNumber);
  const isConfidenceTriggered = params.confidence < CONFIDENCE_THRESHOLD;

  let reason = '';
  if (isMandatory) {
    reason = `Mandatory HITL gate — ${doa?.approverRole ?? params.approverRole} sign-off required per Delegation of Authority.`;
  }
  if (isConfidenceTriggered) {
    reason += ` Agent confidence ${(params.confidence * 100).toFixed(0)}% is below ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold — escalation triggered.`;
  }
  if (!reason) {
    reason = 'Standard HITL review checkpoint.';
  }

  const wfId = params.workflowId ?? generateWorkflowId();

  const request: ApprovalRequest = {
    id: generateApprovalId(),
    workflowId: wfId,
    stageNumber: params.stageNumber,
    stageSlug: params.stageSlug,
    stageTitle: params.stageTitle,
    agentId: params.agentId,
    agentName: params.agentName,
    approverRole: params.approverRole,
    reason: reason.trim(),
    confidence: params.confidence,
    isMandatory,
    isConfidenceTriggered,
    summary: params.summary,
    handoffDocument: params.handoffDocument,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  approvalQueue.push(request);

  if (!workflows[wfId]) {
    workflows[wfId] = {
      workflowId: wfId,
      currentStage: params.stageNumber,
      stageStatuses: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  workflows[wfId].stageStatuses[params.stageNumber] = {
    status: 'awaiting_approval',
    approvalId: request.id
  };
  workflows[wfId].currentStage = params.stageNumber;
  workflows[wfId].updatedAt = new Date().toISOString();

  return request;
}

export function approveRequest(
  approvalId: string,
  decidedBy: string,
  comment?: string,
  modifications?: string
): ApprovalRequest | null {
  const req = approvalQueue.find((r) => r.id === approvalId);
  if (!req || req.status !== 'pending') return null;

  req.status = modifications ? 'modified' : 'approved';
  req.decidedAt = new Date().toISOString();
  req.decidedBy = decidedBy;
  req.comment = comment;
  req.modifications = modifications;

  const wf = workflows[req.workflowId];
  if (wf) {
    wf.stageStatuses[req.stageNumber] = {
      status: 'approved',
      approvalId: req.id,
      completedAt: req.decidedAt
    };
    wf.updatedAt = new Date().toISOString();
  }

  return req;
}

export function rejectRequest(
  approvalId: string,
  decidedBy: string,
  reason: string
): ApprovalRequest | null {
  const req = approvalQueue.find((r) => r.id === approvalId);
  if (!req || req.status !== 'pending') return null;

  req.status = 'rejected';
  req.decidedAt = new Date().toISOString();
  req.decidedBy = decidedBy;
  req.comment = reason;

  const wf = workflows[req.workflowId];
  if (wf) {
    wf.stageStatuses[req.stageNumber] = {
      status: 'rejected',
      approvalId: req.id,
      completedAt: req.decidedAt
    };
    wf.updatedAt = new Date().toISOString();
  }

  return req;
}

export function getPendingApprovals(): ApprovalRequest[] {
  return approvalQueue.filter((r) => r.status === 'pending');
}

export function getAllApprovals(): ApprovalRequest[] {
  return [...approvalQueue].reverse();
}

export function getApprovalById(id: string): ApprovalRequest | null {
  return approvalQueue.find((r) => r.id === id) ?? null;
}

export function getApprovalsByStage(stageSlug: string): ApprovalRequest[] {
  return approvalQueue.filter((r) => r.stageSlug === stageSlug);
}

export function getWorkflowState(workflowId: string): WorkflowState | null {
  return workflows[workflowId] ?? null;
}

export function getAllWorkflows(): WorkflowState[] {
  return Object.values(workflows);
}

export function getDoAForStage(stageNumber: number) {
  return DOA_MATRIX[stageNumber] ?? null;
}

export function getConfidenceThreshold(): number {
  return CONFIDENCE_THRESHOLD;
}

export function shouldEscalate(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLD;
}

export function getApprovalStats() {
  const total = approvalQueue.length;
  const pending = approvalQueue.filter((r) => r.status === 'pending').length;
  const approved = approvalQueue.filter(
    (r) => r.status === 'approved' || r.status === 'modified'
  ).length;
  const rejected = approvalQueue.filter((r) => r.status === 'rejected').length;
  const escalated = approvalQueue.filter((r) => r.isConfidenceTriggered).length;

  return { total, pending, approved, rejected, escalated };
}
