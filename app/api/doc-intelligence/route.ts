import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
import { getOperationById, getDepartmentById } from '@/data/doc-intelligence-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type MessageParam = Anthropic.MessageParam;
type TextBlockParam = Anthropic.TextBlockParam;
type ImageBlockParam = Anthropic.ImageBlockParam;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ImageAttachment {
  base64: string;
  media_type: string;
  label: string;
}

interface UploadedDoc {
  filename: string;
  text: string;
  images?: ImageAttachment[];
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

  parts.push(
    '',
    '## Visual Content Analysis',
    'If images, diagrams, charts, or screenshots are provided:',
    '1. Analyze ALL visual content thoroughly — describe what you see, extract any text/numbers/labels from images.',
    '2. For diagrams/flowcharts: identify the process flow, nodes, connections, and logic.',
    '3. For charts/graphs: extract the data points, trends, axes labels, legends, and key insights.',
    '4. For tables in images: reconstruct them as proper markdown tables with all data preserved.',
    '5. For technical drawings: identify components, dimensions, specifications, and annotations.',
    '6. For screenshots: extract all visible text, UI elements, and relevant information.',
    '7. Integrate visual analysis with text analysis for a comprehensive document understanding.',
  );

  parts.push(
    '',
    '## Visualization & Rich Output Requirements (MANDATORY)',
    'Your output must be enterprise-grade, visually rich, and production-quality — as if produced by a top-tier consulting firm.',
    '1. Include Mermaid diagrams using ```mermaid code blocks: pie charts (pie title "Title" then "Label" : value) for distributions, flowcharts (graph TD/LR) for processes, Gantt for timelines. Do NOT use xychart-beta or quadrantChart. Do NOT use emojis or special Unicode characters inside Mermaid diagrams — use ONLY plain ASCII text.',
    '2. Present ALL quantitative data in well-formatted markdown tables with proper headers, units, and summary rows.',
    '3. Use ## and ### headers for professional document structure.',
    '4. Start with an Executive Summary (3-5 key findings).',
    '5. Use status indicators: 🟢 Good/Low, 🟡 Warning/Medium, 🔴 Critical/High.',
    '6. End with numbered, specific, actionable recommendations.',
    '7. Include KPI dashboard tables with status indicators where appropriate.',
    '8. For data-heavy documents, always produce at least 2 Mermaid visualizations.',
  );

  return parts.join('\n');
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function buildConversationMessages(body: DocIntelRequest): MessageParam[] {
  const incomingMsgs = Array.isArray(body.messages) ? body.messages : [];
  if (incomingMsgs.length === 0) return [];

  const allImages: ImageAttachment[] = [];
  const docBlocks: string[] = [];

  if (body.uploadedTexts?.length) {
    for (const doc of body.uploadedTexts) {
      if (doc.text?.trim()) {
        docBlocks.push(`=== DOCUMENT: ${doc.filename} ===\n\n${doc.text.trim()}\n\n=== END ===`);
      }
      if (doc.images?.length) {
        for (const img of doc.images) {
          if (img.base64 && img.media_type) {
            allImages.push(img);
          }
        }
      }
    }
  }

  const documentContext = docBlocks.length > 0
    ? `--- BEGIN UPLOADED DOCUMENTS ---\n\n${docBlocks.join('\n\n')}\n\n--- END UPLOADED DOCUMENTS ---`
    : '';

  const result: MessageParam[] = [];

  for (let i = 0; i < incomingMsgs.length; i++) {
    const msg = incomingMsgs[i];

    if (i === 0 && msg.role === 'user' && (documentContext || allImages.length > 0)) {
      const contentBlocks: (TextBlockParam | ImageBlockParam)[] = [];

      if (documentContext) {
        contentBlocks.push({ type: 'text', text: documentContext });
      }

      for (const img of allImages) {
        const mt = SUPPORTED_IMAGE_TYPES.has(img.media_type)
          ? img.media_type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
          : 'image/png';

        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mt,
            data: img.base64,
          },
        });
        contentBlocks.push({
          type: 'text',
          text: `[Attached image: ${img.label}]`,
        });
      }

      contentBlocks.push({ type: 'text', text: msg.content });

      result.push({ role: 'user', content: contentBlocks });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
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
  const conversationMessages = buildConversationMessages(body);

  if (conversationMessages.length === 0) {
    const encoder = new TextEncoder();
    const errStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'No messages provided' })}\n\n`));
        controller.close();
      },
    });
    return new Response(errStream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }

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

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const apiTurns = 1;

        const stream = await callWithRetry(
          () => client.messages.create({
            model,
            max_tokens: 128000,
            system: systemPrompt,
            messages: conversationMessages,
            stream: true,
          }),
          (attempt, max, err) => {
            controller.enqueue(sse('retry', { attempt, max, message: `API busy (${err.message}), retrying ${attempt}/${max}...` }));
          }
        );

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(sse('text_delta', event.delta.text));
          }
          if (event.type === 'message_delta' && event.usage) {
            totalOutputTokens = event.usage.output_tokens ?? 0;
          }
          if (event.type === 'message_start' && event.message?.usage) {
            totalInputTokens = event.message.usage.input_tokens ?? 0;
          }
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
