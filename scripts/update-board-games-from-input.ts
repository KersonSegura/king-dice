/**
 * Script to update board-games.ts from board-games-input.txt
 * This will replace the entire boardGames array with the processed games
 */

import fs from 'fs';
import path from 'path';
import { processBoardGamesFile } from './process-board-games';

// Read the current board-games.ts file
const boardGamesFilePath = path.join(process.cwd(), 'data', 'board-games.ts');
const inputFilePath = process.argv[2] || path.join(process.cwd(), 'data', 'board-games-input.txt');

console.log('📖 Reading games from:', inputFilePath);
const { games, errors } = processBoardGamesFile(inputFilePath);

console.log('\n📊 Results:');
console.log(`✅ Successfully processed: ${games.length} games`);
console.log(`⚠️ Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(err => console.log(`  - ${err}`));
}

if (games.length === 0) {
  console.log('\n❌ No games to process. Exiting.');
  process.exit(1);
}

// Read the current board-games.ts to preserve imports and helper functions
const currentContent = fs.readFileSync(boardGamesFilePath, 'utf-8');

// Extract the imports and helper functions (everything before export const boardGames)
const beforeBoardGames = currentContent.split('export const boardGames: BoardGame[] = [')[0];

// Generate the new boardGames array
let newBoardGamesArray = 'export const boardGames: BoardGame[] = [\n';
games.forEach((game, index) => {
  const gameId = game.id || `game-${index + 1}`;
  const imageUrl = game.imageUrl || `/games/${gameId.toLowerCase().replace(/\s+/g, '-')}.jpg`;
  
  newBoardGamesArray += '  {\n';
  newBoardGamesArray += `    id: '${gameId}',\n`;
  newBoardGamesArray += `    name: '${game.name.replace(/'/g, "\\'")}',\n`;
  newBoardGamesArray += `    description: '${(game.description || `Experience ${game.name}, a board game that brings friends and family together for hours of fun and strategic gameplay.`).replace(/'/g, "\\'")}',\n`;
  newBoardGamesArray += `    imageUrl: '${imageUrl}',\n`;
  newBoardGamesArray += `    amazonUrl: ${game.asin ? `createAmazonLink('${game.asin}')` : `'${game.amazonUrl || ''}'`},\n`;
  if (game.asin) {
    newBoardGamesArray += `    asin: '${game.asin}',\n`;
  }
  newBoardGamesArray += `    price: '$0.00', // TODO: Update with current price from Amazon\n`;
  if (game.originalPrice) {
    newBoardGamesArray += `    originalPrice: '${game.originalPrice}',\n`;
  }
  if (game.rating) {
    newBoardGamesArray += `    rating: ${game.rating},\n`;
  }
  if (game.players) {
    newBoardGamesArray += `    players: '${game.players}',\n`;
  }
  if (game.playTime) {
    newBoardGamesArray += `    playTime: '${game.playTime}',\n`;
  }
  if (game.category) {
    newBoardGamesArray += `    category: '${game.category}',\n`;
  }
  if (game.ageRange) {
    newBoardGamesArray += `    ageRange: '${game.ageRange}',\n`;
  }
  newBoardGamesArray += `    lastPriceUpdate: new Date().toISOString()\n`;
  newBoardGamesArray += '  }';
  if (index < games.length - 1) {
    newBoardGamesArray += ',';
  }
  newBoardGamesArray += '\n';
});
newBoardGamesArray += '];\n';

// Extract everything after the boardGames array (helper functions)
const afterBoardGames = currentContent.split('];')[1] || '';

// Combine everything
const newContent = beforeBoardGames + newBoardGamesArray + afterBoardGames;

// Write the updated file
fs.writeFileSync(boardGamesFilePath, newContent, 'utf-8');

console.log(`\n✅ Updated ${boardGamesFilePath} with ${games.length} games`);
console.log('\n💡 Next steps:');
console.log('  1. Update prices manually or via API');
console.log('  2. Add Amazon product images (copy image URLs from Amazon product pages)');
console.log('  3. Verify all ASINs are correct');

