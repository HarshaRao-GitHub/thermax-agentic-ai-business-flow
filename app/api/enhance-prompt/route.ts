import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, callWithRetry } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `You are a Prompt Enhancement Engine for Thermax — an industrial energy and environment solutions context covering boilers, heaters, chillers, water treatment, chemicals, and EPC projects.

Your ONLY job: take the user's basic prompt and rewrite it as a high-quality CRAFT prompt.

CRAFT Framework:
- **C**ontext: Add relevant Thermax industrial/engineering/project context
- **R**ole: Assign an expert role (e.g., "Act as a senior process engineer at Thermax...")
- **A**ction: Make the ask specific, multi-dimensional, and structured
- **F**ormat: Specify output format (tables, bullet points, executive summary, sections, Mermaid diagrams)
- **T**arget: Define the target audience (e.g., "for the project leadership team")

Rules:
1. Output ONLY the enhanced prompt text — no explanations, no preamble, no labels like "Enhanced Prompt:".
2. Keep the user's core intent unchanged — just make it richer and more structured.
3. Add Thermax industrial context where appropriate (energy solutions, boilers, chillers, water treatment, EPC projects, commissioning, service).
4. The enhanced prompt should be 80-200 words. Don't make it excessively long.
5. If the prompt is already well-structured (has role, context, format instructions), improve it slightly rather than rewriting entirely.
6. Never wrap the output in quotes or markdown code blocks.`;

export async function POST(req: NextRequest) {
  let body: { prompt: string; pageContext?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return new Response('Prompt is required', { status: 400 });
  }

  const wordCount = prompt.split(/\s+/).length;
  if (wordCount > 150) {
    const isCraft = /\b(context|role|action|format|target|act as|you are|present as|executive summary|structured)\b/i.test(prompt);
    if (isCraft) {
      return Response.json({ enhanced: prompt, alreadyCraft: true });
    }
  }

  try {
    const client = getAnthropicClient();
    const model = getModelId();

    let userMsg = `Enhance this prompt to CRAFT format:\n\n${prompt}`;
    if (body.pageContext) {
      userMsg += `\n\nPage context: ${body.pageContext}`;
    }

    const response = await callWithRetry(
      () => client.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      }),
    );

    let enhanced = '';
    for (const block of response.content) {
      if (block.type === 'text') enhanced += block.text;
    }
    enhanced = enhanced.trim();

    return Response.json({ enhanced, alreadyCraft: false });
  } catch (err) {
    console.error('Enhance prompt error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Enhancement failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
