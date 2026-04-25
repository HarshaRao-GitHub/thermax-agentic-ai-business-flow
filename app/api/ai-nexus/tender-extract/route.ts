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

PRODUCE A DETAILED, STRUCTURED REPORT in the following format:

## Tender Summary
2-3 sentence overview of the tender, including estimated project value if found.

## Exotic Materials Detected
List any exotic or non-standard materials (Hastelloy, Inconel, Titanium, Duplex SS, alloys beyond SS 316). Mark each with the component it applies to.

## Critical Risk Items
List high-risk clauses: high LD percentages, unusual payment terms, stringent performance guarantees, IP clauses, etc.

Then for EACH extraction category, produce a section:

## [Category Name]
Present extracted information in a Markdown table with columns:
| Field | Value | Confidence | Source | Flagged |
Where Confidence is High/Medium/Low, Source references the document section, and Flagged is Yes for exotic materials or critical risks.

After the table, add any notes or observations relevant to that category.

Finally, at the very end of your response, include a JSON block wrapped in triple backticks:
\`\`\`json
{"extractions":[{"categoryId":"...","categoryName":"...","items":[{"field":"...","value":"...","confidence":0.95,"sourceRef":"Section X","flagged":false}]}],"summary":"...","exoticMaterials":["..."],"criticalRisks":["..."],"estimatedValue":"..."}
\`\`\`

RULES:
- Be thorough and extract ALL relevant information for each category
- Use clear, readable language — not technical jargon
- Confidence: High = directly stated (1.0), Medium = inferred (0.7-0.9), Low = uncertain (<0.7)
- Flag exotic materials and critical risk items clearly
- Reference specific section numbers from the document
- Use Mermaid diagrams where helpful (flowchart only, plain ASCII, no emojis, no xychart-beta)
- If a category has no relevant content, note "No relevant information found in this tender"
- Make the report comprehensive and immediately actionable for proposal engineers`;

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
