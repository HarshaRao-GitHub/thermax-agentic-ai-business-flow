'use client';

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  computeGateStatuses,
  getFlowSummary,
  resetFlow as resetClientFlow,
  skipStage as skipClientStage,
  isStageMandatory as isClientStageMandatory,
} from '@/lib/client-store';
import type { GateStatus } from '@/lib/client-store';

export type { GateStatus };

interface StageSummary {
  slug: string;
  stageNumber: number;
  gateStatus: GateStatus;
  mandatory: boolean;
  hasResult: boolean;
  completedAt: string | null;
}

interface FlowState {
  flowId: string | null;
  createdAt: string | null;
  stages: StageSummary[];
}

interface WorkflowContextValue {
  flow: FlowState | null;
  loading: boolean;
  refresh: () => void;
  resetFlow: () => void;
  skipStage: (slug: string) => void;
  getGateStatus: (slug: string) => GateStatus;
  isStageMandatory: (slug: string) => boolean;
  isStageAccessible: (slug: string) => boolean;
}

const WorkflowContext = createContext<WorkflowContextValue>({
  flow: null,
  loading: true,
  refresh: () => {},
  resetFlow: () => {},
  skipStage: () => {},
  getGateStatus: () => 'locked',
  isStageMandatory: () => true,
  isStageAccessible: () => false,
});

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    computeGateStatuses();
    const summary = getFlowSummary();
    setFlow(summary);
  }, []);

  const doReset = useCallback(() => {
    resetClientFlow();
    refresh();
  }, [refresh]);

  const doSkip = useCallback((slug: string) => {
    skipClientStage(slug);
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  const getGateStatus = useCallback((slug: string): GateStatus => {
    if (!flow) return 'locked';
    const stage = flow.stages.find(s => s.slug === slug);
    return stage?.gateStatus ?? 'locked';
  }, [flow]);

  const isMandatory = useCallback((slug: string): boolean => {
    return isClientStageMandatory(slug);
  }, []);

  const isStageAccessible = useCallback((slug: string): boolean => {
    const status = getGateStatus(slug);
    return status !== 'locked';
  }, [getGateStatus]);

  return (
    <WorkflowContext.Provider
      value={{
        flow,
        loading,
        refresh,
        resetFlow: doReset,
        skipStage: doSkip,
        getGateStatus,
        isStageMandatory: isMandatory,
        isStageAccessible,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  return useContext(WorkflowContext);
}
