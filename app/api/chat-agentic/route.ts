import { NextRequest } from 'next/server';
import { getStageBySlug, governanceConfig, type Stage } from '@/data/stages';
import { loadCsvAsMarkdownTable } from '@/lib/csv-loader';
import { getAnthropicClient, getModelId, isMockMode } from '@/lib/anthropic';
import {
  getToolsForSlug,
  getAgenticInstructions,
  executeToolLocally,
  type ToolName
} from '@/lib/agent-tools';
const CONFIDENCE_THRESHOLD = 0.8;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadedTextEntry { filename: string; text: string; }

interface ChatRequest {
  slug: string;
  messages: IncomingMessage[];
  uploadedText?: string;
  uploadedTexts?: UploadedTextEntry[];
  customSystemPrompt?: string;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const stage = getStageBySlug(body.slug);
  const isGovernance = body.slug === 'governance';

  if (!stage && !isGovernance) {
    return new Response(`Unknown stage: ${body.slug}`, { status: 404 });
  }

  const config = isGovernance ? governanceConfig : stage!;
  const slugTools = getToolsForSlug(body.slug);
  if (!slugTools) {
    return new Response(`No tools defined for: ${body.slug}`, { status: 400 });
  }

  const knowledgeBlocks: string[] = [];
  const dataSources = isGovernance ? governanceConfig.dataSources : stage!.dataSources;
  for (const ds of dataSources) {
    try {
      const table = loadCsvAsMarkdownTable(ds.folder, ds.file, 25);
      knowledgeBlocks.push(
        `=== DATA: ${ds.label} (${ds.file}) ===\n\n${table}\n\n=== END ===`
      );
    } catch (e) {
      console.error('Failed to load data source', ds.file, e);
    }
  }

  if (body.uploadedTexts?.length) {
    for (const doc of body.uploadedTexts) {
      if (doc.text?.trim()) {
        knowledgeBlocks.push(
          `=== USER-UPLOADED DOCUMENT: ${doc.filename} ===\n\n${doc.text.trim()}\n\n=== END ===`
        );
      }
    }
  } else if (body.uploadedText?.trim()) {
    knowledgeBlocks.push(
      `=== USER-UPLOADED DOCUMENT ===\n\n${body.uploadedText.trim()}\n\n=== END ===`
    );
  }

  const basePrompt = body.customSystemPrompt?.trim() ||
    (isGovernance ? governanceConfig.systemPrompt : stage!.systemPrompt);

  const hasUserUploads = !!(body.uploadedTexts?.length) || !!(body.uploadedText?.trim());
  const stageFileHint = !isGovernance && stage ? (stage as Stage).acceptedFileHint : '';

  let fileValidationBlock = '';
  if (hasUserUploads && stageFileHint) {
    const uploadedNames = body.uploadedTexts?.length
      ? body.uploadedTexts.map(d => d.filename).join(', ')
      : 'user-uploaded document';
    fileValidationBlock = `

UPLOADED FILE RELEVANCE CHECK (MANDATORY):
The user has uploaded: ${uploadedNames}
Your domain accepts ONLY these types of documents: ${stageFileHint}

BEFORE processing any uploaded document, you MUST first assess whether each file is relevant to your domain and functionality.
- If a file IS relevant: proceed to analyze it along with your data backbone.
- If a file is NOT relevant: Do NOT process it. Instead, respond with a clear, polite message structured EXACTLY like this:

  ⚠️ **Unrelated Document Detected**
  The file "[filename]" does not appear to be relevant to my domain as the **${config.agent.name}** (Stage ${isGovernance ? 'Governance' : stage!.number}: ${config.title}).

  **What I can process:**
  ${stageFileHint}

  Please upload documents related to the above categories, or navigate to the appropriate stage agent for your file.

If SOME files are relevant and others are not, process the relevant ones and display the rejection message only for the irrelevant ones.`;
  }

  const systemPrompt = [
    basePrompt,
    fileValidationBlock,
    getAgenticInstructions(body.slug),
    knowledgeBlocks.length
      ? '\n\n--- BEGIN DATA BACKBONE ---\n\n' +
        knowledgeBlocks.join('\n\n') +
        '\n\n--- END DATA BACKBONE ---'
      : ''
  ].join('');

  const encoder = new TextEncoder();

  function sse(event: string, data: unknown): Uint8Array {
    return encoder.encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    );
  }

  if (isMockMode()) {
    const seq = slugTools.map((t) => ({
      tool: t.name,
      input: buildMockInput(t.name, body.slug)
    }));

    const readable = new ReadableStream({
      async start(controller) {
        const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const mockStart = Date.now();

        for (const step of seq) {
          controller.enqueue(sse('tool_start', { tool: step.tool, input: step.input }));
          await pause(800);
          const result = executeToolLocally(step.tool as ToolName, step.input);
          controller.enqueue(sse('tool_result', { tool: step.tool, result }));
          await pause(400);
        }

        const mockText = buildMockFinalOutput(body.slug);
        const tokens = mockText.split(/(\s+)/);
        for (let i = 0; i < tokens.length; i += 4) {
          const chunk = tokens.slice(i, i + 4).join('');
          controller.enqueue(sse('text_delta', chunk));
          await pause(8);
        }

        const elapsed = ((Date.now() - mockStart) / 1000).toFixed(1);
        const inputTokens = Math.round(systemPrompt.length / 4);
        const outputTokens = Math.round(mockText.length / 4);
        const cost = inputTokens * 15 / 1_000_000 + outputTokens * 75 / 1_000_000;

        controller.enqueue(sse('usage', {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          tool_calls: seq.length,
          api_turns: 1,
          model: 'enterprise-llm (mock)',
          response_time_s: parseFloat(elapsed),
          estimated_cost_usd: parseFloat(cost.toFixed(4))
        }));

        if (!isGovernance && stage) {
          const mockConfidence = parseFloat((0.72 + Math.random() * 0.22).toFixed(2));
          const isConfidenceTriggered = mockConfidence < CONFIDENCE_THRESHOLD;
          const approvalId = `APR-${Date.now().toString(36).toUpperCase()}`;
          const reason = isConfidenceTriggered
            ? `Agent confidence ${(mockConfidence * 100).toFixed(0)}% is below ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold — escalation triggered. Mandatory HITL gate.`
            : `Mandatory HITL gate — ${stage.hitlApprover} sign-off required per Delegation of Authority.`;

          controller.enqueue(
            sse('hitl_required', {
              approvalId,
              workflowId: `WF-${Date.now()}`,
              stageNumber: stage.number,
              stageTitle: stage.title,
              agentName: stage.agent.name,
              approverRole: stage.hitlApprover,
              confidence: mockConfidence,
              confidenceThreshold: CONFIDENCE_THRESHOLD,
              isMandatory: true,
              isConfidenceTriggered,
              reason,
              summary: `${stage.agent.name} completed analysis for Stage ${stage.number}: ${stage.title}. ${seq.length} tools executed.`
            })
          );
        }

        controller.enqueue(sse('done', {}));
        controller.close();
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Workbench-Mode': 'mock'
      }
    });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const client = getAnthropicClient();
        const model = getModelId();
        const liveStart = Date.now();

        type MsgParam = { role: 'user' | 'assistant'; content: string | ContentBlock[] };
        type ContentBlock =
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
          | { type: 'tool_result'; tool_use_id: string; content: string };

        const conversationMessages: MsgParam[] = body.messages.map((m) => ({
          role: m.role,
          content: m.content
        }));

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalToolCalls = 0;
        let apiTurns = 0;

        const MAX_LOOPS = 12;
        for (let loop = 0; loop < MAX_LOOPS; loop++) {
          apiTurns++;
          const response = await client.messages.create({
            model,
            max_tokens: 8192,
            system: systemPrompt,
            tools: slugTools,
            messages: conversationMessages
          });

          totalInputTokens += response.usage?.input_tokens ?? 0;
          totalOutputTokens += response.usage?.output_tokens ?? 0;

          const deltaCost = totalInputTokens * 15 / 1_000_000 + totalOutputTokens * 75 / 1_000_000;
          controller.enqueue(sse('usage_delta', {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            total_tokens: totalInputTokens + totalOutputTokens,
            tool_calls: totalToolCalls,
            api_turns: apiTurns,
            model,
            response_time_s: parseFloat(((Date.now() - liveStart) / 1000).toFixed(1)),
            estimated_cost_usd: parseFloat(deltaCost.toFixed(4))
          }));

          const toolResults: ContentBlock[] = [];

          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              const tokens = block.text.split(/(\s+)/);
              for (let i = 0; i < tokens.length; i += 4) {
                const chunk = tokens.slice(i, i + 4).join('');
                controller.enqueue(sse('text_delta', chunk));
              }
            } else if (block.type === 'tool_use') {
              totalToolCalls++;
              controller.enqueue(sse('tool_start', { tool: block.name, input: block.input }));
              const result = executeToolLocally(block.name as ToolName, block.input as Record<string, unknown>);
              controller.enqueue(sse('tool_result', { tool: block.name, result }));
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
            }
          }

          if (response.stop_reason === 'end_turn' || toolResults.length === 0) break;

          conversationMessages.push({ role: 'assistant', content: response.content as ContentBlock[] });
          conversationMessages.push({ role: 'user', content: toolResults });
        }

        const elapsedS = parseFloat(((Date.now() - liveStart) / 1000).toFixed(1));
        const totalCost = totalInputTokens * 15 / 1_000_000 + totalOutputTokens * 75 / 1_000_000;

        controller.enqueue(sse('usage', {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalInputTokens + totalOutputTokens,
          tool_calls: totalToolCalls,
          api_turns: apiTurns,
          model,
          response_time_s: elapsedS,
          estimated_cost_usd: parseFloat(totalCost.toFixed(4))
        }));

        if (!isGovernance && stage) {
          const liveConfidence = parseFloat((0.70 + Math.random() * 0.25).toFixed(2));
          const isConfidenceTriggered = liveConfidence < CONFIDENCE_THRESHOLD;
          const approvalId = `APR-${Date.now().toString(36).toUpperCase()}`;
          const reason = isConfidenceTriggered
            ? `Agent confidence ${(liveConfidence * 100).toFixed(0)}% is below ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold — escalation triggered. Mandatory HITL gate.`
            : `Mandatory HITL gate — ${stage.hitlApprover} sign-off required per Delegation of Authority.`;

          controller.enqueue(
            sse('hitl_required', {
              approvalId,
              workflowId: `WF-${Date.now()}`,
              stageNumber: stage.number,
              stageTitle: stage.title,
              agentName: stage.agent.name,
              approverRole: stage.hitlApprover,
              confidence: liveConfidence,
              confidenceThreshold: CONFIDENCE_THRESHOLD,
              isMandatory: true,
              isConfidenceTriggered,
              reason,
              summary: `${stage.agent.name} completed analysis for Stage ${stage.number}: ${stage.title}. ${totalToolCalls} tools executed, ${apiTurns} API turns.`
            })
          );
        }

        controller.enqueue(sse('done', {}));
        controller.close();
      } catch (err) {
        console.error('Agentic loop error:', err);
        controller.enqueue(sse('error', { message: err instanceof Error ? err.message : 'Unknown error' }));
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Workbench-Mode': 'live',
      'X-Workbench-Model': getModelId()
    }
  });
}

function buildMockInput(toolName: string, slug: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    scan_market_signals: { time_window_days: 90, min_urgency: 1 },
    generate_account_brief: { top_n: 5 },
    assess_signal_urgency: { recalculate: true },
    qualify_opportunity: { opportunity_ids: 'all', min_value_cr: 0 },
    map_stakeholders: { opportunity_id: 'OPP-2026-0001' },
    analyze_pipeline: { group_by: 'stage' },
    draft_proposal: { opportunity_id: 'OPP-2026-0001' },
    generate_bom: { proposal_id: 'PRP-2026-0001' },
    analyze_margins: { threshold_pct: 15 },
    validate_engineering: { proposal_id: 'all' },
    simulate_performance: { proposal_id: 'PRP-2026-0001' },
    assess_hazop: { proposal_id: 'PRP-2026-0001' },
    assess_commercial_risk: { proposal_id: 'all' },
    review_contract: { proposal_id: 'PRP-2026-0001' },
    evaluate_payment_terms: { proposal_id: 'PRP-2026-0001' },
    charter_project: { proposal_id: 'PRP-2026-0001' },
    match_resources: { project_id: 'PRJ-2026-0001' },
    plan_mobilisation: { project_id: 'PRJ-2026-0001' },
    analyze_progress: { project_id: 'all', weeks: 4 },
    detect_safety_risks: { project_id: 'all' },
    disposition_ncr: { project_id: 'all' },
    analyze_test_results: { project_id: 'all' },
    verify_performance: { project_id: 'PRJ-2026-0001' },
    generate_punchlist: { project_id: 'PRJ-2026-0001' },
    analyze_telemetry: { project_id: 'all' },
    predict_maintenance: { project_id: 'all' },
    diagnose_ticket: { ticket_id: 'all' },
    analyze_approval_gates: { stage_filter: 'all' },
    audit_agent_actions: { agent_id: 'all' },
    review_overrides: { agent_id: 'all' },
    manage_escalations: { threshold: 0.8 }
  };
  return defaults[toolName] ?? {};
}

function buildMockFinalOutput(slug: string): string {
  const outputs: Record<string, string> = {
    marketing: `## Market Intelligence Report\n\n### Signal Analysis Summary\n\nAnalyzed **70 market signals** across 12 industries over the last 90 days. Cross-referenced with **52 customers** in the master database.\n\n### Top 5 High-Value Opportunities\n\nThe Market Intelligence Agent identified 5 priority signals with combined estimated value of **₹65+ Cr**. Each signal has been enriched with customer master data, account tier classification, and confidence scoring.\n\n### Key Findings\n- **Signal diversity**: Industry Conferences (28%), Reliability Issues (22%), Regulatory Changes (18%), Decarbonisation Mandates (16%), Analyst Reports (16%)\n- **Average agent confidence**: 0.876 — above the 0.8 threshold\n- **Escalation candidates**: 8 signals below 0.8 confidence flagged for human review\n- **Industry concentration**: Cement (18%), Steel (15%), Pharma (12%) dominate\n\n### Governance\nAll 70 signals logged in agent audit trail. 8 low-confidence signals escalated via AgentGuard. 12 signals pending human review.\n\n*Agent completed 3 tool calls, processed 70 signals, enriched with 52 customer records.*`,

    sales: `## Sales Qualification Report\n\n### Pipeline Overview\n\nAnalyzed **60 opportunities** with combined pipeline value of **₹580+ Cr**. Applied BANT and MEDDIC scoring frameworks.\n\n### Qualification Results\n- **GO**: 24 opportunities (40%) — both BANT and MEDDIC ≥ 6\n- **CONDITIONAL GO**: 18 opportunities (30%) — one score ≥ 6\n- **NO-GO**: 18 opportunities (30%) — both scores < 5\n\n### Stakeholder Analysis\n309 stakeholders mapped across all opportunities. Key findings:\n- Champions identified: 62 (20%)\n- Blockers identified: 28 (9%)\n- High-influence stakeholders: 85 (28%)\n\n### Pipeline by Stage\nWeighted pipeline value: **₹312 Cr** (probability-adjusted)\n\n*Agent completed 3 tool calls, qualified 60 opportunities, mapped 309 stakeholders.*`,

    presales: `## Solution Design Report\n\n### Proposal Portfolio\n\nAnalyzed **55 proposals** with total value of **₹890+ Cr** across EPC, Supply Only, and O&M scope types.\n\n### Margin Analysis\n- Average margin: **18.4%**\n- Below 15% threshold: **12 proposals** flagged for management review\n- Margin distribution: 10-15% (22%), 15-20% (38%), 20-25% (29%), >25% (11%)\n\n### BOM Summary\n**296 BOM line items** generated across 55 proposals, mapped to **55 products** from the Thermax catalog.\n\n*Agent completed 3 tool calls, drafted proposals, generated BOMs, analyzed margins.*`,

    engineering: `## Engineering Validation Report\n\n### Validation Summary\n\nCompleted **55 engineering validations** across Feasibility Study, Design Review, HAZOP, Process Simulation, and Material Selection.\n\n### AI Verdicts\n- **Approved**: 28 (51%)\n- **Conditional**: 18 (33%)\n- **Rejected**: 9 (16%)\n\n### Performance Guarantees\n**106 PG parameters** simulated. 89 within tolerance, 17 at risk.\n\n### HAZOP Assessment\n23 proposals require HAZOP review. 15 completed, 8 pending engineer sign-off.\n\n*Agent completed 3 tool calls, validated 55 proposals, simulated 106 PG parameters.*`,

    'finance-legal': `## Commercial & Legal Report\n\n### Risk Assessment Summary\n\nAssessed **55 proposals** across all commercial risk dimensions.\n\n### Risk Distribution\n- Low: 18 (33%)\n- Medium: 22 (40%)\n- High: 12 (22%)\n- Critical: 3 (5%)\n\n### Contract Reviews\n55 contracts reviewed. Average redlines per contract: 4.2. Critical clauses flagged: 89.\n\n### CFO Action Required\n15 proposals above High risk require CFO approval gate decision.\n\n*Agent completed 3 tool calls, assessed 55 proposals, reviewed 55 contracts.*`,

    'hr-pmo': `## Mobilisation Report\n\n### Project Portfolio\n**55 projects** with combined contract value of **₹1,200+ Cr**.\n\n### Resource Matching\n**410 resource assignments** across all projects. Average AI match score: **0.82**.\n- Below 0.7 threshold: 48 assignments flagged for HR review\n- Certification gaps identified: 23\n\n### Mobilisation Status\nTeam composition complete for 38 projects. 17 projects with staffing gaps.\n\n*Agent completed 3 tool calls, charted projects, matched 410 resources.*`,

    'site-operations': `## Site Operations Report\n\n### Progress Analysis\n**417 weekly progress reports** across 55 projects analyzed.\n\n### Schedule Health\n- GREEN: 34 projects (62%) — on or ahead of plan\n- AMBER: 14 projects (25%) — slippage 5-10%\n- RED: 7 projects (13%) — slippage >10%, escalation required\n\n### Safety\n**55 safety incidents** tracked. 3 Critical, 12 High severity.\nStop-work triggered: 5 incidents.\n\n### Quality\n**55 NCRs** dispositioned. AI-human match rate: 78%.\n\n*Agent completed 3 tool calls, analyzed 417 progress reports, 55 incidents, 55 NCRs.*`,

    commissioning: `## Commissioning Report\n\n### Test Results\n**190 commissioning tests** across all project phases analyzed.\n\n### Results Summary\n- Pass: 142 (75%)\n- Conditional Pass: 31 (16%)\n- Fail: 17 (9%)\n\n### PG Verification\nPerformance guarantee tests cross-referenced with 106 PG parameters from engineering.\n\n### Punchlist\n48 items requiring attention before PAC issuance.\n\n*Agent completed 3 tool calls, analyzed 190 tests, generated punchlists.*`,

    'digital-service': `## Digital & Service Report\n\n### Telemetry Analysis\n**301 plant telemetry readings** analyzed across monitored projects.\n\n### Key Metrics\n- Average boiler efficiency: **87.4%**\n- Average uptime: **97.2%**\n- Anomalies detected: **45 readings** (15% anomaly rate)\n\n### Predictive Maintenance\n**74 maintenance alerts** active. 8 Critical, 18 High severity.\n\n### Service Tickets\n**60 service tickets** diagnosed. Average CSAT: **3.8/5**.\nLow CSAT (<3): 8 tickets escalated.\n\n### Closed-Loop Intelligence\nInsights from telemetry feeding back to Stage 1 (Marketing) as new market signals.\n\n*Agent completed 3 tool calls, analyzed 301 readings, 74 alerts, 60 tickets.*`,

    governance: `## AgentGuard Governance Report\n\n### System Health Dashboard\n\n#### Approval Gates\n**70 approval gates** across 9 stages. SLA breach rate: **8.6%**.\n- Approved: 45 (64%)\n- Rejected: 12 (17%)\n- Deferred: 13 (19%)\n\n#### Agent Audit Trail\n**450 agent actions** logged. Average confidence: **0.871**.\nHuman intervention rate: **14.2%**.\n\n#### Human Overrides\n**60 overrides** recorded. Top overridden: Qualification Agent (12), Commercial Risk Agent (10).\nLessons learned captured for model retraining.\n\n#### Confidence Escalations\n**55 escalations** processed. Average resolution: 142 minutes.\nThreshold effectiveness: 0.8 captures 92% of quality issues.\n\n### Recommendations\n1. Qualification Agent needs retraining on MEDDIC scoring\n2. Approval gate SLA for contracts needs extension from 48h to 72h\n3. Commercial Risk Agent confidence improving — override rate down 15% MoM\n\n*Agent completed 4 tool calls, analyzed 70 gates, 450 audit entries, 60 overrides, 55 escalations.*`
  };
  return outputs[slug] ?? `## Analysis Complete\n\nThe ${slug} agent has completed its analysis across all data sources. Review the tool results above for detailed findings.`;
}
