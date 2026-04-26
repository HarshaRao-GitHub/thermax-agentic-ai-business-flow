import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
import { buildAssetContextForAI } from '@/data/asset-performance-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are the Thermax Asset Performance AI Assistant — a domain expert in industrial boilers (AFBC, CFBC, FBC, oil/gas fired), thermic fluid heaters, waste heat recovery boilers, absorption chillers, water treatment plants (RO, UF, DM, ZLD), and solar thermal concentrators.

You have access to the complete fleet data, failure mode library (2,000+ modes), active incidents, and historical telemetry from Thermax-monitored industrial assets.

YOUR CAPABILITIES:
1. ANOMALY ANALYSIS: Identify abnormal parameter readings, correlate with known failure modes, and assess severity
2. ROOT CAUSE ANALYSIS: Perform structured root-cause analysis (5-Why, FTA, Fishbone) using the failure mode library
3. PREDICTIVE INSIGHTS: Estimate time-to-failure and risk scores based on parameter trends
4. EFFICIENCY OPTIMIZATION: Analyze efficiency losses and recommend operating set-points
5. MAINTENANCE PLANNING: Suggest preventive/predictive maintenance schedules
6. INCIDENT MANAGEMENT: Help create, analyze, and resolve incidents
7. FLEET COMPARISON: Compare asset performance across sites

RESPONSE GUIDELINES:
- Always reference specific asset IDs, site names, and failure mode codes
- Provide quantitative analysis with specific numbers, ranges, and thresholds
- Use tables for comparative data (use Markdown tables)
- Include Mermaid diagrams where helpful:
  - flowchart for troubleshooting decision trees
  - pie for failure distribution
  - gantt for maintenance schedules
  - sequence for process flows
- NEVER use xychart-beta or quadrantChart
- NEVER use emojis or special Unicode characters in Mermaid diagrams
- Use plain ASCII text only in Mermaid node labels
- Provide actionable recommendations with priority levels (Critical/High/Medium/Low)
- Reference relevant Indian standards (IBR, IS, ASME) where applicable

CURRENT FLEET DATA:
${buildAssetContextForAI()}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, uploadedTexts } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 });
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (uploadedTexts?.length) {
      systemPrompt += '\n\n=== USER UPLOADED DOCUMENTS ===\n';
      for (const ut of uploadedTexts) {
        systemPrompt += `\n--- File: ${ut.filename} ---\n${ut.text}\n`;
      }
    }

    const encoder = new TextEncoder();
    const sse = (event: string, data: unknown) =>
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const client = getAnthropicClient();
          const modelId = getModelId();

          const stream = await callWithRetry(() =>
            client.messages.create({
              model: modelId,
              max_tokens: 128000,
              system: systemPrompt,
              messages: messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
              stream: true,
            })
          );

          for await (const event of stream as AsyncIterable<Record<string, unknown>>) {
            const ev = event as { type: string; delta?: { type?: string; text?: string }; usage?: { output_tokens?: number }; message?: { usage?: { input_tokens?: number; output_tokens?: number } } };
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
              controller.enqueue(sse('text_delta', ev.delta.text));
            } else if (ev.type === 'message_start' && ev.message?.usage) {
              controller.enqueue(sse('usage', { input_tokens: ev.message.usage.input_tokens }));
            } else if (ev.type === 'message_delta' && ev.usage) {
              controller.enqueue(sse('usage_delta', { output_tokens: ev.usage.output_tokens }));
            }
          }

          controller.enqueue(sse('done', true));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          controller.enqueue(sse('error', { message: msg }));
        } finally {
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
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }), { status: 500 });
  }
}
