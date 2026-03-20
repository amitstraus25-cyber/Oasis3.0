import type { ScoreEntry } from './types';

const LOCAL_KEY = 'nhi-fixer-scores';
const MAX_SCORES = 5;

function saveLocal(scores: ScoreEntry[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(scores.slice(0, MAX_SCORES)));
  } catch {}
}

function loadLocal(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoreEntry[];
  } catch {
    return [];
  }
}

function mergeScores(a: ScoreEntry[], b: ScoreEntry[]): ScoreEntry[] {
  const map = new Map<string, ScoreEntry>();
  for (const s of [...a, ...b]) {
    const key = `${s.name}|${s.time}|${s.fixes}|${s.date}`;
    if (!map.has(key)) map.set(key, s);
  }
  const all = Array.from(map.values());
  all.sort((x, y) => x.time - y.time || y.fixes - x.fixes);
  return all.slice(0, MAX_SCORES);
}

export async function fetchScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch('/api/scores');
    const server: ScoreEntry[] = res.ok ? await res.json() : [];
    const local = loadLocal();
    const merged = mergeScores(server, local);
    saveLocal(merged);
    return merged;
  } catch {
    return loadLocal();
  }
}

export async function submitScore(name: string, time: number, fixes: number): Promise<ScoreEntry[]> {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time, fixes }),
    });
    const data = res.ok ? await res.json() : { scores: [] };
    const server: ScoreEntry[] = data.scores || [];
    const local = loadLocal();
    const merged = mergeScores(server, local);
    saveLocal(merged);
    return merged;
  } catch {
    const entry: ScoreEntry = {
      name: name.slice(0, 16),
      time: Math.round(time * 100) / 100,
      fixes,
      date: new Date().toISOString().split('T')[0],
    };
    const local = loadLocal();
    const merged = mergeScores(local, [entry]);
    saveLocal(merged);
    return merged;
  }
}

export async function seedServer(): Promise<void> {
  const local = loadLocal();
  if (local.length === 0) return;
  try {
    const res = await fetch('/api/scores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(local),
    });
    if (res.ok) {
      const server: ScoreEntry[] = await res.json();
      const merged = mergeScores(server, local);
      saveLocal(merged);
    }
  } catch {}
}
