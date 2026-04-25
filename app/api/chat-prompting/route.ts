import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
import { needsWebSearch, searchWeb, formatSearchContext } from '@/lib/web-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: IncomingMessage[];
}

const SYSTEM_PROMPT = `You are an AI research and strategy assistant for Thermax, a leading energy and environment solutions company. Help the user explore ideas, research topics, analyze markets, and build structured thinking through progressively detailed prompts. Be thorough, structured, and cite sources where relevant.

Key context about Thermax:
- Thermax is an Indian multinational, headquartered in Pune, with ₹8,500+ Cr annual revenue
- Product portfolio: boilers (shell, water tube, AFBC, CFBC), thermic fluid heaters, waste heat recovery boilers, absorption chillers, cooling towers, water treatment (DM, RO, ZLD, MBR, MEE), air pollution control (ESP, bag filter, FGD, SCR), process chemicals, and captive power plants
- Key sectors: power, oil & gas, cement, steel, pharma, food processing, chemicals, textiles, sugar, paper, automotive, metals
- Global presence: 75+ countries across Asia, Africa, Middle East, Southeast Asia, and Europe with 10 manufacturing facilities
- Focus areas: decarbonization, green hydrogen, bio-CNG, solar thermal, energy efficiency, Industry 4.0, digital monitoring (Edelise platform)
- Competitors: L&T, Forbes Marshall, ISGEC, BHEL, Siemens Energy, GE Power, Veolia, Alfa Laval
- Recent wins: FGD for 3 power stations, ZLD for 25+ textile plants, WHRS for 12 cement plants

When the user builds on prior prompts (prompt ladder approach), acknowledge the progression and deepen your analysis accordingly.

VISUALIZATION & RICH OUTPUT REQUIREMENTS (MANDATORY):
Your output must be enterprise-grade, visually rich, and production-quality — as if produced by a top-tier consulting firm. Follow these rules:
1. Include Mermaid diagrams where contextually appropriate using \`\`\`mermaid code blocks. ONLY use these chart types:
   - pie charts (format: pie title "Title" then "Label" : value) for distributions
   - flowcharts (graph TD or graph LR) for processes, decision trees
   - gantt charts for timelines and schedules
   - sequence diagrams for interactions
   Do NOT use xychart-beta or quadrantChart — they cause rendering errors. Use markdown tables for comparisons instead.
2. Present all quantitative data in well-formatted markdown tables with proper headers and units
3. Use ## and ### headers for professional document structure
4. Start with an Executive Summary (3-5 key findings)
5. Use status indicators: 🟢 Good/Low, 🟡 Warning/Medium, 🔴 Critical/High
6. End with numbered, specific, actionable recommendations
7. Include comparative analysis with side-by-side tables where relevant
8. Present KPIs in structured metric tables with status indicators`;

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

        const stream = await callWithRetry(
          () =>
            client.messages.create({
              model,
              max_tokens: 4096,
              system: systemWithWeb,
              messages: conversationMessages,
              stream: true,
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

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(sse('text_delta', event.delta.text));
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
