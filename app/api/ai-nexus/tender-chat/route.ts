import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, documentText, divisionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 });
    }

    const systemPrompt = `You are Thermax's Tender Q&A Assistant — an expert at answering questions about industrial tender and RFP documents for the ${divisionId || 'general'} division.

You have the complete tender document loaded in context. Answer questions precisely, always citing the relevant section or page reference from the document.

CAPABILITIES:
1. Answer factual questions about the tender content
2. Compare tender requirements against Thermax standard offerings
3. Highlight risks, non-standard requirements, and exotic materials
4. Summarize specific sections or the entire document
5. Identify gaps or missing information in the tender
6. Estimate costs or flag pricing considerations
7. Suggest technical clarification questions for the pre-bid meeting

RESPONSE GUIDELINES:
- Always cite section numbers from the document (e.g., "Section 4.3", "Clause 7.2")
- Use Markdown tables for comparative data
- Use Mermaid flowcharts for process/decision flows (plain ASCII only, no emojis, no xychart-beta)
- Highlight critical items in bold
- Flag any exotic materials or non-standard requirements
- Provide Thermax-perspective commentary where relevant

${documentText ? `TENDER DOCUMENT:\n${documentText}` : 'No document loaded yet. Ask the user to upload a tender document first.'}`;

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
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }), { status: 500 });
  }
}
