import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface ScoreEntry {
  name: string;
  time: number;
  fixes: number;
  date: string;
}

const MAX_SCORES = 5;
const KV_KEY = 'nhi-fixer-scores';

export async function GET() {
  try {
    const scores = await kv.get<ScoreEntry[]>(KV_KEY) || [];
    return NextResponse.json(scores.slice(0, MAX_SCORES));
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

    const scores = await kv.get<ScoreEntry[]>(KV_KEY) || [];
    scores.push(entry);
    scores.sort((a, b) => a.time - b.time || b.fixes - a.fixes);
    const top = scores.slice(0, MAX_SCORES);
    await kv.set(KV_KEY, top);

    return NextResponse.json({ success: true, scores: top });
  } catch {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
