const fs = require('fs');

// Read the current sorted file
const content = fs.readFileSync('image-mode-games-list.txt', 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

// Extract games and their original image numbers
const games = [];
for (const line of lines) {
    if (line.includes(' -> ')) {
        const match = line.match(/^\d+\.\s*(.+?)\s*->/);
        const imageMatch = line.match(/-> (\d+)-/);
        if (match && imageMatch) {
            const gameName = match[1];
            const originalNumber = parseInt(imageMatch[1]);
            games.push({ name: gameName, originalNumber: originalNumber, line: line });
        }
    }
}

// Sort by original image number to restore original order
games.sort((a, b) => a.originalNumber - b.originalNumber);

// Write restored file with original numbering
const restoredContent = games.map((game, index) => {
    const imagePart = game.line.split(' -> ')[1];
    return `${String(game.originalNumber).padStart(3, '0')}. ${game.name} -> ${imagePart}`;
}).join('\n');

fs.writeFileSync('image-mode-games-list.txt', restoredContent);

console.log(`Restored original order of ${games.length} games`);
