import type { ScoreEntry } from './types';

export async function fetchScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch('/api/scores');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitScore(name: string, time: number, fixes: number): Promise<ScoreEntry[]> {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time, fixes }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.scores || [];
  } catch {
    return [];
  }
}
