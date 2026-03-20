import { NextResponse } from 'next/server';

interface ScoreEntry {
  name: string;
  time: number;
  fixes: number;
  date: string;
}

const MAX_SCORES = 5;

let scores: ScoreEntry[] = [];

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
  return NextResponse.json(scores.slice(0, MAX_SCORES));
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

    scores = mergeAndSort(scores, [entry]);

    return NextResponse.json({ success: true, scores: scores.slice(0, MAX_SCORES) });
  } catch {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const incoming: ScoreEntry[] = Array.isArray(body) ? body : [];
    if (incoming.length > 0) {
      scores = mergeAndSort(scores, incoming);
    }
    return NextResponse.json(scores.slice(0, MAX_SCORES));
  } catch {
    return NextResponse.json(scores.slice(0, MAX_SCORES));
  }
}
