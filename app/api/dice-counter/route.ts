import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const counterFile = path.join(dataDir, 'dice-counter.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize counter file if it doesn't exist
if (!fs.existsSync(counterFile)) {
  const initialData = { counter: 0 };
  fs.writeFileSync(counterFile, JSON.stringify(initialData, null, 2));
}

// GET: Get the current counter value
export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
    return NextResponse.json({ counter: data.counter });
  } catch (error) {
    console.error('Error reading dice counter:', error);
    return NextResponse.json({ error: 'Failed to read counter' }, { status: 500 });
  }
}

// POST: Increment and return the next counter value
export async function POST() {
  try {
    const data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
    data.counter += 1;
    
    fs.writeFileSync(counterFile, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      counter: data.counter,
      diceName: `Dice ${data.counter.toString().padStart(6, '0')}`
    });
  } catch (error) {
    console.error('Error updating dice counter:', error);
    return NextResponse.json({ error: 'Failed to update counter' }, { status: 500 });
  }
}
