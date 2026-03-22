import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

interface ScoreEntry {
  name: string;
  time: number;
  fixes: number;
  date: string;
}

const MAX_SCORES = 5;
const REDIS_KEY = 'nhi-fixer-scores';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function getScores(): Promise<ScoreEntry[]> {
  const data = await redis.get<ScoreEntry[]>(REDIS_KEY);
  return data ?? [];
}

async function saveScores(scores: ScoreEntry[]): Promise<void> {
  await redis.set(REDIS_KEY, scores.slice(0, MAX_SCORES));
}

function mergeAndSort(existing: ScoreEntry[], incoming: ScoreEntry[]): ScoreEntry[] {
  const map = new Map<string, ScoreEntry>();
  for (const s of [...existing, ...incoming]) {
    const key = `${s.name}|${s.time}|${s.fixes}|${s.date}`;
    if (!map.has(key)) map.set(key, s);
  }
  const all = Array.from(map.values());
  all.sort((a, b) => a.time - b.time || b.fixes - a.fixes);
  return all.slice(0, MAX_SCORES);
}

export async function GET() {
  try {
    const scores = await getScores();
    return NextResponse.json(scores);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, time, fixes } = body;

    if (!name || typeof time !== 'number' || typeof fixes !== 'number') {
      return NextResponse.json({ error: 'Invalid score data' }, { status: 400 });
    }

    const entry: ScoreEntry = {
      name: String(name).slice(0, 16),
      time: Math.round(time * 100) / 100,
      fixes,
      date: new Date().toISOString().split('T')[0],
    };

    const existing = await getScores();
    const merged = mergeAndSort(existing, [entry]);
    await saveScores(merged);

    return NextResponse.json({ success: true, scores: merged });
  } catch {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const incoming: ScoreEntry[] = Array.isArray(body) ? body : [];
    const existing = await getScores();
    const merged = mergeAndSort(existing, incoming);
    await saveScores(merged);
    return NextResponse.json(merged);
  } catch {
    const scores = await getScores().catch(() => []);
    return NextResponse.json(scores);
  }
}
