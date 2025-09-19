import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface SavePayload {
  userId: string;
  config: Record<string, string | null>;
}

function ensureDataFile(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'my-dice.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: {} }, null, 2));
  return file;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SavePayload;
    if (!body || !body.userId || !body.config) {
      return NextResponse.json({ error: 'Missing userId or config' }, { status: 400 });
    }

    const file = ensureDataFile();
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { users: Record<string, any> };

    data.users[body.userId] = {
      config: body.config,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save dice' }, { status: 500 });
  }
}
