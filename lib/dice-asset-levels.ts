// Level requirements for dice assets
// Higher level items are more exclusive and prestigious

export interface AssetLevelRequirement {
  level: number;
  levelName: string;
  description: string;
}

// Define level requirements for each asset category
export const ASSET_LEVEL_REQUIREMENTS: Record<string, Record<string, AssetLevelRequirement>> = {
  // Backgrounds - Progressive unlock order
  backgrounds: {
    'WhiteBackground': { level: 1, levelName: 'Commoner', description: 'Basic white background' },
    'BlackBackground': { level: 1, levelName: 'Commoner', description: 'Basic black background' },
    'BlueBackground': { level: 2, levelName: 'Squire', description: 'Blue background' },
    'GreenBackground': { level: 2, levelName: 'Squire', description: 'Green background' },
    'RedBackground': { level: 2, levelName: 'Squire', description: 'Red background' },
    'YellowBackground': { level: 2, levelName: 'Squire', description: 'Yellow background' },
    'GameBoardBackground': { level: 4, levelName: 'Champion', description: 'Game board themed background' },
    'ChessBoardBackground': { level: 6, levelName: 'Lord/Lady', description: 'Chess board themed background' },
    'CasinoBackground': { level: 8, levelName: 'Duke/Duchess', description: 'Casino themed background' },
    'CardGameBackground': { level: 10, levelName: 'King/Queen', description: 'Card game themed background' },
    'KingsRoomBackground': { level: 0, levelName: 'Special', description: 'King\'s Room background - only unlockable by winning Dice of the Week' },
  },

  // Dice - Progressive unlock order
  dice: {
    'WhiteDice': { level: 1, levelName: 'Commoner', description: 'Basic white dice' },
    'BlackDice': { level: 2, levelName: 'Squire', description: 'Basic black dice' },
    'BlueDice': { level: 2, levelName: 'Squire', description: 'Basic blue dice' },
    'GreenDice': { level: 2, levelName: 'Squire', description: 'Basic green dice' },
    'OrangeDice': { level: 2, levelName: 'Squire', description: 'Orange dice' },
    'PinkDice': { level: 2, levelName: 'Squire', description: 'Pink dice' },
    'PurpleDice': { level: 2, levelName: 'Squire', description: 'Purple dice' },
    'RedDice': { level: 2, levelName: 'Squire', description: 'Basic red dice' },
    'YellowDice': { level: 2, levelName: 'Squire', description: 'Basic yellow dice' },
    'BoxDice': { level: 3, levelName: 'Knight', description: 'Box-themed dice' },
    'IceCubeDice': { level: 5, levelName: 'Baron/Baroness', description: 'Ice cube dice' },
    'RubikDice': { level: 7, levelName: 'Archmage', description: 'Rubik\'s cube dice' },
    'Dice-SkullDice': { level: 8, levelName: 'Duke/Duchess', description: 'Skull-themed dice' },
    'SafeDice': { level: 9, levelName: 'Lord/Lady', description: 'Safe-themed dice' },
    'GiftDice': { level: 0, levelName: 'Special', description: 'Gift dice - only unlockable by donating to the page' },
    'Dice-BotDice': { level: 0, levelName: 'Special', description: 'Dice-Bot dice - only unlockable by donating to the page' },
  },

  // Patterns - Progressive unlock order
  patterns: {
    '1-2-3': { level: 1, levelName: 'Commoner', description: 'Basic 1-2-3 pattern' },
    '2-1-4': { level: 1, levelName: 'Commoner', description: 'Basic 2-1-4 pattern' },
    '3-6-5': { level: 1, levelName: 'Commoner', description: 'Basic 3-6-5 pattern' },
    '4-5-6': { level: 1, levelName: 'Commoner', description: 'Basic 4-5-6 pattern' },
    '5-4-1': { level: 1, levelName: 'Commoner', description: 'Basic 5-4-1 pattern' },
    '6-3-2': { level: 1, levelName: 'Commoner', description: 'Basic 6-3-2 pattern' },
    'ABC': { level: 4, levelName: 'Champion', description: 'Alphabet pattern' },
    'Mistery': { level: 6, levelName: 'Lord/Lady', description: 'Mystery pattern' },
    'Suits': { level: 6, levelName: 'Lord/Lady', description: 'Card suit pattern' },
    'Elements': { level: 8, levelName: 'Duke/Duchess', description: 'Elemental pattern' },
  },

  // Accessories - Progressive unlock order
  accessories: {
    'Bow': { level: 2, levelName: 'Squire', description: 'Basic bow accessory' },
    'Belt': { level: 4, levelName: 'Champion', description: 'Basic belt accessory' },
    'Blush': { level: 5, levelName: 'Baron/Baroness', description: 'Blush accessory' },
    'Sunglasses': { level: 5, levelName: 'Baron/Baroness', description: 'Cool sunglasses accessory' },
    'Scar': { level: 7, levelName: 'Archmage', description: 'Scar accessory' },
    'Patch': { level: 9, levelName: 'Lord/Lady', description: 'Patch accessory' },
    'KingsCape': { level: 10, levelName: 'King/Queen', description: 'King\'s cape - very exclusive!' },
  },

  // Crowns & Hats - Progressive unlock order
  'Crowns & Hats': {
    'Cone': { level: 2, levelName: 'Squire', description: 'Basic cone hat' },
    'Joker': { level: 2, levelName: 'Squire', description: 'Joker hat' },
    'TopHat': { level: 5, levelName: 'Baron/Baroness', description: 'Elegant top hat' },
    'SorcererHat': { level: 8, levelName: 'Duke/Duchess', description: 'Powerful sorcerer hat' },
    'WizardHat': { level: 8, levelName: 'Duke/Duchess', description: 'Magical wizard hat' },
    'PrincesCrown': { level: 9, levelName: 'Lord/Lady', description: 'Prince\'s crown - royal item!' },
    'QueensCrown': { level: 10, levelName: 'King/Queen', description: 'Queen\'s crown - ultimate prestige!' },
    'KingsCrown': { level: 10, levelName: 'King/Queen', description: 'King\'s crown - ultimate prestige!' },
  },

  // Items - Progressive unlock order
  items: {
    'ManaPotion': { level: 1, levelName: 'Commoner', description: 'Mana potion' },
    'HealthPotion': { level: 1, levelName: 'Commoner', description: 'Health potion' },
    'CardCastle': { level: 3, levelName: 'Knight', description: 'Card castle item' },
    'PokerChips': { level: 4, levelName: 'Champion', description: 'Poker chips' },
    'Map': { level: 5, levelName: 'Baron/Baroness', description: 'Adventure map' },
    'Coins': { level: 5, levelName: 'Baron/Baroness', description: 'Coins' },
    'Shield': { level: 6, levelName: 'Lord/Lady', description: 'Basic shield' },
    'Mace': { level: 6, levelName: 'Lord/Lady', description: 'Heavy mace' },
    'Bomb': { level: 7, levelName: 'Archmage', description: 'Explosive bomb' },
    'Staff': { level: 8, levelName: 'Duke/Duchess', description: 'Magical staff' },
    'Spellbook': { level: 8, levelName: 'Duke/Duchess', description: 'Ancient spellbook' },
    'Sword': { level: 9, levelName: 'Lord/Lady', description: 'Basic sword' },
    'HolyGrail': { level: 10, levelName: 'King/Queen', description: 'Legendary holy grail' },
    'KingsCard': { level: 0, levelName: 'Special', description: 'King\'s Card - only unlockable by winning Card of the Week' },
  },

  // Companions - Progressive unlock order
  companions: {
    'Meeple': { level: 3, levelName: 'Knight', description: 'Basic meeple companion' },
    'Mini-Dice': { level: 5, levelName: 'Baron/Baroness', description: 'Mini dice companion' },
    'JackInTheBox': { level: 6, levelName: 'Lord/Lady', description: 'Jack in the box companion' },
    'ChessKnight': { level: 6, levelName: 'Lord/Lady', description: 'Chess knight companion' },
    'Dice-Skull': { level: 7, levelName: 'Archmage', description: 'Legendary dice skull companion' },
    'EightBall': { level: 8, levelName: 'Duke/Duchess', description: 'Eight ball companion' },
    'Mimic': { level: 9, levelName: 'Lord/Lady', description: 'Mysterious mimic companion' },
    'Dice-Bot': { level: 10, levelName: 'King/Queen', description: 'Legendary Dice-Bot companion - unlocks at level 10' },
  },

  // Titles - Progressive unlock order
  titles: {
    'Commoner': { level: 1, levelName: 'Commoner', description: 'Basic title for new players' },
    'Squire': { level: 2, levelName: 'Squire', description: 'Squire title' },
    'Knight': { level: 3, levelName: 'Knight', description: 'Knight title' },
    'Champion': { level: 4, levelName: 'Champion', description: 'Champion title' },
    'Baron': { level: 5, levelName: 'Baron/Baroness', description: 'Baron title' },
    'Baroness': { level: 5, levelName: 'Baron/Baroness', description: 'Baroness title' },
    'Lord': { level: 6, levelName: 'Lord/Lady', description: 'Lord title' },
    'Lady': { level: 6, levelName: 'Lord/Lady', description: 'Lady title' },
    'Archmage': { level: 7, levelName: 'Archmage', description: 'Archmage title' },
    'Duke': { level: 8, levelName: 'Duke/Duchess', description: 'Duke title' },
    'Duchess': { level: 8, levelName: 'Duke/Duchess', description: 'Duchess title' },
    'Prince': { level: 9, levelName: 'Prince/Princess', description: 'Prince title' },
    'Princess': { level: 9, levelName: 'Prince/Princess', description: 'Princess title' },
    'King': { level: 10, levelName: 'King/Queen', description: 'King title' },
    'Queen': { level: 10, levelName: 'King/Queen', description: 'Queen title' },
  },

  // Special Items - Not level-based (moved to their respective categories)
  special: {
    // Special items are now defined in their respective categories (dice, backgrounds, items)
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
