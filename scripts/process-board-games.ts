/**
 * Script to process board games from a .txt file
 * 
 * Expected format in .txt file (one game per line):
 * Game Name|Amazon URL|Category (optional)|Players (optional)|PlayTime (optional)
 * 
 * Example:
 * Catan|https://www.amazon.com/dp/B0DYK1ZH2D?tag=kingdice-20|Strategy|3-4|60-90 min
 * Ticket to Ride|https://www.amazon.com/dp/ASIN?tag=kingdice-20|Family|2-5|30-60 min
 */

import fs from 'fs';
import path from 'path';

interface GameInput {
  name: string;
  amazonUrl: string;
  category?: string;
  players?: string;
  playTime?: string;
  ageRange?: string;
}

function extractASIN(url: string): string | null {
  // Extract ASIN from Amazon URL
  // Format: amazon.com/dp/ASIN or amazon.com/product/ASIN
  const match = url.match(/\/dp\/([A-Z0-9]{10})/);
  if (match) return match[1];
  
  // Try alternative format
  const match2 = url.match(/\/product\/([A-Z0-9]{10})/);
  if (match2) return match2[1];
  
  return null;
}

function parseGameLine(line: string): GameInput | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null; // Skip empty lines and comments
  
  const parts = trimmed.split('|').map(p => p.trim());
  
  if (parts.length < 2) {
    console.warn(`⚠️ Invalid line format: ${trimmed}`);
    return null;
  }
  
  // Format: Game Name|Amazon URL|Category|Players|PlayTime (AgeRange is optional)
  const [name, amazonUrl, category, players, playTime, ageRange] = parts;
  
  return {
    name,
    amazonUrl,
    category: category || undefined,
    players: players || undefined,
    playTime: playTime || undefined,
    ageRange: ageRange || undefined, // Optional
  };
}

function generateGameId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function generateImagePath(name: string): string {
  const imageName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/games/${imageName}.jpg`;
}

function generateDescription(name: string, category?: string): string {
  // Generate a basic description - you can customize this
  const categoryText = category ? ` ${category.toLowerCase()}` : '';
  return `Experience ${name}, a${categoryText} board game that brings friends and family together for hours of fun and strategic gameplay.`;
}

export function processBoardGamesFile(filePath: string): {
  games: Array<GameInput & { id: string; asin: string | null; imageUrl: string; description: string }>;
  errors: string[];
} {
  const errors: string[] = [];
  const games: Array<GameInput & { id: string; asin: string | null; imageUrl: string; description: string }> = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const gameData = parseGameLine(line);
      
      if (!gameData) continue;
      
      const asin = extractASIN(gameData.amazonUrl);
      if (!asin) {
        errors.push(`Line ${i + 1}: Could not extract ASIN from URL: ${gameData.amazonUrl}`);
        continue;
      }
      
      const id = generateGameId(gameData.name);
      const imageUrl = generateImagePath(gameData.name);
      const description = generateDescription(gameData.name, gameData.category);
      
      games.push({
        ...gameData,
        id,
        asin,
        imageUrl,
        description,
      });
    }
    
    console.log(`✅ Processed ${games.length} games`);
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} errors found`);
    }
    
  } catch (error) {
    console.error('❌ Error reading file:', error);
    errors.push(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return { games, errors };
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2] || path.join(process.cwd(), 'data', 'board-games-input.txt');
  
  console.log(`📖 Reading games from: ${filePath}`);
  const { games, errors } = processBoardGamesFile(filePath);
  
  console.log('\n📊 Results:');
  console.log(`✅ Successfully processed: ${games.length} games`);
  console.log(`⚠️ Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n🎮 Games:');
  games.forEach(game => {
    console.log(`  - ${game.name} (ASIN: ${game.asin})`);
  });
  
  // Generate TypeScript code
  console.log('\n📝 Generated TypeScript code:\n');
  console.log('export const boardGames: BoardGame[] = [');
  games.forEach((game, index) => {
    const comma = index < games.length - 1 ? ',' : '';
    console.log(`  {`);
    console.log(`    id: '${game.id}',`);
    console.log(`    name: '${game.name.replace(/'/g, "\\'")}',`);
    console.log(`    description: '${game.description.replace(/'/g, "\\'")}',`);
    console.log(`    imageUrl: '${game.imageUrl}',`);
    console.log(`    amazonUrl: createAmazonLink('${game.asin}'),`);
    console.log(`    asin: '${game.asin}',`);
    if (game.category) console.log(`    category: '${game.category}',`);
    if (game.players) console.log(`    players: '${game.players}',`);
    if (game.playTime) console.log(`    playTime: '${game.playTime}',`);
    if (game.ageRange) console.log(`    ageRange: '${game.ageRange}',`);
    console.log(`    price: '$0.00', // TODO: Update with current price from Amazon`);
    console.log(`  }${comma}`);
  });
  console.log('];');
  console.log('\n💡 Tip: Use scripts/process-board-games-to-db.ts to automatically add games to the database!');
}

