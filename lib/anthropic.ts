import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local (local) or Vercel Environment Variables (production).'
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

export function getModelId(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
}
