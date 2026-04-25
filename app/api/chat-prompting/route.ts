import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
import { needsWebSearch, searchWeb, formatSearchContext } from '@/lib/web-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: IncomingMessage[];
}

const SYSTEM_PROMPT = `You are an AI research and strategy assistant for Thermax, a leading energy and environment solutions company. Help the user explore ideas, research topics, analyze markets, and build structured thinking through progressively detailed prompts. Be thorough, structured, and cite sources where relevant. Use tables and clear formatting.

Key context about Thermax:
- Thermax is an Indian multinational, headquartered in Pune, operating in energy and environment sectors
- Product portfolio: boilers, heaters, chillers, water treatment, air pollution control, chemicals
- Key sectors served: power, oil & gas, cement, steel, pharma, food processing, chemicals, textiles
- Global presence across Asia, Africa, Middle East, Southeast Asia, and Europe
- Focus areas: decarbonization, energy efficiency, sustainability, Industry 4.0

When the user builds on prior prompts (prompt ladder approach), acknowledge the progression and deepen your analysis accordingly. Structure outputs with clear headings, bullet points, tables, and actionable recommendations where appropriate.`;

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!body.messages?.length) {
    return new Response('Messages array is required', { status: 400 });
  }

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

        const conversationMessages = body.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const latestUserMsg =
          conversationMessages.filter((m) => m.role === 'user').pop()?.content ?? '';

        let webContext = '';

        if (needsWebSearch(latestUserMsg)) {
          controller.enqueue(
            sse('web_search', { status: 'searching', query: latestUserMsg })
          );

          const t0 = Date.now();
          const results = await searchWeb(latestUserMsg);
          const elapsed = Date.now() - t0;

          controller.enqueue(
            sse('web_search', {
              status: 'done',
              resultCount: results.length,
              ms: elapsed,
            })
          );

          webContext = formatSearchContext(results);
        }

        const systemWithWeb = webContext
          ? `${SYSTEM_PROMPT}\n\n${webContext}`
          : SYSTEM_PROMPT;

        const response = await callWithRetry(
          () =>
            client.messages.create({
              model,
              max_tokens: 8192,
              system: systemWithWeb,
              messages: conversationMessages,
            }),
          (attempt, max, err) => {
            controller.enqueue(
              sse('retry', {
                attempt,
                max,
                message: `API busy (${err.message}), retrying ${attempt}/${max}...`,
              })
            );
          }
        );

        for (const block of response.content) {
          if (block.type === 'text' && block.text) {
            const tokens = block.text.split(/(\s+)/);
            for (let i = 0; i < tokens.length; i += 4) {
              const chunk = tokens.slice(i, i + 4).join('');
              controller.enqueue(sse('text_delta', chunk));
            }
          }
        }

        controller.enqueue(sse('done', {}));
        controller.close();
      } catch (err) {
        console.error('Chat-prompting error:', err);
        controller.enqueue(
          sse('error', {
            message: err instanceof Error ? err.message : 'Unknown error',
          })
        );
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
}
