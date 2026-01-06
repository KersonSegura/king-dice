// Translation mapping for dice asset display names
// Maps the output of getDisplayName() to translation keys in the myDice namespace

export const ASSET_NAME_TO_KEY: Record<string, string> = {
  // Backgrounds
  'White': 'assetWhite',
  'Black': 'assetBlack',
  'Blue': 'assetBlue',
  'Green': 'assetGreen',
  'Red': 'assetRed',
  'Yellow': 'assetYellow',
  'Brown': 'assetBrown',
  'Light Blue': 'assetLightBlue',
  'Light Yellow': 'assetLightYellow',
  'Orange': 'assetOrange',
  'Pink': 'assetPink',
  'Purple': 'assetPurple',
  'Game Board': 'assetGameBoard',
  'Chess Board': 'assetChessBoard',
  'Casino': 'assetCasino',
  'Card Game': 'assetCardGame',
  "King's Room": 'assetKingsRoom',
  
  // Dice
  'White': 'assetWhite',
  'Black': 'assetBlack',
  'Blue': 'assetBlue',
  'Green': 'assetGreen',
  'Orange': 'assetOrange',
  'Pink': 'assetPink',
  'Purple': 'assetPurple',
  'Red': 'assetRed',
  'Yellow': 'assetYellow',
  'Box': 'assetBox',
  'Ice Cube': 'assetIceCube',
  'Rubik': 'assetRubik',
  'Dice-Skull': 'assetDiceSkull',
  'Safe': 'assetSafe',
  'Dice-Bot': 'assetDiceBot',
  'Gift': 'assetGift',
  
  // Patterns
  '1-2-3': 'assetPattern123',
  '2-1-4': 'assetPattern214',
  '3-6-5': 'assetPattern365',
  '4-5-6': 'assetPattern456',
  '5-4-1': 'assetPattern541',
  '6-3-2': 'assetPattern632',
  'ABC': 'assetPatternABC',
  'Mistery': 'assetPatternMistery',
  'Suits': 'assetPatternSuits',
  'Elements': 'assetPatternElements',
  'Black 1-2-3': 'assetPatternBlack123',
  'Black 2-1-4': 'assetPatternBlack214',
  'Black 3-6-5': 'assetPatternBlack365',
  'Black 4-5-6': 'assetPatternBlack456',
  'Black 5-4-1': 'assetPatternBlack541',
  'Black 6-3-2': 'assetPatternBlack632',
  'White 1-2-3': 'assetPatternWhite123',
  'White 2-1-4': 'assetPatternWhite214',
  'White 3-6-5': 'assetPatternWhite365',
  'White 4-5-6': 'assetPatternWhite456',
  'White 5-4-1': 'assetPatternWhite541',
  'White 6-3-2': 'assetPatternWhite632',
  
  // Accessories
  'Belt': 'assetBelt',
  'Blush': 'assetBlush',
  'Scar': 'assetScar',
  'Patch': 'assetPatch',
  "King's Cape": 'assetKingsCape',
  'Bow': 'assetBow',
  'Sunglasses': 'assetSunglasses',
  
  // Hats
  'Cone': 'assetCone',
  'Top Hat': 'assetTopHat',
  'Sorcerer Hat': 'assetSorcererHat',
  'Wizard Hat': 'assetWizardHat',
  "Prince's Crown": 'assetPrincesCrown',
  "King's Crown": 'assetKingsCrown',
  "Queen's Crown": 'assetQueensCrown',
  'Joker': 'assetJoker',
  
  // Items
  'Health Potion': 'assetHealthPotion',
  'Mana Potion': 'assetManaPotion',
  'Card Castle': 'assetCardCastle',
  'Poker Chips': 'assetPokerChips',
  'Map': 'assetMap',
  'Coins': 'assetCoins',
  'Shield': 'assetShield',
  'Mace': 'assetMace',
  'Bomb': 'assetBomb',
  'Staff': 'assetStaff',
  'Spellbook': 'assetSpellbook',
  'Sword': 'assetSword',
  'Holy Grail': 'assetHolyGrail',
  "King's Card": 'assetKingsCard',
  
  // Companions
  'Meeple': 'assetMeeple',
  'Mini-Dice': 'assetMiniDice',
  'Chess Knight': 'assetChessKnight',
  'Jack in the box': 'assetJackInTheBox',
  'Eight Ball': 'assetEightBall',
  'Mimic': 'assetMimic',
  'Dice-Skull': 'assetDiceSkullCompanion', // Different from dice version
  'Dice-Bot': 'assetDiceBotCompanion', // Different from dice version
};

/**
 * Get translated asset name
 * @param displayName The English display name (from getDisplayName)
 * @param translations Translation function from useTranslations('myDice')
 * @returns Translated name or original if translation not found
 */
export function getTranslatedAssetName(
  displayName: string,
  translations: (key: string) => string
): string {
  const translationKey = ASSET_NAME_TO_KEY[displayName];
  if (translationKey) {
    const translated = translations(translationKey);
    // If translation exists and is not the key itself, return it
    if (translated && translated !== translationKey) {
      return translated;
    }
  }
  // Fallback to original name
  return displayName;
}

