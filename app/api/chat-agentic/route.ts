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

interface UpstreamResult {
  slug: string;
  stageNumber: number;
  agentOutput: string;
}

interface ChatRequest {
  slug: string;
  messages: IncomingMessage[];
  uploadedText?: string;
  uploadedTexts?: UploadedTextEntry[];
  customSystemPrompt?: string;
  userCustomPrompt?: string;
  upstreamResults?: UpstreamResult[];
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

  const stageNameMap: Record<string, string> = {
    marketing: 'Market Intelligence Agent (Stage 1)',
    sales: 'Lead Qualification Agent (Stage 2)',
    presales: 'Proposal Agent (Stage 3)',
    engineering: 'Engineering Review Agent (Stage 4)',
    'finance-legal': 'Commercial Risk Agent (Stage 5)',
    'hr-pmo': 'Project Planning Agent (Stage 6)',
    'site-operations': 'Project Execution & Monitoring Agent (Stage 7)',
    commissioning: 'Commissioning Agent (Stage 8)',
    'digital-service': 'O&M Service Intelligence Agent (Stage 9)',
  };

  let upstreamContextBlock = '';
  if (body.upstreamResults?.length) {
    const upstreamParts = body.upstreamResults.map(ur => {
      const agentLabel = stageNameMap[ur.slug] || `Stage ${ur.stageNumber}`;
      const trimmedOutput = ur.agentOutput.length > 4000
        ? ur.agentOutput.slice(0, 4000) + '\n\n[... output truncated for context window ...]'
        : ur.agentOutput;
      return `=== UPSTREAM RESULT FROM: ${agentLabel} ===\n\n${trimmedOutput}\n\n=== END UPSTREAM RESULT ===`;
    });

    upstreamContextBlock = `

--- UPSTREAM AGENT RESULTS (CRITICAL INPUT) ---
The following are the actual results/artifacts produced by the upstream agents in this workflow. These are your PRIMARY INPUT — your analysis MUST build upon and reference these results. Only the qualified/approved items from upstream should be processed further. Do not ignore these results.

${upstreamParts.join('\n\n')}

--- END UPSTREAM AGENT RESULTS ---`;
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

  const userCustomBlock = body.userCustomPrompt?.trim()
    ? `\n\n--- USER CUSTOM INSTRUCTIONS ---\nThe user has provided additional instructions for this analysis. Follow them alongside your core responsibilities:\n\n${body.userCustomPrompt.trim()}\n\n--- END USER CUSTOM INSTRUCTIONS ---`
    : '';

  const systemPrompt = [
    basePrompt,
    upstreamContextBlock,
    fileValidationBlock,
    getAgenticInstructions(body.slug),
    userCustomBlock,
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
    const isFollowUp = body.messages.length > 1;

    const readable = new ReadableStream({
      async start(controller) {
        const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const mockStart = Date.now();

        if (isFollowUp) {
          const userQuestion = body.messages[body.messages.length - 1]?.content ?? '';
          const previousContext = body.messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n');

          const toolDataParts: string[] = [];
          for (const t of slugTools) {
            const input = buildMockInput(t.name, body.slug);
            const result = executeToolLocally(t.name as ToolName, input);
            try {
              const parsed = JSON.parse(result);
              toolDataParts.push(`[${t.name}]: ${parsed.summary || JSON.stringify(parsed).slice(0, 500)}`);
            } catch {
              toolDataParts.push(`[${t.name}]: ${result.slice(0, 500)}`);
            }
          }
          const toolContext = toolDataParts.join('\n');

          const mockReply = buildMockFollowUpReply(body.slug, userQuestion, previousContext, toolContext, config.agent.name);
          const tokens = mockReply.split(/(\s+)/);
          for (let i = 0; i < tokens.length; i += 4) {
            const chunk = tokens.slice(i, i + 4).join('');
            controller.enqueue(sse('text_delta', chunk));
            await pause(6);
          }

          const elapsed = ((Date.now() - mockStart) / 1000).toFixed(1);
          const inputTokens = Math.round((systemPrompt.length + userQuestion.length) / 4);
          const outputTokens = Math.round(mockReply.length / 4);
          const cost = inputTokens * 15 / 1_000_000 + outputTokens * 75 / 1_000_000;
          controller.enqueue(sse('usage', {
            input_tokens: inputTokens, output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens, tool_calls: 0, api_turns: 1,
            model: 'enterprise-llm (mock)', response_time_s: parseFloat(elapsed),
            estimated_cost_usd: parseFloat(cost.toFixed(4))
          }));
        } else {
          const seq = slugTools.map((t) => ({
            tool: t.name,
            input: buildMockInput(t.name, body.slug)
          }));

          for (const step of seq) {
            controller.enqueue(sse('tool_start', { tool: step.tool, input: step.input }));
            await pause(800);
            const result = executeToolLocally(step.tool as ToolName, step.input);
            controller.enqueue(sse('tool_result', { tool: step.tool, result }));
            await pause(400);
          }

          let mockText = buildMockFinalOutput(body.slug);

          if (body.upstreamResults?.length) {
            const upstreamNote = body.upstreamResults.map(ur => {
              const label = stageNameMap[ur.slug] || `Stage ${ur.stageNumber}`;
              return `- **${label}**: Results received and incorporated`;
            }).join('\n');
            mockText += `\n\n---\n### Upstream Context Incorporated\nThis analysis builds upon the results from the following upstream agents:\n${upstreamNote}\n\nThe qualified items identified by upstream agents were used as the primary input for this stage's processing.`;
          }

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
            input_tokens: inputTokens, output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens, tool_calls: seq.length, api_turns: 1,
            model: 'enterprise-llm (mock)', response_time_s: parseFloat(elapsed),
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
    lookup_sop: { equipment_type: 'all' },
    diagnose_service_case: { case_id: 'all' },
    check_spare_parts: { equipment_type: 'all' },
    analyze_approval_gates: { stage_filter: 'all' },
    audit_agent_actions: { agent_id: 'all' },
    review_overrides: { agent_id: 'all' },
    manage_escalations: { threshold: 0.8 }
  };
  return defaults[toolName] ?? {};
}

function buildMockFinalOutput(slug: string): string {
  const outputs: Record<string, string> = {
    marketing: `## Market Intelligence Report\n\n### Signal Analysis Summary\n\nAnalyzed **70 market signals** across 12 industries over the last 90 days. Cross-referenced with **52 customers** in the master database.\n\n### TOP 5 IMMEDIATE LEADS\n\n| Rank | Company | Industry | Signal Source | Est. Deal Value (₹ Cr) | Urgency | Confidence | Rationale |\n|------|---------|----------|--------------|----------------------|---------|------------|----------|\n| 1 | Ambuja Cements | Cement | Capex Expansion | 18.5 | 5 | 0.94 | New kiln line — needs WHRB + FGD |\n| 2 | Tata Steel Kalinganagar | Steel | Emission Norms | 14.2 | 5 | 0.91 | BS-VI compliance deadline Q3 2026 |\n| 3 | Dr. Reddy's Hyderabad | Pharma | Reliability Issue | 12.8 | 4 | 0.88 | Boiler downtime costing ₹15L/day |\n| 4 | Hindalco Renukoot | Metals | Decarbonisation | 11.5 | 4 | 0.87 | Net-zero commitment by 2030 |\n| 5 | UltraTech Arakkonam | Cement | Energy Cost | 8.7 | 4 | 0.85 | Fuel cost up 22% YoY |\n\n**Combined value of top 5 leads: ₹65.7 Cr**\n\n### List of High-Probable Leads (Ranks 6-15)\n10 additional leads identified with confidence levels 0.75-0.84. Combined estimated value: ₹48 Cr.\n\n### Remaining Signals Summary\n55 remaining signals catalogued for future reference. Average confidence: 0.72.\n\n**IMPORTANT**: Only the TOP 5 LEADS above are forwarded to Lead Qualification (Stage 2). Remaining signals are for reference only.\n\n*Agent completed 3 tool calls, processed 70 signals, enriched with 52 customer records.*`,

    sales: `## Lead Qualification Report\n\n### Top 5 Leads from Stage 1 — Deep Qualification\n\nReceived **5 qualified leads** from Market Intelligence. Applied BANT and MEDDIC scoring frameworks.\n\n### Qualification Results\n| Lead | Company | BANT | MEDDIC | Decision | Rationale |\n|------|---------|------|--------|----------|-----------|\n| 1 | Ambuja Cements | 9 | 8 | **GO** | Budget confirmed, CEO sponsor, Q3 deadline |\n| 2 | Tata Steel Kalinganagar | 8 | 7 | **GO** | Regulatory mandate, strong champion |\n| 3 | Dr. Reddy's Hyderabad | 7 | 6 | **GO** | Urgent need, approval authority identified |\n| 4 | Hindalco Renukoot | 6 | 6 | **CONDITIONAL GO** | Timeline unclear, need to validate budget |\n| 5 | UltraTech Arakkonam | 5 | 5 | **NO-GO** | Budget not allocated, decision in next FY |\n\n### Stakeholder Analysis\n47 stakeholders mapped across the 5 leads. Champions: 8, Blockers: 3.\n\n### Pipeline Summary (Remaining)\nThe remaining 55 opportunities in the pipeline are summarized for context — not taken forward.\n\n**FORWARD TO STAGE 3**: 4 leads (3 GO + 1 CONDITIONAL GO)\n\n*Agent completed 3 tool calls, qualified 5 leads, mapped 47 stakeholders.*`,

    presales: `## Proposal Report\n\n### Proposals for Qualified Leads\n\nDrafted proposals for **4 qualified leads** forwarded from Lead Qualification (Stage 2).\n\n### Proposal Summary\n| Lead | Company | Scope | Proposal Value (₹ Cr) | Margin | Status |\n|------|---------|-------|----------------------|--------|--------|\n| 1 | Ambuja Cements | EPC — WHRB + FGD | 18.5 | 22.3% | Complete |\n| 2 | Tata Steel | Supply — Emission Control | 14.2 | 19.1% | Complete |\n| 3 | Dr. Reddy's | EPC — Boiler Replacement | 12.8 | 17.5% | Complete |\n| 4 | Hindalco | Supply — Heat Recovery | 11.5 | 14.2% | ⚠️ Below 15% |\n\n### BOM Summary\n**84 BOM line items** generated across 4 proposals, mapped to Thermax product catalog.\n\n### Flags\n- Hindalco proposal margin (14.2%) below 15% threshold — flagged for management review\n\n*Agent completed 3 tool calls, drafted 4 proposals, generated BOMs, analyzed margins.*`,

    engineering: `## Engineering Review Report\n\n### Validation of Qualified Lead Proposals\n\nCompleted engineering validations for **4 proposals** corresponding to qualified leads from the pipeline.\n\n### AI Verdicts\n| Proposal | Company | Validation | HAZOP | PG Status | Verdict |\n|----------|---------|-----------|-------|-----------|--------|\n| 1 | Ambuja Cements | Feasibility + HAZOP | Required | 8/8 within tolerance | **Approved** (0.92) |\n| 2 | Tata Steel | Design Review | Not Required | 6/6 within tolerance | **Approved** (0.89) |\n| 3 | Dr. Reddy's | Feasibility + HAZOP | Required | 7/8 within tolerance | **Conditional** (0.84) |\n| 4 | Hindalco | Design Review | Not Required | 5/6 within tolerance | **Conditional** (0.81) |\n\n### Performance Guarantees\n28 PG parameters simulated across 4 proposals. 26 within tolerance, 2 require attention.\n\n*Agent completed 3 tool calls, validated 4 proposals, simulated 28 PG parameters.*`,

    'finance-legal': `## Commercial & Legal Report\n\n### Risk Assessment for Qualified Pipeline\n\nAssessed **4 proposals** for qualified leads across all commercial risk dimensions.\n\n### Risk Distribution\n| Proposal | Company | Risk Rating | Margin | Cash Flow | LD Exposure | Decision |\n|----------|---------|-------------|--------|-----------|-------------|----------|\n| 1 | Ambuja Cements | Low | 22.3% | 8/10 | 2.1% | **Proceed** |\n| 2 | Tata Steel | Low | 19.1% | 7/10 | 3.5% | **Proceed** |\n| 3 | Dr. Reddy's | Medium | 17.5% | 6/10 | 4.2% | **Proceed with Conditions** |\n| 4 | Hindalco | High | 14.2% | 5/10 | 5.8% | **CFO Review Required** |\n\n### Contract Reviews\n4 contracts reviewed. Hindalco contract has 5 critical clauses requiring legal attention.\n\n*Agent completed 3 tool calls, assessed 4 proposals, reviewed 4 contracts.*`,

    'hr-pmo': `## Project Planning Report\n\n### Project Chartering for Qualified Deals\n\nChartered **3 projects** from approved qualified deals (Ambuja, Tata Steel, Dr. Reddy's). Hindalco pending CFO approval.\n\n### Resource Matching\n**28 resource assignments** across 3 projects. Average AI match score: **0.86**.\n- Below 0.7 threshold: 3 assignments flagged for HR review\n- Certification gaps identified: 2 (PMP for PM, IBR for welding lead)\n\n### Mobilisation Timeline\n| Project | Company | PM Assigned | Team Size | Mobilisation Date |\n|---------|---------|-------------|-----------|------------------|\n| 1 | Ambuja Cements | Rajesh Kumar | 12 | 15-May-2026 |\n| 2 | Tata Steel | Priya Sharma | 8 | 01-Jun-2026 |\n| 3 | Dr. Reddy's | Anil Verma | 10 | 15-Jun-2026 |\n\n*Agent completed 3 tool calls, charted 3 projects, matched 28 resources.*`,

    'site-operations': `## Execution & Monitoring Report\n\n### Progress Analysis for Active Qualified Projects\n\nAnalyzed latest progress reports for **3 active projects** from the qualified pipeline.\n\n### Schedule Health\n| Project | Company | Planned | Actual | Variance | Status |\n|---------|---------|---------|--------|----------|--------|\n| 1 | Ambuja Cements | 35% | 33% | -2% | 🟢 GREEN |\n| 2 | Tata Steel | 22% | 20% | -2% | 🟢 GREEN |\n| 3 | Dr. Reddy's | 15% | 12% | -3% | 🟡 AMBER |\n\n### Safety\n2 safety incidents tracked across active projects. Both Low severity. No stop-work required.\n\n### Quality\n3 NCRs dispositioned. All resolved with rework — no rejections.\n\n*Agent completed 3 tool calls, analyzed progress, safety, and quality for 3 active projects.*`,

    commissioning: `## Commissioning Report\n\n### Test Results for Qualified Pipeline Projects\n\nAnalyzed commissioning tests for projects progressing through the qualified pipeline.\n\n### Results Summary\n- Tests completed: 24\n- Pass: 19 (79%)\n- Conditional Pass: 4 (17%)\n- Fail: 1 (4%)\n\n### PG Verification\nPerformance guarantee tests cross-referenced with PG parameters from engineering validation.\n\n### Punchlist\n6 items requiring attention before PAC issuance.\n\n*Agent completed 3 tool calls, analyzed tests, verified PG compliance, generated punchlists.*`,

    'digital-service': `## O&M Service Intelligence Report\n\n### Service Cases Review\n**15 active service cases** analyzed across customer sites.\n- Critical: 3 cases (tube leaks, emergency shutdowns)\n- High: 6 cases (performance drops, vibration, emission issues)\n- In Progress: 3 cases requiring ongoing attention\n\n### Why-Why Root Cause Analysis\nStructured 5-Why analysis completed for resolved cases. Top root causes:\n- Coal quality non-compliance (3 cases)\n- Maintenance SOP gaps (2 cases)\n- Component wear beyond OEM intervals (2 cases)\n\n### SOP Guidance\n**12 SOPs** available across all equipment types. Most referenced: SOP-BLR-03 (Emergency Shutdown — Tube Leak), SOP-GEN-02 (Root Cause Analysis — Why-Why Method).\n\n### Spare Parts Intelligence\n**20 critical spare parts** tracked. 3 items below reorder level.\nTotal inventory value: ₹82.4 lakhs. Average lead time: 35 days.\n\n### Closed-Loop Intelligence\nRecurring issue patterns and spare parts demand feeding back to Stage 1 (Marketing) and procurement.\n\n*Agent completed 3 tool calls — SOP lookup, service case diagnosis, spare parts check.*`,

    governance: `## AgentGuard Governance Report\n\n### System Health Dashboard\n\n#### Approval Gates\n**70 approval gates** across 9 stages. SLA breach rate: **8.6%**.\n- Approved: 45 (64%)\n- Rejected: 12 (17%)\n- Deferred: 13 (19%)\n\n#### Agent Audit Trail\n**450 agent actions** logged. Average confidence: **0.871**.\nHuman intervention rate: **14.2%**.\n\n#### Human Overrides\n**60 overrides** recorded. Top overridden: Lead Qualification Agent (12), Commercial Risk Agent (10).\nLessons learned captured for model retraining.\n\n#### Confidence Escalations\n**55 escalations** processed. Average resolution: 142 minutes.\nThreshold effectiveness: 0.8 captures 92% of quality issues.\n\n### Recommendations\n1. Lead Qualification Agent needs retraining on MEDDIC scoring\n2. Approval gate SLA for contracts needs extension from 48h to 72h\n3. Commercial Risk Agent confidence improving — override rate down 15% MoM\n\n*Agent completed 4 tool calls, analyzed 70 gates, 450 audit entries, 60 overrides, 55 escalations.*`
  };
  return outputs[slug] ?? `## Analysis Complete\n\nThe ${slug} agent has completed its analysis across all data sources. Review the tool results above for detailed findings.`;
}

function buildMockFollowUpReply(slug: string, question: string, _previousContext: string, toolContext: string, agentName: string): string {
  const q = question.toLowerCase();

  const dataSnippets = toolContext.split('\n').filter(l => l.trim()).slice(0, 5);
  const contextSummary = dataSnippets.map(s => {
    const match = s.match(/\[(.+?)\]:\s*(.+)/);
    return match ? `- **${match[1]}**: ${match[2].slice(0, 200)}` : '';
  }).filter(Boolean).join('\n');

  if (q.includes('risk') || q.includes('critical') || q.includes('high')) {
    return `## Risk & Critical Items Analysis\n\nBased on the data I have access to, here are the critical and high-risk items relevant to your query:\n\n${contextSummary}\n\n### Key Risk Factors\n- Items flagged as **Critical** or **High** severity require immediate attention\n- Any items breaching SLA thresholds have been escalated per governance rules\n- Low-confidence outputs (below 0.8) have been automatically routed for human review\n\n### Recommended Actions\n1. Prioritize critical items for immediate resolution\n2. Assign senior resources to high-severity cases\n3. Schedule review meeting with relevant stakeholders within 48 hours\n\n*${agentName} — follow-up analysis based on your question.*`;
  }

  if (q.includes('summary') || q.includes('summarize') || q.includes('overview')) {
    return `## Summary Overview\n\nHere is a concise summary based on the data I have analyzed:\n\n${contextSummary}\n\n### Key Takeaways\n- All data sources have been cross-referenced and validated\n- Actionable insights have been extracted and prioritized\n- Items requiring human approval have been flagged per AgentGuard governance\n\n*${agentName} — summary generated from available data backbone.*`;
  }

  if (q.includes('recommend') || q.includes('suggest') || q.includes('what should') || q.includes('next step')) {
    return `## Recommendations\n\nBased on my analysis of the available data, here are my recommendations:\n\n### Immediate Actions\n1. Address any critical or high-priority items first\n2. Ensure all pending approvals are processed within SLA\n3. Review flagged items with the relevant domain experts\n\n### Medium-Term Actions\n1. Update processes based on patterns identified in the data\n2. Close any open items from previous cycles\n3. Schedule periodic review cadence\n\n### Data Context\n${contextSummary}\n\n*${agentName} — recommendations based on data analysis. [AI INFERENCE] These are suggested actions and should be validated by the relevant human approvers.*`;
  }

  if (q.includes('data') || q.includes('how many') || q.includes('count') || q.includes('total') || q.includes('number')) {
    return `## Data Analysis\n\nHere is the quantitative breakdown from my data sources:\n\n${contextSummary}\n\n### Notes\n- All figures are from the current data backbone\n- Data is refreshed with each analysis cycle\n- For the most current figures, run the full agent analysis\n\n*${agentName} — data query response.*`;
  }

  if (q.includes('explain') || q.includes('why') || q.includes('how') || q.includes('what is') || q.includes('what does')) {
    return `## Explanation\n\nGreat question. Let me explain based on my domain knowledge and the data I have access to.\n\n### Context\nAs the **${agentName}**, I operate within a specific domain of Thermax's enterprise workflow. My analysis is based on structured data sources that are part of the data backbone.\n\n### Available Data\n${contextSummary}\n\n### How This Works\n- I use specialized tools to analyze data across multiple dimensions\n- Each analysis includes confidence scoring — outputs below 0.8 confidence are escalated\n- All actions are logged in the agent audit trail for governance compliance\n- Human-in-the-loop approval gates ensure accountability at every critical decision point\n\nIf you need more specific details, please refine your question and I'll provide a focused analysis.\n\n*${agentName} — explanatory response.*`;
  }

  return `## Follow-Up Analysis\n\nThank you for your question. Based on my analysis and the data available to me as the **${agentName}**, here is my response:\n\n### Your Question\n> ${question}\n\n### Analysis\n${contextSummary}\n\n### Response\nBased on the data patterns I've analyzed, the key points relevant to your question are:\n\n1. The data shows consistent patterns across the analyzed records\n2. Items flagged for attention have been highlighted with appropriate severity levels\n3. All findings are backed by data from the data backbone and tool analysis\n\n### Additional Context\n- Confidence level for this response: **0.85** (above threshold)\n- All source data is from the current analysis cycle\n- For deeper analysis, you can run the full agent workflow or ask more specific questions\n\n*${agentName} — follow-up response. [AI INFERENCE] This analysis is based on available data. Verify critical decisions with domain experts.*`;
}
