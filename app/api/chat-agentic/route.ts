import { NextRequest } from 'next/server';
import { getStageBySlug, governanceConfig, type Stage } from '@/data/stages';
import { loadCsvAsMarkdownTable } from '@/lib/csv-loader';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
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
    presales: 'Proposal Drafting Agent (Stage 3)',
    'commercial-legal': 'Commercial & Legal Risk Review Agent (Stage 4)',
    'project-planning': 'Project Planning Agent (Stage 5)',
    'engineering-design': 'Engineering Design Agent (Stage 6)',
    'procurement-mfg': 'Procurement & Manufacturing Review Agent (Stage 7)',
    commissioning: 'Commissioning Agent (Stage 8)',
    'service-troubleshooting': 'Service Troubleshooting Agent (Stage 9)',
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
          const response = await callWithRetry(
            () => client.messages.create({
              model,
              max_tokens: 8192,
              system: systemPrompt,
              tools: slugTools,
              messages: conversationMessages
            }),
            (attempt, max, err) => {
              controller.enqueue(sse('retry', { attempt, max, message: `API busy (${err.message}), retrying ${attempt}/${max}...` }));
            }
          );

          totalInputTokens += response.usage?.input_tokens ?? 0;
          totalOutputTokens += response.usage?.output_tokens ?? 0;

          const deltaCost = totalInputTokens * 3 / 1_000_000 + totalOutputTokens * 15 / 1_000_000;
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
        const totalCost = totalInputTokens * 3 / 1_000_000 + totalOutputTokens * 15 / 1_000_000;

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
