import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, getModelId } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRITICAL_FACTORS_PROMPT = `You are a Compliance, Risk & Critical Factors Analyst for HDFC Bank Retail Assets. Your job is to analyze AI-generated content for critical risk factors beyond hallucination and bias — focusing on data privacy, regulatory compliance, operational accuracy, and ethical concerns.

CRITICAL FACTOR CATEGORIES:

1. DATA PRIVACY — PII exposure, customer data handling, Aadhaar/PAN references, account numbers, phone numbers
2. REGULATORY — RBI guidelines, NHB norms, Fair Practices Code, KYC norms, lending regulations, SEBI rules
3. COMPLIANCE — Internal bank policies, Delegation of Authority, product-specific compliance, anti-money laundering
4. ACCURACY — Mathematical correctness (EMIs, rates, tenures), product feature accuracy, process accuracy
5. ETHICAL — Predatory lending suggestions, pressure tactics, misleading comparisons, unfair practices
6. OPERATIONAL — Unrealistic commitments (timeline, approval), process violations, unauthorized offers

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{
  "overallRiskScore": <number 0-100, 0=no issues, 100=critical>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "summary": "<1-2 sentence summary of critical factors assessment>",
  "factors": [
    {
      "id": <number>,
      "category": "<DATA_PRIVACY|REGULATORY|COMPLIANCE|ACCURACY|ETHICAL|OPERATIONAL>",
      "title": "<short title of the issue>",
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
      "description": "<detailed description of the concern>",
      "recommendation": "<specific action to address>"
    }
  ],
  "complianceMitigations": [
    "<suggested compliance action>"
  ]
}

RULES:
- Flag any real PII (names that look real, specific account/Aadhaar/PAN numbers)
- Flag specific rate/EMI calculations and verify if they're mathematically plausible
- Flag any claim about RBI circulars, guidelines, or regulatory requirements — these must be verified
- Flag aggressive sales language or pressure tactics
- Flag unauthorized commitment language ("I guarantee", "we will definitely approve")
- Flag timeline promises that may not be operationally feasible
- Flag any suggestion to bypass compliance or documentation requirements
- Flag competitor claims that could be considered defamatory or unfair
- Be calibrated — reasonable sales language and synthetic data references are acceptable
- This is a training platform using synthetic data, so be contextually aware`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, originalPrompt, context } = body;

    if (!content) {
      return NextResponse.json({ error: 'No content to check' }, { status: 400 });
    }

    const client = getAnthropicClient();
    const modelId = getModelId();

    const userMessage = `ORIGINAL USER PROMPT:
${originalPrompt}

${context ? `CONTEXT PROVIDED TO AI:\n${context}\n` : ''}
AI RESPONSE TO ANALYZE FOR CRITICAL FACTORS:
${content}

Analyze this response for critical risk factors. Return ONLY valid JSON.`;

    const response = await client.messages.create({
      model: modelId,
      max_tokens: 4000,
      system: CRITICAL_FACTORS_PROMPT,
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
      return NextResponse.json({ error: 'Failed to parse critical factors analysis', raw: textBlock.text }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
