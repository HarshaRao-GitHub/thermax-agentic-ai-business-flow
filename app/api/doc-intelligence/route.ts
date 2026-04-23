import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId, isMockMode } from '@/lib/anthropic';
import { getOperationById, getDepartmentById } from '@/data/doc-intelligence-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadedDoc {
  filename: string;
  text: string;
}

interface DocIntelRequest {
  operation: string;
  department?: string;
  messages: ChatMessage[];
  uploadedTexts: UploadedDoc[];
  options?: {
    outputFormat?: 'table' | 'json' | 'bullets' | 'narrative';
    summaryType?: 'executive' | 'section' | 'action-items' | 'risk';
    comparisonMode?: 'delta' | 'missing' | 'risk-impact';
  };
}

function buildSystemPrompt(req: DocIntelRequest): string {
  const operation = getOperationById(req.operation);
  if (!operation) {
    return 'You are a Thermax Document Intelligence Agent. Analyze the uploaded documents and provide structured, actionable insights.';
  }

  const parts: string[] = [operation.systemPromptTemplate];

  if (req.department) {
    const dept = getDepartmentById(req.department);
    if (dept) {
      parts.push(
        '',
        `## Department Context: ${dept.label}`,
        `You are operating in the context of the ${dept.label} department.`,
        `Typical documents in this department: ${dept.typicalDocs}`,
        `Tailor your analysis, terminology, and recommendations to this department's needs.`
      );
    }
  }

  if (req.options?.outputFormat) {
    const fmtInstructions: Record<string, string> = {
      table: 'Present your output primarily in Markdown tables with clear headers and aligned columns.',
      json: 'Structure your output as formatted JSON objects where applicable, with clear keys and values.',
      bullets: 'Use concise bullet points organized in hierarchical lists for your output.',
      narrative: 'Write your output as a flowing narrative with clear section headings and paragraphs.',
    };
    parts.push('', `## Output Format Preference`, fmtInstructions[req.options.outputFormat] || '');
  }

  if (req.options?.summaryType && req.operation === 'summarize') {
    parts.push('', `## Summary Type Requested: ${req.options.summaryType}`, `Focus your summarization on producing a "${req.options.summaryType}" style summary.`);
  }

  if (req.options?.comparisonMode && req.operation === 'compare') {
    const modeInstructions: Record<string, string> = {
      delta: 'Focus on identifying all changes/differences between the documents.',
      missing: 'Focus on identifying what is present in one document but missing from the other.',
      'risk-impact': 'Focus on assessing the risk impact of differences between documents.',
    };
    parts.push('', `## Comparison Mode: ${req.options.comparisonMode}`, modeInstructions[req.options.comparisonMode] || '');
  }

  if (req.uploadedTexts?.length) {
    const docBlocks = req.uploadedTexts
      .filter(d => d.text?.trim())
      .map(d => `=== DOCUMENT: ${d.filename} ===\n\n${d.text.trim()}\n\n=== END ===`);
    if (docBlocks.length) {
      parts.push(
        '',
        '--- BEGIN UPLOADED DOCUMENTS ---',
        '',
        docBlocks.join('\n\n'),
        '',
        '--- END UPLOADED DOCUMENTS ---'
      );
    }
  }

  return parts.join('\n');
}

function buildMockOutput(req: DocIntelRequest): string {
  const operation = getOperationById(req.operation);
  const opLabel = operation?.label ?? req.operation;
  const dept = req.department ? getDepartmentById(req.department) : null;
  const deptLabel = dept?.label ?? 'General';
  const fileList = req.uploadedTexts?.length
    ? req.uploadedTexts.map(d => `- **${d.filename}** (${(d.text.length / 1024).toFixed(1)} KB)`).join('\n')
    : '- No documents uploaded';

  const opMocks: Record<string, string> = {
    summarize: `### Executive Summary\nBased on analysis of the uploaded documents from the ${deptLabel} department, here are the key findings:\n\n1. **Primary Theme**: The documents contain operational data and procedural information critical to ${deptLabel} functions.\n2. **Key Metrics**: 15 data points extracted, 8 action items identified, 3 risk areas flagged.\n3. **Recommendation**: Immediate attention required on 2 high-priority items identified in the analysis.\n\n### Section-wise Summary\n\n| Section | Key Points | Risk Level |\n|---------|-----------|------------|\n| Overview | Document covers standard ${deptLabel.toLowerCase()} processes | Low |\n| Data Analysis | Multiple data points showing trends | Medium |\n| Compliance | 2 areas require attention | High |\n| Recommendations | 5 actionable items proposed | N/A |\n\n### Action Items\n1. Review flagged compliance gaps within 7 days\n2. Update process documentation per findings\n3. Schedule follow-up review in 30 days`,

    qa: `### Answer\n\nBased on the uploaded documents from the ${deptLabel} department:\n\n> The relevant information was found in the uploaded document(s). Here is the grounded answer with citations.\n\n**Confidence: High**\n\n| Source | Section | Relevance |\n|--------|---------|----------|\n| Document 1 | Section 3.2 | Direct answer found |\n| Document 1 | Section 5.1 | Supporting context |\n\n*Note: All answers are grounded in the actual document content. No external information used.*`,

    extract: `### Extracted Information\n\n| Field | Value | Source | Confidence |\n|-------|-------|--------|------------|\n| Document Type | ${deptLabel} Record | Header | High |\n| Date | 2026-03-15 | Section 1 | High |\n| Reference Number | REF-2026-001 | Header | High |\n| Key Amount | INR 12,50,000 | Section 4 | Medium |\n| Responsible Party | ${deptLabel} Manager | Section 2 | High |\n| Status | Active | Section 6 | High |\n| Next Review Date | 2026-06-15 | Section 7 | Medium |\n\n*7 fields extracted from uploaded documents. 0 fields marked [NOT FOUND].*`,

    tabulate: `### Structured Data Table\n\n| # | Item | Category | Value | Status | Owner | Due Date |\n|---|------|----------|-------|--------|-------|----------|\n| 1 | Process review | ${deptLabel} | Standard | Pending | Dept Head | 2026-04-30 |\n| 2 | Compliance check | Regulatory | High Priority | In Progress | EHS Manager | 2026-05-15 |\n| 3 | Documentation update | Internal | Medium | Not Started | Quality Team | 2026-06-01 |\n| 4 | Training requirement | HR | Mandatory | Scheduled | HR Manager | 2026-04-20 |\n| 5 | Budget allocation | Finance | INR 5L | Approved | Finance Head | 2026-04-01 |\n\n*5 items tabulated from uploaded documents. Ready for export to spreadsheet.*`,

    insights: `### Key Insights & Patterns\n\n#### Recurring Issues\n1. **Process Delays** — Found in 3 instances across documents. Average delay: 5 days. Impact: Medium.\n2. **Documentation Gaps** — 2 instances of missing standard documentation. Impact: High.\n\n#### Trends Detected\n- Upward trend in compliance metrics over last 2 quarters\n- Downward trend in processing time (positive improvement)\n\n#### Anomalies\n| Anomaly | Description | Frequency | Impact |\n|---------|------------|-----------|--------|\n| Data gap in Q2 records | Missing entries for weeks 8-10 | Once | Medium |\n| Unusual value spike | Parameter exceeded 2σ threshold | Twice | High |\n\n#### Recommended Actions\n1. Investigate Q2 data gap — possible system issue\n2. Establish monitoring for parameter spikes\n3. Formalize documentation requirements`,

    classify: `### Document Classification\n\n| Dimension | Classification | Confidence |\n|-----------|---------------|------------|\n| Department | ${deptLabel} | 0.95 |\n| Document Type | Operational Record | 0.88 |\n| Sensitivity | Internal | 0.92 |\n| Workflow Stage | Under Review | 0.75 |\n| Risk Level | Medium | 0.82 |\n| Priority | Normal | 0.90 |\n\n**Custom Tags**: #${deptLabel.toLowerCase().replace(/[\\s\\/]/g,'-')}, #operational, #2026, #review-required\n\n**Suggested Routing**: ${deptLabel} Department Head → Quality Review → Archive`,

    compare: `### Document Comparison Results\n\n#### Delta Summary\n- **6 differences** found between the uploaded documents\n- **2 additions**, **1 removal**, **3 modifications**\n\n| # | Section | Document A | Document B | Change Type | Risk Impact |\n|---|---------|-----------|-----------|-------------|-------------|\n| 1 | Terms | 30-day payment | 45-day payment | Modified | Medium |\n| 2 | Scope | Standard | Extended scope added | Addition | Low |\n| 3 | Warranty | 18 months | 24 months | Modified | Low (positive) |\n| 4 | LD Clause | 5% cap | Removed | Removal | High |\n| 5 | Insurance | INR 5 Cr | INR 10 Cr | Modified | Low |\n| 6 | Arbitration | Mumbai | Delhi | Modified | Low |\n\n**Overall Assessment**: Attention needed on removal of LD clause (Item 4) — significant risk.`,

    search: `### Search Results\n\n| # | Document | Section | Relevance | Excerpt |\n|---|----------|---------|-----------|--------|\n| 1 | Document 1 | Section 4.2 | High | *"...relevant content matching your query..."* |\n| 2 | Document 1 | Section 7.1 | Medium | *"...related information found in this section..."* |\n| 3 | Document 2 | Section 2.3 | Medium | *"...additional context available here..."* |\n\n**Synthesis**: The search results indicate coverage across 2 documents in 3 sections. The primary information is concentrated in Document 1, Section 4.2.`,

    compliance: `### Compliance Check Results\n\n**Overall Compliance Score: 78%** (7 of 9 checks passed)\n\n| # | Check Item | Status | Finding | Recommendation |\n|---|-----------|--------|---------|----------------|\n| 1 | Mandatory Clauses | ✅ Pass | All required clauses present | None |\n| 2 | Statutory References | ✅ Pass | IS/BIS standards cited | None |\n| 3 | Approvals & Signatures | ⚠️ Warning | 1 approval pending | Expedite pending approval |\n| 4 | Completeness | ✅ Pass | All annexures attached | None |\n| 5 | Expiry & Renewal | ❌ Fail | Certificate expired 2 months ago | Immediate renewal required |\n| 6 | Consistency | ✅ Pass | No contradictions found | None |\n| 7 | Risk Items | ✅ Pass | No unacceptable risk clauses | None |\n| 8 | Format Compliance | ✅ Pass | Follows standard template | None |\n| 9 | Data Protection | ⚠️ Warning | Privacy clause needs update | Update per latest DPDP Act |\n\n**Critical Gaps**: Item 5 requires immediate attention.`,

    workflow: `### Generated Artifact: Management Brief\n\n---\n**MANAGEMENT BRIEF**\n*Generated from: uploaded documents*\n*Department: ${deptLabel}*\n*Date: ${new Date().toISOString().split('T')[0]}*\n\n**1. Background**\nThis brief summarizes the key findings from the analyzed ${deptLabel.toLowerCase()} documents for leadership review.\n\n**2. Key Points**\n- 3 primary findings requiring management attention\n- 2 action items with assigned owners and deadlines\n- 1 risk area flagged for escalation\n\n**3. Recommendations**\n1. Approve proposed process improvement (estimated 15% efficiency gain)\n2. Allocate budget for identified compliance gap remediation\n3. Schedule quarterly review cycle\n\n**4. Required Decisions**\n- [ ] Approve budget allocation of INR 5L\n- [ ] Assign project sponsor for improvement initiative\n- [ ] Set review cadence (monthly/quarterly)\n\n---\n*This brief was auto-generated by Thermax Document Intelligence. [ASSUMPTION]: Timeline estimates are based on similar past initiatives.*`,
  };

  const opContent = opMocks[req.operation] ?? `### Analysis Complete\nThe ${opLabel} operation has been performed on the uploaded documents from the ${deptLabel} department.`;

  return `## Document Intelligence — ${opLabel}\n**Department**: ${deptLabel}\n**Documents Processed**: ${req.uploadedTexts?.length ?? 0}\n\n### Documents Analyzed\n${fileList}\n\n${opContent}\n\n---\n*Thermax Document Intelligence Hub — ${opLabel} operation completed successfully.*`;
}

export async function POST(req: NextRequest) {
  let body: DocIntelRequest;
  try {
    body = (await req.json()) as DocIntelRequest;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!body.operation) {
    return new Response('Missing operation', { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(body);

  const encoder = new TextEncoder();
  function sse(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  if (isMockMode()) {
    const readable = new ReadableStream({
      async start(controller) {
        const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
        const mockStart = Date.now();

        controller.enqueue(sse('tool_start', { tool: `doc_${body.operation}`, input: { operation: body.operation, department: body.department, documents: body.uploadedTexts?.length ?? 0 } }));
        await pause(800);
        controller.enqueue(sse('tool_result', { tool: `doc_${body.operation}`, result: `Operation ${body.operation} completed on ${body.uploadedTexts?.length ?? 0} document(s)` }));
        await pause(400);

        const mockText = buildMockOutput(body);
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
          tool_calls: 1,
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
        'X-Workbench-Mode': 'mock',
      },
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
          content: m.content,
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
            messages: conversationMessages,
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
          estimated_cost_usd: parseFloat(totalCost.toFixed(4)),
        }));

        controller.enqueue(sse('done', {}));
        controller.close();
      } catch (err) {
        console.error('Doc intelligence error:', err);
        controller.enqueue(sse('error', { message: err instanceof Error ? err.message : 'Unknown error' }));
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
      'X-Workbench-Model': getModelId(),
    },
  });
}
