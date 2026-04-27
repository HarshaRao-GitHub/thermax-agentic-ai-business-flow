/**
 * Chat History Persistence — localStorage-based chat history for all AI chat interfaces.
 * Provides save/load/clear with SSR safety, size limits, and error handling.
 */

const PREFIX = 'thermax_chat_';
const MAX_MESSAGES_PER_KEY = 200;
const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4 MB safety limit per key

export interface PersistedMessage {
  role: 'user' | 'assistant';
  content: string;
}

function isSSR(): boolean {
  return typeof window === 'undefined';
}

export function saveChatHistory(key: string, messages: PersistedMessage[]): void {
  if (isSSR()) return;
  try {
    const trimmed = messages.slice(-MAX_MESSAGES_PER_KEY);
    const json = JSON.stringify(trimmed);
    if (json.length > MAX_STORAGE_BYTES) {
      const half = Math.floor(trimmed.length / 2);
      localStorage.setItem(PREFIX + key, JSON.stringify(trimmed.slice(half)));
    } else {
      localStorage.setItem(PREFIX + key, json);
    }
  } catch {
    // Storage full or unavailable
  }
}

export function loadChatHistory(key: string): PersistedMessage[] {
  if (isSSR()) return [];
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: unknown) =>
        m &&
        typeof m === 'object' &&
        'role' in (m as Record<string, unknown>) &&
        'content' in (m as Record<string, unknown>) &&
        ((m as PersistedMessage).role === 'user' || (m as PersistedMessage).role === 'assistant')
    );
  } catch {
    return [];
  }
}

export function clearChatHistory(key: string): void {
  if (isSSR()) return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function hasChatHistory(key: string): boolean {
  if (isSSR()) return false;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return !!raw && raw.length > 2;
  } catch {
    return false;
  }
}

/**
 * Storage keys for each chat interface.
 * AgentChat uses its own persistence via client-store.ts — not included here.
 */
export const CHAT_KEYS = {
  DOC_INTELLIGENCE: 'doc_intelligence',
  PROMPT_PLAYGROUND: 'prompting',
  ENGINEERING_DESIGN: 'eng_design',
  ASSET_PERFORMANCE: 'asset_perf',
  TENDER_INTELLIGENCE: 'tender',
  customAgent: (agentId: string) => `custom_agent_${agentId}`,
} as const;
