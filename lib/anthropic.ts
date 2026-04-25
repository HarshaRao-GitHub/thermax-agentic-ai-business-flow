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
  client = new Anthropic({ apiKey, maxRetries: 5 });
  return client;
}

export function getModelId(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
}

const RETRY_DELAYS = [2000, 4000, 8000, 16000, 30000];

function isRetryableError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return err.status != null && [429, 500, 502, 503, 529].includes(err.status);
  }
  if (err instanceof Error && (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT') || err.message.includes('fetch failed'))) {
    return true;
  }
  return false;
}

export async function callWithRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, maxAttempts: number, err: Error) => void
): Promise<T> {
  const maxAttempts = RETRY_DELAYS.length + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts || !isRetryableError(err)) {
        throw err;
      }
      const delay = RETRY_DELAYS[attempt - 1];
      if (onRetry) {
        onRetry(attempt, maxAttempts, err instanceof Error ? err : new Error(String(err)));
      }
      console.warn(`Anthropic API attempt ${attempt}/${maxAttempts} failed (${err instanceof Anthropic.APIError ? err.status : 'network'}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
