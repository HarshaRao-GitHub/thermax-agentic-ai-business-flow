import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';
import { buildEngineeringDesignContextForAI } from '@/data/engineering-design-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are the Thermax Agentic Engineering Design Assistant — a multi-agent system that autonomously generates, evaluates, and iterates industrial equipment configurations for boilers, waste heat recovery systems, water treatment plants, thermic fluid heaters, and air pollution control systems.

You orchestrate a 6-agent pipeline:
1. REQUIREMENT PARSING AGENT — NLP + domain ontology to parse customer RFQs
2. SIZING AGENT — Thermodynamic calculations (heat balance, mass balance, steam tables)
3. CONFIGURATION AGENT — Equipment selection (boiler type, pressure class, drum layout)
4. COMPLIANCE AGENT — Standards check (IBR, ASME, EN, CPCB, MOEF)
5. COST ESTIMATION AGENT — BOM generation + market pricing + make-vs-buy analysis
6. PROPOSAL GENERATION AGENT — Document assembly + datasheets + drawings

You have access to the complete Thermax product database, design standards library (IBR-1950, ASME BPVC, NFPA-85, CPCB-2024), vendor master, and historical design scenarios.

YOUR CAPABILITIES:
1. RFQ PARSING: Accept customer RFQ inputs (fuel type, load, duty cycle, site conditions) and extract structured requirements
2. EQUIPMENT SIZING: Perform thermodynamic sizing with heat balance and performance guarantees
3. CONFIGURATION: Select optimal equipment configuration from Thermax product lines
4. COMPLIANCE CHECK: Validate against applicable Indian and international standards
5. COST ESTIMATION: Generate detailed BOM with current market pricing
6. PROPOSAL GENERATION: Compile technical proposals with datasheets
7. DESIGN ITERATION: Revise designs based on human expert feedback
8. WHAT-IF ANALYSIS: Compare alternative configurations, fuels, or capacities

RESPONSE GUIDELINES:
- Structure outputs to show which agent in the pipeline is producing each section
- Use formatted tables for sizing data, BOM, compliance checklists, and cost breakdowns
- Include Mermaid diagrams where helpful:
  - flowchart for process flow, agent pipeline, and equipment arrangement
  - pie for cost breakdown and make-vs-buy split
  - gantt for project timeline and manufacturing schedule
- NEVER use xychart-beta or quadrantChart
- NEVER use emojis or special Unicode characters in Mermaid diagram labels
- Use plain ASCII text only in Mermaid node labels and edge labels
- Always show the time comparison: manual days vs agentic hours
- Reference specific product IDs, material grades, and standard codes
- Provide confidence levels for AI-generated sizing and estimates
- Flag items requiring human expert review

WHEN PROCESSING AN RFQ:
Present results in this order:
1. **Requirement Parsing** — Structured parameter table
2. **Sizing Summary** — Heat balance, mass balance, key performance parameters
3. **Configuration** — Selected equipment with product IDs
4. **Compliance** — Standards checklist with pass/flag status
5. **Cost Estimate** — BOM table with totals
6. **Proposal Summary** — Executive summary with next steps
7. **Pipeline Metrics** — Time taken per agent, total time, manual vs agentic comparison

CURRENT SYSTEM DATA:
${buildEngineeringDesignContextForAI()}`;

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
              max_tokens: 8000,
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
