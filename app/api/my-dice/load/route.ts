import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function ensureDataFile(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'my-dice.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: {} }, null, 2));
  return file;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const file = ensureDataFile();
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { users: Record<string, any> };

    // Get user's dice configuration or return default
    const userConfig = data.users[userId];
    
    if (userConfig) {
      return NextResponse.json({ 
        config: userConfig.config,
        updatedAt: userConfig.updatedAt
      });
    } else {
      // Return default configuration for new users
      const defaultConfig = {
        background: "/dice/backgrounds/WhiteBackground.svg",
        dice: "/dice/dice/WhiteDice.svg",
        pattern: "/dice/patterns/1-2-3.svg",
        accessories: null,
        hat: null,
        item: null,
        companion: null,
        title: null
      };
      
      return NextResponse.json({ 
        config: defaultConfig,
        updatedAt: null
      });
    }
  } catch (error) {
    console.error('Error loading dice configuration:', error);
    return NextResponse.json({ error: 'Failed to load dice configuration' }, { status: 500 });
  }
}
