import { NextResponse } from 'next/server';

interface ScoreEntry {
  name: string;
  time: number;
  fixes: number;
  date: string;
}

const MAX_SCORES = 5;

// In-memory store (resets on cold start — suitable for demo/prototype)
let scores: ScoreEntry[] = [];

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

    scores.push(entry);
    // Sort by fastest time (lowest first), then most fixes
    scores.sort((a, b) => a.time - b.time || b.fixes - a.fixes);
    scores = scores.slice(0, MAX_SCORES);

    return NextResponse.json({ success: true, scores: scores.slice(0, MAX_SCORES) });
  } catch {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
