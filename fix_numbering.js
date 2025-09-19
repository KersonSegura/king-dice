const fs = require('fs');

// Read the file
const content = fs.readFileSync('image-mode-games-list.txt', 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

// Process each line to match the list number with the image filename number
const correctedLines = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(' -> ')) {
        // Extract game name and current image filename
        const match = line.match(/^\d+\.\s*(.+?)\s*->/);
        const imagePart = line.split(' -> ')[1];
        
        if (match) {
            const gameName = match[1];
            const listNumber = String(i + 1).padStart(3, '0'); // 001, 002, 003, etc.
            
            // Extract the original image extension and base name
            const imageMatch = imagePart.match(/^\d+-(.+)$/);
            if (imageMatch) {
                const imageBaseName = imageMatch[1]; // everything after the original number
                const newImageName = `${listNumber}-${imageBaseName}`;
                correctedLines.push(`${listNumber}. ${gameName} -> ${newImageName}`);
            } else {
                // Fallback if image doesn't match expected pattern
                correctedLines.push(`${listNumber}. ${gameName} -> ${imagePart}`);
            }
        }
    }
}

// Write the corrected file
const correctedContent = correctedLines.join('\n');
fs.writeFileSync('image-mode-games-list.txt', correctedContent);

console.log(`Fixed numbering for ${correctedLines.length} games - list numbers now match image filename numbers`);
