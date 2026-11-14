import * as SecureStore from 'expo-secure-store';

/**
 * Remembers which tasks the user has already given video feedback on, so the "Helpful?" prompt
 * is shown only once per task (survives list re-renders, screen focus, and app restarts).
 * Backed by the existing expo-secure-store; one key holds a JSON array of task ids.
 */
const KEY = 'videoFeedbackVotedTaskIds';

let cache: Set<string> | null = null;

async function load(): Promise<Set<string>> {
  if (cache) return cache;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cache = new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    cache = new Set<string>();
  }
  return cache;
}

/** Whether the user already voted on this task's video. */
export async function hasVotedForTask(taskId: string): Promise<boolean> {
  const voted = await load();
  return voted.has(taskId);
}

/** Record that the user voted on this task's video (idempotent). */
export async function markVotedForTask(taskId: string): Promise<void> {
  const voted = await load();
  if (voted.has(taskId)) return;
  voted.add(taskId);
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify([...voted]));
  } catch {
    // Best-effort; in-memory cache still prevents a repeat within the session.
  }
}
