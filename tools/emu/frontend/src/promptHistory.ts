// Per-session prompt history, stored in localStorage. This is a UI convenience
// (a trail of prompts the engineer has copied), never part of the session JSON
// audit artifact. Degrades to in-memory if localStorage is unavailable.

export type PromptHistoryEntry = {
  prompt: string;
  source: string;
  at: string;
};

const KEY_PREFIX = 'emu:prompt-history:';
const MAX_ENTRIES = 50;
const memory = new Map<string, PromptHistoryEntry[]>();

function key(sessionPath: string): string {
  return KEY_PREFIX + sessionPath;
}

export function readHistory(sessionPath: string): PromptHistoryEntry[] {
  try {
    const raw = localStorage.getItem(key(sessionPath));
    return raw ? (JSON.parse(raw) as PromptHistoryEntry[]) : [];
  } catch {
    return memory.get(sessionPath) ?? [];
  }
}

export function recordPrompt(sessionPath: string, prompt: string, source: string): PromptHistoryEntry[] {
  const history = readHistory(sessionPath);
  // De-dupe an immediate repeat of the same prompt.
  if (history[0]?.prompt === prompt) return history;

  const next = [{ prompt, source, at: new Date().toISOString() }, ...history].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(key(sessionPath), JSON.stringify(next));
  } catch {
    memory.set(sessionPath, next);
  }
  return next;
}

export function clearHistory(sessionPath: string): void {
  try {
    localStorage.removeItem(key(sessionPath));
  } catch {
    memory.delete(sessionPath);
  }
}
