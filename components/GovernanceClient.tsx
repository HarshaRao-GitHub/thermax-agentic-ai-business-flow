'use client';

import { governanceConfig } from '@/data/stages';
import AgentChat from './AgentChat';

export default function GovernanceClient() {
  return (
    <AgentChat
      stage={{
        slug: 'governance',
        title: governanceConfig.title,
        icon: '🛡️',
        tools: governanceConfig.tools,
        systemPrompt: governanceConfig.systemPrompt,
        starterPrompt: governanceConfig.starterPrompt,
        outputHint: 'Comprehensive governance report with gate SLA analysis, audit trail insights, override patterns, and escalation metrics.',
        agent: governanceConfig.agent,
        dataSources: governanceConfig.dataSources
      }}
      isGovernance
    />
  );
}
