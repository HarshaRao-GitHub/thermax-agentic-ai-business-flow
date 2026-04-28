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
  promptLevel?: 'L1' | 'L2' | 'L3' | 'L4';
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
- Air Pollution Control (APC) expertise: Electrostatic Precipitators (ESP — dry, wet, hybrid), Bag Filters (pulse jet, reverse air), Flue Gas Desulfurization (FGD — wet limestone, dry/semi-dry), Selective Catalytic Reduction (SCR), Continuous Emission Monitoring Systems (CEMS)
- ESP domain knowledge: SCA sizing, collection efficiency (Deutsch-Anderson equation), TR set technology (conventional SCR, SMPS/switch-mode), rapping systems, gas distribution (CFD/physical model), high-resistivity dust handling (pulse energization, SO3 conditioning), CPCB/SPCB emission norms compliance
- Key APC sectors: cement (kiln, raw mill, coal mill, clinker cooler), power (coal-fired, biomass), steel (sinter, blast furnace, BOF, EAF), chemicals, refineries, waste-to-energy

When the user builds on prior prompts (prompt ladder approach), acknowledge the progression and deepen your analysis accordingly.

VISUALIZATION & RICH OUTPUT REQUIREMENTS (MANDATORY):
Your output must be enterprise-grade, visually rich, and production-quality — as if produced by a top-tier consulting firm. Follow these rules:
1. Include Mermaid diagrams where contextually appropriate using \`\`\`mermaid code blocks. ONLY use these chart types:
   - pie charts (format: pie title "Title" then "Label" : value) for distributions
   - flowcharts (graph TD or graph LR) for processes, decision trees
   - gantt charts for timelines and schedules
   - sequence diagrams for interactions
   CRITICAL: Do NOT use xychart-beta or quadrantChart. Do NOT put emojis or special Unicode characters (like x multiplication sign, superscripts, ₹, °, arrows) inside Mermaid diagrams. Use ONLY plain ASCII text in all Mermaid node labels and text.
2. Present all quantitative data in well-formatted markdown tables with proper headers and units
3. Use ## and ### headers for professional document structure
4. Start with an Executive Summary (3-5 key findings)
5. Use status indicators: 🟢 Good/Low, 🟡 Warning/Medium, 🔴 Critical/High
6. End with numbered, specific, actionable recommendations
7. Include comparative analysis with side-by-side tables where relevant
8. Present KPIs in structured metric tables with status indicators`;

const LEVEL_INSTRUCTIONS: Record<string, string> = {
  L1: `
CRITICAL OUTPUT CONSTRAINTS (L1 — Simple Prompt):
The user has provided a very basic, unstructured prompt with no context, no constraints, and no audience specification. Your response MUST reflect the limitations of the prompt:
- Keep your response VERY SHORT — a maximum of 150-200 words. Do NOT elaborate or go into depth.
- Provide only a generic, surface-level overview. Do NOT add specifics the user did not ask for.
- Do NOT include tables, Mermaid diagrams, KPIs, or structured analysis.
- Do NOT add executive summaries, numbered recommendations, or risk assessments.
- Use simple bullet points at most. Respond conversationally in 3-5 short paragraphs or a brief list.
- Your accuracy and precision should reflect roughly 60% — give broadly correct but generic answers without depth, nuance, or data backing.
- This is intentional: you are demonstrating that a simple prompt yields a simple answer. Do NOT overdeliver.`,

  L2: `
CRITICAL OUTPUT CONSTRAINTS (L2 — Detailed Prompt):
The user has provided a moderately detailed prompt with some context, geography, customer segments, or product specifications. Your response should be noticeably better than L1 but still bounded:
- Provide a MEDIUM-length response — approximately 400-600 words.
- Include some structure: use 2-3 section headers and basic bullet points.
- You may include ONE simple table if the data calls for it, but keep it under 5 rows.
- Do NOT include Mermaid diagrams, Gantt charts, or complex visualizations.
- Provide reasonably accurate information (~80% accuracy and precision) — include relevant details where the prompt provides context, but do not fabricate specifics not implied by the prompt.
- Show moderate depth — address the main dimensions the user mentioned but do not exhaustively analyze trade-offs or alternatives.
- This demonstrates that adding detail to the prompt yields a meaningfully better answer, but not yet a strategic one.`,

  L3: `
CRITICAL OUTPUT CONSTRAINTS (L3 — Analytical Prompt):
The user has provided an analytical prompt that asks for reasoning, trade-off analysis, competitive assessment, or multi-dimensional evaluation. Your response should demonstrate significant quality improvement:
- Provide a SUBSTANTIAL response — approximately 600-900 words.
- Use clear section structure with ## and ### headers.
- Include 2-3 well-formatted tables with data comparisons, scoring, or assessments.
- You may include ONE Mermaid diagram if appropriate (pie chart or simple flowchart).
- Provide strong accuracy and precision (~80%) — include specific analysis, evidence-based reasoning, and data where available.
- Address all analytical dimensions the user specified — competitive landscape, regulatory factors, trade-offs, success metrics, etc.
- Include brief numbered recommendations at the end.
- This demonstrates that an analytical prompt produces a reasoned, structured response — but not yet board-ready.`,

  L4: `
CRITICAL OUTPUT CONSTRAINTS (L4 — CRAFT Framework Prompt):
The user has provided a fully structured CRAFT prompt with explicit Context, Role, Action, Format, and Target Audience. Your response MUST be the absolute best quality you can produce:
- Provide a COMPREHENSIVE, DETAILED response — as lengthy and thorough as needed. No word limit. Go deep.
- Follow the exact format specifications the user requested (executive memo, decision matrix, differentiation table, launch plan, meeting agenda, etc.).
- Include MULTIPLE Mermaid diagrams (2-4): pie charts, flowcharts, Gantt charts, sequence diagrams as contextually appropriate.
- Include MULTIPLE well-formatted tables with proper headers, units, and status indicators (🟢🟡🔴).
- Start with a crisp Executive Summary.
- Achieve the HIGHEST possible accuracy and precision (>=95%) — use specific data points, realistic numbers, detailed analysis, competitive intelligence, regulatory details, and actionable specifics.
- Adopt the exact ROLE specified — write from that persona's expertise and perspective.
- Address the TARGET AUDIENCE explicitly — tailor language, depth, and recommendations for the stated readers.
- End with specific, actionable, time-bound recommendations with assigned owners where applicable.
- Include KPI dashboards, risk assessments, and comparative analyses where relevant.
- This is the gold standard: a CRAFT prompt should produce consulting-firm-quality, board-ready output that could be directly presented to leadership.`
};

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

        const level = body.promptLevel ?? 'L4';
        const levelInstructions = LEVEL_INSTRUCTIONS[level] ?? LEVEL_INSTRUCTIONS.L4;

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

        const baseSystem = `${SYSTEM_PROMPT}\n${levelInstructions}`;
        const systemWithWeb = webContext
          ? `${baseSystem}\n\n${webContext}`
          : baseSystem;

        const maxTokensByLevel: Record<string, number> = {
          L1: 1024,
          L2: 4096,
          L3: 8192,
          L4: 128000,
        };

        const stream = await callWithRetry(
          () =>
            client.messages.create({
              model,
              max_tokens: maxTokensByLevel[level] ?? 128000,
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
