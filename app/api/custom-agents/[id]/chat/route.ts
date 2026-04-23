import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, isMockMode } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface TaskDef { id: string; label: string; description: string; }
interface BaseDocDef { filename: string; text: string; sizeKb: number; }
interface UploadedDoc { filename: string; text: string; }

interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  tasks: TaskDef[];
  baseDocuments?: BaseDocDef[];
  acceptedFiles: string;
}

interface ChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  uploadedTexts?: UploadedDoc[];
  agentConfig: AgentConfig;
}

function buildSystemPrompt(cfg: AgentConfig): string {
  const parts: string[] = [
    `You are "${cfg.name}", a custom AI agent.`,
    '',
    `## Description`,
    cfg.description,
    '',
    `## Your Instructions`,
    cfg.instructions,
  ];

  if (cfg.tasks.length > 0) {
    parts.push('', '## Tasks You Must Perform');
    cfg.tasks.forEach((t, i) => {
      parts.push(`${i + 1}. **${t.label}**: ${t.description}`);
    });
  }

  if (cfg.acceptedFiles) {
    parts.push('', `## Accepted File Types`, cfg.acceptedFiles);
  }

  parts.push(
    '',
    '## Output Rules',
    '- Present findings in clear, structured Markdown with tables where applicable.',
    '- Mark assumptions with [ASSUMPTION] and data gaps with [DATA GAP].',
    '- Provide confidence scores (0.0–1.0) for key conclusions.',
    '- If user uploads are irrelevant, politely decline and explain what you accept.',
  );

  return parts.join('\n');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  void params;

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!body.agentConfig) {
    return new Response('Missing agentConfig in request body', { status: 400 });
  }

  const agent = body.agentConfig;

  let systemPrompt = buildSystemPrompt(agent);

  if (agent.baseDocuments?.length) {
    const baseBlocks = agent.baseDocuments
      .filter(d => d.text?.trim())
      .map(d => `=== BASE KNOWLEDGE: ${d.filename} ===\n\n${d.text.trim()}\n\n=== END ===`);
    if (baseBlocks.length) {
      systemPrompt += '\n\n--- BEGIN BASE KNOWLEDGE ---\n\n' +
        baseBlocks.join('\n\n') +
        '\n\n--- END BASE KNOWLEDGE ---';
    }
  }

  if (body.uploadedTexts?.length) {
    const docBlocks = body.uploadedTexts
      .filter(d => d.text?.trim())
      .map(d => `=== USER-UPLOADED DOCUMENT: ${d.filename} ===\n\n${d.text.trim()}\n\n=== END ===`);
    if (docBlocks.length) {
      systemPrompt += '\n\n--- BEGIN UPLOADED DOCUMENTS ---\n\n' +
        docBlocks.join('\n\n') +
        '\n\n--- END UPLOADED DOCUMENTS ---';
    }
  }

  const encoder = new TextEncoder();
  function sse(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  if (isMockMode()) {
    const readable = new ReadableStream({
      async start(controller) {
        const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
        const mockStart = Date.now();

        for (const task of agent.tasks) {
          controller.enqueue(sse('tool_start', { tool: task.label, input: { task: task.description } }));
          await pause(700);
          controller.enqueue(sse('tool_result', { tool: task.label, result: `Completed: ${task.description}` }));
          await pause(300);
        }

        const uploadInfo = body.uploadedTexts?.length
          ? `\n\n### Uploaded Documents Processed\n${body.uploadedTexts.map(d => `- **${d.filename}** (${(d.text.length / 1024).toFixed(1)} KB)`).join('\n')}\n`
          : '';

        const baseDocsInfo = agent.baseDocuments?.length
          ? `\n\n### Knowledge Base Documents\n${agent.baseDocuments.map(d => `- **${d.filename}** (${d.sizeKb} KB) — included as base knowledge`).join('\n')}\n`
          : '';

        const tasksSection = agent.tasks.length
          ? `### Tasks Executed\n${agent.tasks.map((t, i) => `${i + 1}. **${t.label}**: ${t.description} — ✅ Complete`).join('\n')}`
          : '### Processing\nExecuted analysis according to configured instructions.';

        const mockText = `## ${agent.name} — Analysis Complete

### Summary
I have processed your request according to my configured instructions. Here is a structured analysis based on the data and context provided.

${tasksSection}
${baseDocsInfo}${uploadInfo}
### Key Findings

Based on my analysis, here are the structured results:

| # | Finding | Confidence | Status |
|---|---------|-----------|--------|
| 1 | Primary analysis completed per instructions | 0.92 | ✅ Complete |
| 2 | Data patterns identified and documented | 0.88 | ✅ Complete |
| 3 | Recommendations generated based on findings | 0.85 | ✅ Complete |

### Recommendations
1. Review the findings above and validate against your domain expertise
2. Upload additional relevant documents if deeper analysis is needed
3. Refine instructions if you'd like a different analytical focus

### Methodology
- Followed the user-defined instructions for **${agent.name}**
- Applied structured analysis with confidence scoring
- Marked assumptions with [ASSUMPTION] and data gaps with [DATA GAP]

*${agent.name} completed ${agent.tasks.length} task(s). All outputs generated per configured instructions.*`;

        const tokens = mockText.split(/(\s+)/);
        for (let i = 0; i < tokens.length; i += 4) {
          controller.enqueue(sse('text_delta', tokens.slice(i, i + 4).join('')));
          await pause(8);
        }

        const elapsed = ((Date.now() - mockStart) / 1000).toFixed(1);
        const inputTokens = Math.round(systemPrompt.length / 4);
        const outputTokens = Math.round(mockText.length / 4);
        const cost = inputTokens * 15 / 1_000_000 + outputTokens * 75 / 1_000_000;

        controller.enqueue(sse('usage', {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          tool_calls: agent.tasks.length,
          api_turns: 1,
          model: 'enterprise-llm (mock)',
          response_time_s: parseFloat(elapsed),
          estimated_cost_usd: parseFloat(cost.toFixed(4))
        }));

        controller.enqueue(sse('done', {}));
        controller.close();
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Workbench-Mode': 'mock'
      }
    });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const client = getAnthropicClient();
        const model = getModelId();
        const liveStart = Date.now();

        type MsgParam = { role: 'user' | 'assistant'; content: string };
        const conversationMessages: MsgParam[] = body.messages.map(m => ({
          role: m.role,
          content: m.content
        }));

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let apiTurns = 0;

        const MAX_LOOPS = 5;
        for (let loop = 0; loop < MAX_LOOPS; loop++) {
          apiTurns++;
          const response = await client.messages.create({
            model,
            max_tokens: 8192,
            system: systemPrompt,
            messages: conversationMessages
          });

          totalInputTokens += response.usage?.input_tokens ?? 0;
          totalOutputTokens += response.usage?.output_tokens ?? 0;

          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              const tokens = block.text.split(/(\s+)/);
              for (let i = 0; i < tokens.length; i += 4) {
                controller.enqueue(sse('text_delta', tokens.slice(i, i + 4).join('')));
              }
            }
          }

          if (response.stop_reason === 'end_turn') break;
        }

        const elapsedS = parseFloat(((Date.now() - liveStart) / 1000).toFixed(1));
        const totalCost = totalInputTokens * 15 / 1_000_000 + totalOutputTokens * 75 / 1_000_000;

        controller.enqueue(sse('usage', {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalInputTokens + totalOutputTokens,
          tool_calls: 0,
          api_turns: apiTurns,
          model,
          response_time_s: elapsedS,
          estimated_cost_usd: parseFloat(totalCost.toFixed(4))
        }));

        controller.enqueue(sse('done', {}));
        controller.close();
      } catch (err) {
        console.error('Custom agent chat error:', err);
        controller.enqueue(sse('error', { message: err instanceof Error ? err.message : 'Unknown error' }));
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Workbench-Mode': 'live',
      'X-Workbench-Model': getModelId()
    }
  });
}
