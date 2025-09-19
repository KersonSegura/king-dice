import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface SharePayload {
  userId: string;
  title?: string;
  config: Record<string, string | null>;
}

function ensureDataFile(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'dice-shares.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ shares: [] }, null, 2));
  return file;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SharePayload;
    if (!body || !body.userId || !body.config) {
      return NextResponse.json({ error: 'Missing userId or config' }, { status: 400 });
    }

    const file = ensureDataFile();
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { shares: any[] };

    const entry = {
      id: `share_${Date.now()}`,
      userId: body.userId,
      title: body.title || 'My Dice',
      config: body.config,
      createdAt: new Date().toISOString(),
      votes: { upvotes: 0, downvotes: 0 },
    };

    data.shares.unshift(entry);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    return NextResponse.json({ ok: true, share: entry });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to share dice' }, { status: 500 });
  }
}
