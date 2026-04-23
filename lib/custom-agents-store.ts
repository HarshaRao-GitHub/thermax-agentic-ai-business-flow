/**
 * Custom Agents Store — file-backed persistent storage for user-created standalone agents.
 * Agent definitions, base documents, and chat results are saved to a JSON file on disk
 * and survive server restarts.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export interface CustomAgentTask {
  id: string;
  label: string;
  description: string;
}

export interface BaseDocument {
  filename: string;
  text: string;
  sizeKb: number;
}

export interface CustomAgent {
  id: string;
  name: string;
  avatarUrl: string;
  description: string;
  instructions: string;
  tasks: CustomAgentTask[];
  baseDocuments: BaseDocument[];
  acceptedFiles: string;
  createdAt: string;
  lastUsedAt: string | null;
  runCount: number;
}

export interface CustomAgentChatResult {
  agentId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  usageStats: Record<string, unknown> | null;
  completedAt: string;
}

interface StoreData {
  agents: Record<string, CustomAgent>;
  chatResults: Record<string, CustomAgentChatResult>;
}

const DATA_DIR = path.join(process.cwd(), 'data', 'custom-agents');
const STORE_FILE = path.join(DATA_DIR, 'agents.json');

let loaded = false;
const agents = new Map<string, CustomAgent>();
const chatResults = new Map<string, CustomAgentChatResult>();

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromDisk(): void {
  if (loaded) return;
  loaded = true;
  ensureDir();
  if (!existsSync(STORE_FILE)) return;
  try {
    const raw = readFileSync(STORE_FILE, 'utf-8');
    const data: StoreData = JSON.parse(raw);
    if (data.agents) {
      for (const [id, agent] of Object.entries(data.agents)) {
        agents.set(id, agent);
      }
    }
    if (data.chatResults) {
      for (const [id, result] of Object.entries(data.chatResults)) {
        chatResults.set(id, result);
      }
    }
  } catch (err) {
    console.error('Failed to load custom agents store:', err);
  }
}

function saveToDisk(): void {
  ensureDir();
  const data: StoreData = {
    agents: Object.fromEntries(agents),
    chatResults: Object.fromEntries(chatResults)
  };
  try {
    writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save custom agents store:', err);
  }
}

export function createCustomAgent(input: {
  name: string;
  avatarUrl: string;
  description: string;
  instructions: string;
  tasks: CustomAgentTask[];
  baseDocuments: BaseDocument[];
  acceptedFiles: string;
}): CustomAgent {
  loadFromDisk();
  const id = `CAGT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const agent: CustomAgent = {
    id,
    name: input.name,
    avatarUrl: input.avatarUrl,
    description: input.description,
    instructions: input.instructions,
    tasks: input.tasks,
    baseDocuments: input.baseDocuments,
    acceptedFiles: input.acceptedFiles,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    runCount: 0
  };
  agents.set(id, agent);
  saveToDisk();
  return agent;
}

export function getCustomAgent(id: string): CustomAgent | undefined {
  loadFromDisk();
  return agents.get(id);
}

export function listCustomAgents(): CustomAgent[] {
  loadFromDisk();
  return Array.from(agents.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deleteCustomAgent(id: string): boolean {
  loadFromDisk();
  chatResults.delete(id);
  const deleted = agents.delete(id);
  if (deleted) saveToDisk();
  return deleted;
}

export function recordAgentRun(id: string): void {
  loadFromDisk();
  const agent = agents.get(id);
  if (agent) {
    agent.runCount++;
    agent.lastUsedAt = new Date().toISOString();
    saveToDisk();
  }
}

export function saveChatResult(agentId: string, result: Omit<CustomAgentChatResult, 'agentId'>): void {
  loadFromDisk();
  chatResults.set(agentId, { ...result, agentId });
  saveToDisk();
}

export function getChatResult(agentId: string): CustomAgentChatResult | undefined {
  loadFromDisk();
  return chatResults.get(agentId);
}

export function buildCustomAgentSystemPrompt(agent: CustomAgent): string {
  const taskList = agent.tasks.length
    ? agent.tasks.map((t, i) => `${i + 1}. **${t.label}**: ${t.description}`).join('\n')
    : 'Follow the instructions provided by the user.';

  const baseDocsBlock = agent.baseDocuments.length
    ? '\n\n--- BEGIN AGENT KNOWLEDGE BASE ---\n\n' +
      agent.baseDocuments.map(d =>
        `=== BASE DOCUMENT: ${d.filename} ===\n\n${d.text}\n\n=== END ===`
      ).join('\n\n') +
      '\n\n--- END AGENT KNOWLEDGE BASE ---'
    : '';

  return `You are "${agent.name}" — a custom AI agent created by the user.

## Your Purpose
${agent.description}

## Your Instructions
${agent.instructions}

## Your Tasks
${taskList}

## Accepted File Types
You are designed to process: ${agent.acceptedFiles || 'Any text-based documents.'}

IMPORTANT FILE RELEVANCE RULE:
If the user uploads documents, first assess whether each file is relevant to your purpose and accepted file types.
- If a file IS relevant: process and analyze it according to your instructions.
- If a file is NOT relevant: Do NOT process it. Respond with:

  ⚠️ **Unrelated Document Detected**
  The file "[filename]" does not appear to be relevant to my purpose as **${agent.name}**.

  **What I can process:**
  ${agent.acceptedFiles || 'Any text-based documents.'}

  Please upload documents that match my accepted file types.

## Output Guidelines
- Provide clear, structured, actionable outputs.
- Use tables, bullet points, and headings for readability.
- Clearly mark any assumptions with [ASSUMPTION] and any data gaps with [DATA GAP].
- Be thorough but concise — quality over quantity.${baseDocsBlock}`;
}
