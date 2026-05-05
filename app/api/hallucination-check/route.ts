import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, getModelId } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface HallucinationRequest {
  content: string;
  originalPrompt: string;
  context?: string;
}

const HALLUCINATION_CHECK_PROMPT = `You are a Hallucination Detection & Verification AI for Thermax — an industrial energy and environment solutions company (boilers, heaters, chillers, water treatment, chemicals, EPC projects). Your job is to analyze an AI-generated response and identify potential hallucinations, unverifiable claims, and factual risks.

ANALYSIS FRAMEWORK:
1. Extract every factual claim from the response
2. Classify each claim's verifiability and risk level
3. Provide an overall hallucination risk score
4. Generate specific mitigation actions

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{
  "overallRiskScore": <number 0-100, where 0=no risk, 100=highly hallucinated>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "summary": "<1-2 sentence summary of hallucination risk>",
  "claims": [
    {
      "id": <number>,
      "text": "<the specific claim from the response>",
      "category": "<STATISTIC|TECHNICAL_SPEC|PROCESS_CLAIM|VENDOR_INFO|TIMELINE|COST_DATA|SAFETY_CLAIM|RECOMMENDATION|OTHER>",
      "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
      "riskReason": "<why this claim might be hallucinated>",
      "verificationStatus": "<LIKELY_ACCURATE|UNVERIFIABLE|LIKELY_INACCURATE|FABRICATED>",
      "groundedIn": "<what data/context supports this claim, or 'No source available'>"
    }
  ],
  "mitigationPlan": {
    "immediateActions": [
      "<specific action to verify or fix a claim>"
    ],
    "removalCandidates": [
      "<claims that should be removed if unverifiable>"
    ],
    "regenerationInstructions": "<if regenerating, what constraints to add to reduce hallucination>",
    "groundingSuggestions": [
      "<suggest data sources or documents to ground the response>"
    ]
  },
  "confidenceFactors": {
    "dataGrounding": <0-100, how well-grounded in provided data>,
    "logicalConsistency": <0-100, internal logical consistency>,
    "specificityCheck": <0-100, are specific numbers/names verifiable>,
    "contextAlignment": <0-100, alignment with original prompt context>
  }
}

RULES:
- Be thorough but not paranoid — synthetic data scenarios are expected in training contexts
- Flag specific technical parameters (temperatures, pressures, efficiencies) that aren't from provided documents
- Flag vendor/supplier claims that could be fabricated
- Flag timeline and cost estimates without clear basis
- Flag safety-critical claims that could cause operational issues if wrong
- Flag process/procedure claims not from official Thermax documentation
- Be lenient on general engineering knowledge and reasonable recommendations
- Consider the context: if data was provided (documents uploaded), claims referencing that data are grounded
- Technical specifications (boiler capacity, chiller COP, water treatment flow rates) should be flagged unless from uploaded data`;

export async function POST(request: NextRequest) {
  try {
    const body: HallucinationRequest = await request.json();
    const { content, originalPrompt, context } = body;

    if (!content) {
      return NextResponse.json({ error: 'No content to check' }, { status: 400 });
    }

    const client = getAnthropicClient();
    const modelId = getModelId();

    const userMessage = `ORIGINAL USER PROMPT:
${originalPrompt}

${context ? `CONTEXT PROVIDED TO AI:\n${context}\n` : ''}
AI RESPONSE TO ANALYZE:
${content}

Analyze this response for hallucination risk. Return ONLY valid JSON.`;

    const response = await client.messages.create({
      model: modelId,
      max_tokens: 4000,
      system: HALLUCINATION_CHECK_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let parsed;
    try {
      const jsonStr = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'Failed to parse hallucination analysis', raw: textBlock.text }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
