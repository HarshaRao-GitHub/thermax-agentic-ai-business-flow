import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentText, divisionId, categories } = body;

    if (!documentText || !divisionId || !categories?.length) {
      return new Response(JSON.stringify({ error: 'documentText, divisionId, and categories are required' }), { status: 400 });
    }

    const categoryList = categories.map((c: { id: string; name: string; description: string }) =>
      `- "${c.id}": ${c.name} — ${c.description}`
    ).join('\n');

    const systemPrompt = `You are Thermax's Tender Intelligence AI — an expert at reading and extracting key information from industrial tender and RFP documents for the ${divisionId} division.

TASK: Analyze the provided tender document and extract information into the following categories:
${categoryList}

OUTPUT FORMAT: You must respond with ONLY a valid JSON object (no markdown code fences, no preamble). The JSON must have this exact structure:
{
  "extractions": [
    {
      "categoryId": "<category id from above>",
      "categoryName": "<category name>",
      "items": [
        {
          "field": "<extracted field name>",
          "value": "<extracted value>",
          "confidence": <0.0 to 1.0>,
          "sourceRef": "<reference to section/page in document>",
          "flagged": <true if exotic material or critical risk item>
        }
      ]
    }
  ],
  "summary": "<2-3 sentence overall tender summary>",
  "exoticMaterials": ["<list of any exotic or non-standard materials found>"],
  "criticalRisks": ["<list of high-risk clauses or conditions>"],
  "estimatedValue": "<project estimated value if found>"
}

RULES:
- Extract ALL relevant information for each category
- Set confidence to 1.0 for directly stated values, 0.7-0.9 for inferred values, below 0.7 for uncertain
- Flag exotic materials (Hastelloy, Inconel, Titanium, Duplex SS, special alloys beyond SS 316)
- Flag critical risk items (high LD percentages, unusual payment terms, stringent performance guarantees)
- Reference specific section numbers from the document
- If a category has no relevant content, return an empty items array for it`;

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
              max_tokens: 4096,
              system: systemPrompt,
              messages: [{ role: 'user', content: `TENDER DOCUMENT:\n\n${documentText}` }],
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
