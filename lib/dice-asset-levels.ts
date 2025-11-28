// Level requirements for dice assets
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
  // Backgrounds - Progressive unlock order
  backgrounds: {
    'KingsRoomBackground': { level: 0, levelName: 'Special', description: 'King\'s Room background - only unlockable by winning Dice of the Week (Dice Throne in gallery)' },
    'BlackBackground': { level: 1, levelName: 'Commoner', description: 'Black - unlocks at level 1' },
    'WhiteBackground': { level: 1, levelName: 'Commoner', description: 'White - unlocks at level 1' },
    'BlueBackground': { level: 2, levelName: 'Squire', description: 'Blue - unlocks at level 2' },
    'BrownBackground': { level: 2, levelName: 'Squire', description: 'Brown - unlocks at level 2' },
    'GreenBackground': { level: 2, levelName: 'Squire', description: 'Green - unlocks at level 2' },
    'LightBlueBackground': { level: 2, levelName: 'Squire', description: 'Light Blue - unlocks at level 2' },
    'LightYellowBackground': { level: 2, levelName: 'Squire', description: 'Light Yellow - unlocks at level 2' },
    'OrangeBackground': { level: 2, levelName: 'Squire', description: 'Orange - unlocks at level 2' },
    'PinkBackground': { level: 2, levelName: 'Squire', description: 'Pink - unlocks at level 2' },
    'PurpleBackground': { level: 2, levelName: 'Squire', description: 'Purple - unlocks at level 2' },
    'RedBackground': { level: 2, levelName: 'Squire', description: 'Red - unlocks at level 2' },
    'YellowBackground': { level: 2, levelName: 'Squire', description: 'Yellow - unlocks at level 2' },
    'GameBoardBackground': { level: 4, levelName: 'Champion', description: 'Game Board - unlocks at level 4' },
    'ChessBoardBackground': { level: 6, levelName: 'Lord/Lady', description: 'Chess Board - unlocks at level 6' },
    'CasinoBackground': { level: 8, levelName: 'Duke/Duchess', description: 'Casino - unlocks at level 8' },
    'CardGameBackground': { level: 9, levelName: 'Prince', description: 'Card Game - unlocks at level 9' },
  },

  // Dice - Progressive unlock order
  dice: {
    'Dice-BotDice': { level: 0, levelName: 'Special', description: 'Dice-Bot dice - only unlockable by donating to the page' },
    'GiftDice': { level: 0, levelName: 'Special', description: 'Gift dice - only unlockable by donating to the page' },
    'WhiteDice': { level: 1, levelName: 'Commoner', description: 'White - unlocks at level 1' },
    'BlackDice': { level: 2, levelName: 'Squire', description: 'Black - unlocks at level 2' },
    'BlueDice': { level: 2, levelName: 'Squire', description: 'Blue - unlocks at level 2' },
    'GreenDice': { level: 2, levelName: 'Squire', description: 'Green - unlocks at level 2' },
    'OrangeDice': { level: 2, levelName: 'Squire', description: 'Orange - unlocks at level 2' },
    'PinkDice': { level: 2, levelName: 'Squire', description: 'Pink - unlocks at level 2' },
    'PurpleDice': { level: 2, levelName: 'Squire', description: 'Purple - unlocks at level 2' },
    'RedDice': { level: 2, levelName: 'Squire', description: 'Red - unlocks at level 2' },
    'YellowDice': { level: 2, levelName: 'Squire', description: 'Yellow - unlocks at level 2' },
    'BoxDice': { level: 3, levelName: 'Knight', description: 'Box - unlocks at level 3' },
    'IceCubeDice': { level: 5, levelName: 'Baron/Baroness', description: 'Ice Cube - unlocks at level 5' },
    'RubikDice': { level: 7, levelName: 'Archmage', description: 'Rubik - unlocks at level 7' },
    'DiceSkullDice': { level: 8, levelName: 'Duke/Duchess', description: 'Dice-Skull - unlocks at level 8' },
    'SafeDice': { level: 9, levelName: 'Prince', description: 'Safe - unlocks at level 9' },
  },

  // Patterns - Progressive unlock order
  patterns: {
    'Black123': { level: 1, levelName: 'Commoner', description: 'Black 1 2 3 - unlocks at level 1' },
    'Black214': { level: 1, levelName: 'Commoner', description: 'Black 2 1 4 - unlocks at level 1' },
    'Black365': { level: 1, levelName: 'Commoner', description: 'Black 3 6 5 - unlocks at level 1' },
    'Black456': { level: 1, levelName: 'Commoner', description: 'Black 4 5 6 - unlocks at level 1' },
    'Black541': { level: 1, levelName: 'Commoner', description: 'Black 5 4 1 - unlocks at level 1' },
    'Black632': { level: 1, levelName: 'Commoner', description: 'Black 6 3 2 - unlocks at level 1' },
    'White123': { level: 1, levelName: 'Commoner', description: 'White 1 2 3 - unlocks at level 1' },
    'White214': { level: 1, levelName: 'Commoner', description: 'White 2 1 4 - unlocks at level 1' },
    'White365': { level: 1, levelName: 'Commoner', description: 'White 3 6 5 - unlocks at level 1' },
    'White456': { level: 1, levelName: 'Commoner', description: 'White 4 5 6 - unlocks at level 1' },
    'White541': { level: 1, levelName: 'Commoner', description: 'White 5 4 1 - unlocks at level 1' },
    'White632': { level: 1, levelName: 'Commoner', description: 'White 6 3 2 - unlocks at level 1' },
    'ABC': { level: 4, levelName: 'Champion', description: 'ABC - unlocks at level 4' },
    'Mistery': { level: 6, levelName: 'Lord/Lady', description: 'Mistery - unlocks at level 6' },
    'Suits': { level: 6, levelName: 'Lord/Lady', description: 'Suits - unlocks at level 6' },
    'Elements': { level: 8, levelName: 'Duke/Duchess', description: 'Elements - unlocks at level 8' },
  },

  // Accessories - Progressive unlock order
  accessories: {
    'Bow': { level: 3, levelName: 'Knight', description: 'Bow - unlocks at level 3' },
    'Belt': { level: 4, levelName: 'Champion', description: 'Belt - unlocks at level 4' },
    'Blush': { level: 5, levelName: 'Baron/Baroness', description: 'Blush - unlocks at level 5' },
    'Sunglasses': { level: 6, levelName: 'Lord/Lady', description: 'Sunglasses - unlocks at level 6' },
    'Scar': { level: 7, levelName: 'Archmage', description: 'Scar - unlocks at level 7' },
    'Patch': { level: 9, levelName: 'Prince', description: 'Patch - unlocks at level 9' },
    'KingsCape': { level: 10, levelName: 'King/Queen', description: 'King\'s Cape - unlocks at level 10' },
  },

  // Crowns & Hats - Progressive unlock order
  'Crowns & Hats': {
    'Cone': { level: 2, levelName: 'Squire', description: 'Cone - unlocks at level 2' },
    'Joker': { level: 3, levelName: 'Knight', description: 'Joker - unlocks at level 3' },
    'TopHat': { level: 5, levelName: 'Baron/Baroness', description: 'Top Hat - unlocks at level 5' },
    'SorcererHat': { level: 8, levelName: 'Duke/Duchess', description: 'Sorcerer Hat - unlocks at level 8' },
    'WizardHat': { level: 8, levelName: 'Duke/Duchess', description: 'Wizard Hat - unlocks at level 8' },
    'PrincesCrown': { level: 9, levelName: 'Prince', description: 'Prince\'s Crown - unlocks at level 9' },
    'KingsCrown': { level: 10, levelName: 'King/Queen', description: 'King\'s Crown - unlocks at level 10' },
    'QueensCrown': { level: 10, levelName: 'King/Queen', description: 'Queen\'s Crown - unlocks at level 10' },
  },

  // Items - Progressive unlock order
  items: {
    'KingsCard': { level: 0, levelName: 'Special', description: 'King\'s Card - only unlockable by winning Card of the Week (The King\'s Card in gallery)' },
    'HealthPotion': { level: 1, levelName: 'Commoner', description: 'Health Potion - unlocks at level 1' },
    'ManaPotion': { level: 1, levelName: 'Commoner', description: 'Mana Potion - unlocks at level 1' },
    'CardCastle': { level: 3, levelName: 'Knight', description: 'Card Castle - unlocks at level 3' },
    'PokerChips': { level: 4, levelName: 'Champion', description: 'Poker Chips - unlocks at level 4' },
    'Coins': { level: 5, levelName: 'Baron/Baroness', description: 'Coins - unlocks at level 5' },
    'Map': { level: 5, levelName: 'Baron/Baroness', description: 'Map - unlocks at level 5' },
    'Mace': { level: 6, levelName: 'Lord/Lady', description: 'Mace - unlocks at level 6' },
    'Shield': { level: 6, levelName: 'Lord/Lady', description: 'Shield - unlocks at level 6' },
    'Bomb': { level: 7, levelName: 'Archmage', description: 'Bomb - unlocks at level 7' },
    'Spellbook': { level: 8, levelName: 'Duke/Duchess', description: 'Spellbook - unlocks at level 8' },
    'Staff': { level: 8, levelName: 'Duke/Duchess', description: 'Staff - unlocks at level 8' },
    'Sword': { level: 9, levelName: 'Prince', description: 'Sword - unlocks at level 9' },
    'HolyGrail': { level: 10, levelName: 'King/Queen', description: 'Holy Grail - unlocks at level 10' },
  },

  // Companions - Progressive unlock order
  companions: {
    'Meeple': { level: 3, levelName: 'Knight', description: 'Meeple - unlocks at level 3' },
    'Mini-Dice': { level: 5, levelName: 'Baron/Baroness', description: 'Mini-Dice - unlocks at level 5' },
    'ChessKnight': { level: 6, levelName: 'Lord/Lady', description: 'Chess Knight - unlocks at level 6' },
    'JackInTheBox': { level: 6, levelName: 'Lord/Lady', description: 'Jack in the box - unlocks at level 6' },
    'Dice-Skull': { level: 7, levelName: 'Archmage', description: 'Dice-Skull - unlocks at level 7' },
    'EightBall': { level: 8, levelName: 'Duke/Duchess', description: 'Eight Ball - unlocks at level 8' },
    'Mimic': { level: 9, levelName: 'Prince', description: 'Mimic - unlocks at level 9' },
    'Dice-Bot': { level: 10, levelName: 'King/Queen', description: 'Dice-Bot - unlocks at level 10' },
  },

  // Titles - Progressive unlock order
  titles: {
    'Commoner': { level: 1, levelName: 'Commoner', description: 'Commoner - unlocks at level 1' },
    'Squire': { level: 2, levelName: 'Squire', description: 'Squire - unlocks at level 2' },
    'Knight': { level: 3, levelName: 'Knight', description: 'Knight - unlocks at level 3' },
    'Champion': { level: 4, levelName: 'Champion', description: 'Champion - unlocks at level 4' },
    'Baron': { level: 5, levelName: 'Baron/Baroness', description: 'Baron - unlocks at level 5' },
    'Baroness': { level: 5, levelName: 'Baron/Baroness', description: 'Baroness - unlocks at level 5' },
    'Lady': { level: 6, levelName: 'Lord/Lady', description: 'Lady - unlocks at level 6' },
    'Lord': { level: 6, levelName: 'Lord/Lady', description: 'Lord - unlocks at level 6' },
    'Archmage': { level: 7, levelName: 'Archmage', description: 'Archmage - unlocks at level 7' },
    'Duchess': { level: 8, levelName: 'Duke/Duchess', description: 'Duchess - unlocks at level 8' },
    'Duke': { level: 8, levelName: 'Duke/Duchess', description: 'Duke - unlocks at level 8' },
    'Prince': { level: 9, levelName: 'Prince', description: 'Prince - unlocks at level 9' },
    'Princess': { level: 9, levelName: 'Prince', description: 'Princess - unlocks at level 9' },
    'King': { level: 10, levelName: 'King/Queen', description: 'King - unlocks at level 10' },
    'Queen': { level: 10, levelName: 'King/Queen', description: 'Queen - unlocks at level 10' },
  },

};

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
