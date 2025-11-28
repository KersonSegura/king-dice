/**
 * Script to parse LevelUnlocks.txt and generate the asset level requirements
 * This ensures the code matches the LevelUnlocks.txt file
 */

const fs = require('fs');
const path = require('path');

const LEVEL_UNLOCKS_FILE = path.join(__dirname, '..', 'public', 'dice', 'LevelUnlocks.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'lib', 'dice-asset-levels.ts');

// Level name mapping
const LEVEL_NAMES = {
  1: 'Commoner',
  2: 'Squire',
  3: 'Knight',
  4: 'Champion',
  5: 'Baron/Baroness',
  6: 'Lord/Lady',
  7: 'Archmage',
  8: 'Duke/Duchess',
  9: 'Prince',
  10: 'King/Queen'
};

// Category mapping from LevelUnlocks.txt to code keys
const CATEGORY_MAP = {
  'Background': 'backgrounds',
  'Dice': 'dice',
  'Pattern': 'patterns',
  'Accessories': 'accessories',
  'Crowns & Hats': 'Crowns & Hats',
  'Item': 'items',
  'Companion': 'companions',
  'Title': 'titles'
};

function normalizeAssetName(name, category) {
  // Remove common suffixes and normalize
  let normalized = name.trim();
  
  // Handle special cases first (before any processing)
  if (category === 'Crowns & Hats') {
    if (normalized === "Prince's Crown") return 'PrincesCrown';
    if (normalized === "Queen's Crown") return 'QueensCrown';
    if (normalized === "King's Crown") return 'KingsCrown';
  }
  if (category === 'accessories') {
    if (normalized === "King's Cape") return 'KingsCape';
  }
  if (category === 'items') {
    if (normalized === "Card Castle") return 'CardCastle';
    if (normalized === "Poker Chips") return 'PokerChips';
    if (normalized === "Mana Potion") return 'ManaPotion';
    if (normalized === "Health Potion") return 'HealthPotion';
    if (normalized === "Holy Grail") return 'HolyGrail';
    if (normalized === "King's Card") return 'KingsCard';
  }
  if (category === 'companions') {
    if (normalized === "Jack in the box") return 'JackInTheBox';
    if (normalized === "Chess Knight") return 'ChessKnight';
    if (normalized === "Dice-Skull") return 'Dice-Skull';
    if (normalized === "Eight Ball") return 'EightBall';
    if (normalized === "Mini-Dice") return 'Mini-Dice';
    if (normalized === "Dice-Bot") return 'Dice-Bot';
  }
  if (category === 'patterns') {
    // Patterns: remove spaces, keep as-is mostly
    return normalized.replace(/\s+/g, '');
  }
  
  // Handle "Game Board" -> "GameBoard" for backgrounds
  if (category === 'backgrounds' && normalized === "Game Board") {
    return 'GameBoardBackground';
  }
  if (category === 'backgrounds' && normalized === "Chess Board") {
    return 'ChessBoardBackground';
  }
  if (category === 'backgrounds' && normalized === "Card Game") {
    return 'CardGameBackground';
  }
  
  // Convert to PascalCase
  normalized = normalized
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  // Add category suffix for backgrounds and dice
  if (category === 'backgrounds') {
    normalized = normalized + 'Background';
  } else if (category === 'dice') {
    normalized = normalized + 'Dice';
  }
  
  return normalized;
}

function parseLevelUnlocks(content) {
  const requirements = {
    backgrounds: {},
    dice: {},
    patterns: {},
    accessories: {},
    'Crowns & Hats': {},
    items: {},
    companions: {},
    titles: {}
  };
  
  const lines = content.split('\n');
  let currentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for level header
    const levelMatch = line.match(/Unlocks at Level (\d+):/i);
    if (levelMatch) {
      currentLevel = parseInt(levelMatch[1]);
      continue;
    }
    
    // Skip special objects section
    if (line.startsWith('Special objects:') || line.startsWith('Special Objects:')) {
      break;
    }
    
    // Parse category line
    for (const [txtCategory, codeCategory] of Object.entries(CATEGORY_MAP)) {
      // Match "Category -" or "Category:" format
      const categoryPattern = new RegExp(`^${txtCategory}\\s*-`, 'i');
      if (categoryPattern.test(line)) {
        const itemsStr = line.substring(line.indexOf('-') + 1).trim();
        // Split by comma, clean up each item, and remove trailing periods
        const items = itemsStr
          .split(',')
          .map(item => item.trim().replace(/\.$/, '')) // Remove trailing periods
          .filter(item => item && item !== 'None' && item.length > 0);
        
        for (const item of items) {
          const normalizedName = normalizeAssetName(item, codeCategory);
          
          // Only set if not already set (first level it appears)
          if (!requirements[codeCategory][normalizedName]) {
            requirements[codeCategory][normalizedName] = {
              level: currentLevel,
              levelName: LEVEL_NAMES[currentLevel] || 'Unknown',
              description: `${item} - unlocks at level ${currentLevel}`
            };
          }
        }
        break;
      }
    }
  }
  
  // Handle special objects
  let inSpecialSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Special objects:') || line.startsWith('Special Objects:')) {
      inSpecialSection = true;
      continue;
    }
    
    if (inSpecialSection && line) {
      // Parse special items
      if (line.includes('Gift Dice')) {
        requirements.dice['GiftDice'] = { level: 0, levelName: 'Special', description: 'Gift dice - only unlockable by donating to the page' };
      }
      if (line.includes('Dice-Bot Dice')) {
        requirements.dice['Dice-BotDice'] = { level: 0, levelName: 'Special', description: 'Dice-Bot dice - only unlockable by donating to the page' };
      }
      if (line.includes("King's Room Background")) {
        requirements.backgrounds['KingsRoomBackground'] = { level: 0, levelName: 'Special', description: "King's Room background - only unlockable by winning Dice of the Week (Dice Throne in gallery)" };
      }
      if (line.includes("King's Card Item")) {
        requirements.items['KingsCard'] = { level: 0, levelName: 'Special', description: "King's Card - only unlockable by winning Card of the Week (The King's Card in gallery)" };
      }
      if (line.includes('Dice-Bot Companion') && line.includes('Level 10')) {
        // Already handled in companions above
      }
    }
  }
  
  return requirements;
}

function generateTypeScriptFile(requirements) {
  let output = `// Level requirements for dice assets
// Higher level items are more exclusive and prestigious
// This file is auto-generated from LevelUnlocks.txt
// To update, run: node scripts/parse-level-unlocks.js

export interface AssetLevelRequirement {
  level: number;
  levelName: string;
  description: string;
}

// Define level requirements for each asset category
export const ASSET_LEVEL_REQUIREMENTS: Record<string, Record<string, AssetLevelRequirement>> = {
`;

  // Generate each category
  for (const [category, assets] of Object.entries(requirements)) {
    const categoryKey = category === 'Crowns & Hats' ? "'Crowns & Hats'" : category;
    output += `  // ${category.charAt(0).toUpperCase() + category.slice(1)} - Progressive unlock order\n`;
    output += `  ${categoryKey}: {\n`;
    
    // Sort assets by level, then by name
    const sortedAssets = Object.entries(assets).sort((a, b) => {
      if (a[1].level !== b[1].level) return a[1].level - b[1].level;
      return a[0].localeCompare(b[0]);
    });
    
    for (const [assetName, requirement] of sortedAssets) {
      const levelName = requirement.levelName.replace(/'/g, "\\'");
      const description = requirement.description.replace(/'/g, "\\'");
      output += `    '${assetName}': { level: ${requirement.level}, levelName: '${levelName}', description: '${description}' },\n`;
    }
    
    output += `  },\n\n`;
  }
  
  output += `};

// Helper function to get level requirement for an asset
export function getAssetLevelRequirement(category: string, assetName: string): AssetLevelRequirement | null {
  const categoryRequirements = ASSET_LEVEL_REQUIREMENTS[category];
  if (!categoryRequirements) return null;
  
  return categoryRequirements[assetName] || null;
}

// Helper function to check if user can access an asset
export function canUserAccessAsset(userLevel: number, category: string, assetName: string): boolean {
  const requirement = getAssetLevelRequirement(category, assetName);
  if (!requirement) return true; // If no requirement defined, allow access
  
  return userLevel >= requirement.level;
}

// Helper function to get all assets available to a user at their level
export function getAvailableAssets(userLevel: number, category: string): string[] {
  const categoryRequirements = ASSET_LEVEL_REQUIREMENTS[category];
  if (!categoryRequirements) return [];
  
  return Object.keys(categoryRequirements).filter(assetName => {
    const requirement = categoryRequirements[assetName];
    return userLevel >= requirement.level;
  });
}

// Helper function to get newly unlocked assets when leveling up
export function getNewlyUnlockedAssets(oldLevel: number, newLevel: number): Array<{category: string, asset: string, requirement: AssetLevelRequirement}> {
  const newlyUnlocked: Array<{category: string, asset: string, requirement: AssetLevelRequirement}> = [];
  
  Object.entries(ASSET_LEVEL_REQUIREMENTS).forEach(([category, assets]) => {
    Object.entries(assets).forEach(([assetName, requirement]) => {
      if (requirement.level > oldLevel && requirement.level <= newLevel) {
        newlyUnlocked.push({
          category,
          asset: assetName,
          requirement
        });
      }
    });
  });
  
  return newlyUnlocked;
}
`;

  return output;
}

// Main execution
try {
  console.log('📖 Reading LevelUnlocks.txt...');
  const content = fs.readFileSync(LEVEL_UNLOCKS_FILE, 'utf-8');
  
  console.log('🔍 Parsing level unlocks...');
  const requirements = parseLevelUnlocks(content);
  
  console.log('📝 Generating TypeScript file...');
  const tsContent = generateTypeScriptFile(requirements);
  
  console.log('💾 Writing to dice-asset-levels.ts...');
  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
  
  console.log('✅ Successfully updated dice-asset-levels.ts!');
  console.log('\n📊 Summary:');
  for (const [category, assets] of Object.entries(requirements)) {
    console.log(`   ${category}: ${Object.keys(assets).length} assets`);
  }
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

