const fs = require('fs');

// Read the file
const content = fs.readFileSync('image-mode-games-list.txt', 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

// Extract game names and image filenames
const games = [];
for (const line of lines) {
    if (line.includes(' -> ')) {
        // Extract game name (everything after the number and before ' -> ')
        const match = line.match(/^\d+\.\s*(.+?)\s*->/);
        const imagePart = line.split(' -> ')[1];
        if (match) {
            const gameName = match[1];
            games.push({ name: gameName, image: imagePart });
        }
    }
}

// Sort by game name (case insensitive)
games.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

// Write sorted file with sequential numbering 001, 002, 003...
const sortedContent = games.map((game, index) => {
    const number = String(index + 1).padStart(3, '0');
    return `${number}. ${game.name} -> ${game.image}`;
}).join('\n');

fs.writeFileSync('image-mode-games-list.txt', sortedContent);

console.log(`Sorted ${games.length} games alphabetically with sequential numbering`);
