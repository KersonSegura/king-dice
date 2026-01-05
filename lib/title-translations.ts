// Title mapping: English title -> translation key
const TITLE_TRANSLATION_MAP: Record<string, string> = {
  'Commoner': 'titleCommoner',
  'Squire': 'titleSquire',
  'Knight': 'titleKnight',
  'Champion': 'titleChampion',
  'Baron': 'titleBaron',
  'Baroness': 'titleBaroness',
  'Lord': 'titleLord',
  'Lady': 'titleLady',
  'Archmage': 'titleArchmage',
  'Duke': 'titleDuke',
  'Duchess': 'titleDuchess',
  'Prince': 'titlePrince',
  'Princess': 'titlePrincess',
  'King': 'titleKing',
  'Queen': 'titleQueen',
  // Handle level names that contain both genders (like "Baron/Baroness")
  'Baron/Baroness': 'titleBaron',
  'Lord/Lady': 'titleLord',
  'Duke/Duchess': 'titleDuke',
  'Prince/Princess': 'titlePrince',
  'King/Queen': 'titleKing'
};

/**
 * Get the translated title based on locale and gender preference
 * @param title English title (e.g., "Commoner", "Baron/Baroness")
 * @param locale Current locale ('en' or 'es')
 * @param genderPreference 'masculine' or 'feminine' (only used for Spanish)
 * @param translations Translation function from useTranslations('myDice')
 */
export function getTranslatedTitle(
  title: string,
  locale: string,
  genderPreference: 'masculine' | 'feminine' | undefined,
  translations: (key: string) => string
): string {
  // For English, return the title as-is
  if (locale === 'en') {
    return title;
  }

  // For Spanish, use gender preference
  if (locale === 'es') {
    const translationKey = TITLE_TRANSLATION_MAP[title];
    if (!translationKey) {
      return title; // Fallback to original if no translation key found
    }

    // If gender preference is feminine and there's a feminine version, use it
    if (genderPreference === 'feminine') {
      const feminineKey = `${translationKey}F`;
      const feminineTranslation = translations(feminineKey);
      // If the feminine translation exists and is different from the key, use it
      if (feminineTranslation && feminineTranslation !== feminineKey) {
        return feminineTranslation;
      }
    }

    // Use the masculine/default translation
    return translations(translationKey);
  }

  return title;
}

/**
 * Get the level name translation key based on level number
 * Level names from lib/reputation.ts:
 * Level 1: Commoner
 * Level 2: Squire
 * Level 3: Knight
 * Level 4: Champion
 * Level 5: Baron/Baroness
 * Level 6: Lord/Lady
 * Level 7: Archmage
 * Level 8: Duke/Duchess
 * Level 9: Prince/Princess
 * Level 10: King/Queen
 */
export function getLevelNameTranslationKey(level: number, genderPreference: 'masculine' | 'feminine' | undefined): string {
  const levelNames: Record<number, { masculine: string; feminine: string }> = {
    1: { masculine: 'titleCommoner', feminine: 'titleCommonerF' },
    2: { masculine: 'titleSquire', feminine: 'titleSquireF' },
    3: { masculine: 'titleKnight', feminine: 'titleKnightF' },
    4: { masculine: 'titleChampion', feminine: 'titleChampionF' },
    5: { masculine: 'titleBaron', feminine: 'titleBaroness' },
    6: { masculine: 'titleLord', feminine: 'titleLady' },
    7: { masculine: 'titleArchmage', feminine: 'titleArchmage' },
    8: { masculine: 'titleDuke', feminine: 'titleDuchess' },
    9: { masculine: 'titlePrince', feminine: 'titlePrincess' },
    10: { masculine: 'titleKing', feminine: 'titleQueen' }
  };

  const levelInfo = levelNames[level];
  if (!levelInfo) {
    return 'titleCommoner'; // Default
  }

  return genderPreference === 'feminine' ? levelInfo.feminine : levelInfo.masculine;
}

