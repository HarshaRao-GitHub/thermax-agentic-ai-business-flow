import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
import { getOperationById, getDepartmentById } from '@/data/doc-intelligence-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadedDoc {
  filename: string;
  text: string;
}

interface DocIntelRequest {
  operation: string;
  department?: string;
  messages: ChatMessage[];
  uploadedTexts: UploadedDoc[];
  options?: {
    outputFormat?: 'table' | 'json' | 'bullets' | 'narrative';
    summaryType?: 'executive' | 'section' | 'action-items' | 'risk';
    comparisonMode?: 'delta' | 'missing' | 'risk-impact';
  };
}

function buildSystemPrompt(req: DocIntelRequest): string {
  const operation = getOperationById(req.operation);
  if (!operation) {
    return 'You are a Thermax Document Intelligence Agent. Analyze the uploaded documents and provide structured, actionable insights.';
  }

  const parts: string[] = [operation.systemPromptTemplate];

  if (req.department) {
    const dept = getDepartmentById(req.department);
    if (dept) {
      parts.push(
        '',
        `## Department Context: ${dept.label}`,
        `You are operating in the context of the ${dept.label} department.`,
        `Typical documents in this department: ${dept.typicalDocs}`,
        `Tailor your analysis, terminology, and recommendations to this department's needs.`
      );
    }
  }

  if (req.options?.outputFormat) {
    const fmtInstructions: Record<string, string> = {
      table: 'Present your output primarily in Markdown tables with clear headers and aligned columns.',
      json: 'Structure your output as formatted JSON objects where applicable, with clear keys and values.',
      bullets: 'Use concise bullet points organized in hierarchical lists for your output.',
      narrative: 'Write your output as a flowing narrative with clear section headings and paragraphs.',
    };
    parts.push('', `## Output Format Preference`, fmtInstructions[req.options.outputFormat] || '');
  }

  if (req.options?.summaryType && req.operation === 'summarize') {
    parts.push('', `## Summary Type Requested: ${req.options.summaryType}`, `Focus your summarization on producing a "${req.options.summaryType}" style summary.`);
  }

  if (req.options?.comparisonMode && req.operation === 'compare') {
    const modeInstructions: Record<string, string> = {
      delta: 'Focus on identifying all changes/differences between the documents.',
      missing: 'Focus on identifying what is present in one document but missing from the other.',
      'risk-impact': 'Focus on assessing the risk impact of differences between documents.',
    };
    parts.push('', `## Comparison Mode: ${req.options.comparisonMode}`, modeInstructions[req.options.comparisonMode] || '');
  }

  if (req.operation !== 'visualize') {
    parts.push(
      '',
      '## Visualization Capability',
      'If the user asks you to create charts, graphs, or visualizations from the data, you can output Mermaid diagram code blocks.',
      'Use ```mermaid fenced code blocks with pie, xychart-beta, flowchart, or gantt syntax.',
      'Always include a data table alongside any chart for reference.',
    );
  }

  if (req.uploadedTexts?.length) {
    const docBlocks = req.uploadedTexts
      .filter(d => d.text?.trim())
      .map(d => `=== DOCUMENT: ${d.filename} ===\n\n${d.text.trim()}\n\n=== END ===`);
    if (docBlocks.length) {
      parts.push(
        '',
        '--- BEGIN UPLOADED DOCUMENTS ---',
        '',
        docBlocks.join('\n\n'),
        '',
        '--- END UPLOADED DOCUMENTS ---'
      );
    }
  }

  return parts.join('\n');
}

export async function POST(req: NextRequest) {
  let body: DocIntelRequest;
  try {
    body = (await req.json()) as DocIntelRequest;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!body.operation) {
    return new Response('Missing operation', { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(body);

  const encoder = new TextEncoder();
  function sse(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const client = getAnthropicClient();
        const model = getModelId();
        const liveStart = Date.now();

        type MsgParam = { role: 'user' | 'assistant'; content: string };
        const conversationMessages: MsgParam[] = body.messages.map(m => ({
          role: m.role,
          content: m.content,
        }));

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let apiTurns = 0;

        const MAX_LOOPS = 5;
        for (let loop = 0; loop < MAX_LOOPS; loop++) {
          apiTurns++;
          const response = await callWithRetry(
            () => client.messages.create({
              model,
              max_tokens: 8192,
              system: systemPrompt,
              messages: conversationMessages,
            }),
            (attempt, max, err) => {
              controller.enqueue(sse('retry', { attempt, max, message: `API busy (${err.message}), retrying ${attempt}/${max}...` }));
            }
          );

          totalInputTokens += response.usage?.input_tokens ?? 0;
          totalOutputTokens += response.usage?.output_tokens ?? 0;

          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              const tokens = block.text.split(/(\s+)/);
              for (let i = 0; i < tokens.length; i += 4) {
                controller.enqueue(sse('text_delta', tokens.slice(i, i + 4).join('')));
              }
            }
          }

          if (response.stop_reason === 'end_turn') break;
        }

        const elapsedS = parseFloat(((Date.now() - liveStart) / 1000).toFixed(1));
        const totalCost = totalInputTokens * 3 / 1_000_000 + totalOutputTokens * 15 / 1_000_000;

        controller.enqueue(sse('usage', {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalInputTokens + totalOutputTokens,
          tool_calls: 0,
          api_turns: apiTurns,
          model,
          response_time_s: elapsedS,
          estimated_cost_usd: parseFloat(totalCost.toFixed(4)),
        }));

        controller.enqueue(sse('done', {}));
        controller.close();
      } catch (err) {
        console.error('Doc intelligence error:', err);
        controller.enqueue(sse('error', { message: err instanceof Error ? err.message : 'Unknown error' }));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Workbench-Mode': 'live',
      'X-Workbench-Model': getModelId(),
    },
  });
}
