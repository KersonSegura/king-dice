// Translation mapping for asset descriptions
// Maps English description text to translation keys in the myDice namespace

const DESCRIPTION_TO_KEY: Record<string, string> = {
  "King's Room background - only unlockable by winning Dice of the Week (Dice Throne in gallery)": 'assetDescKingsRoom',
  "King's Card - only unlockable by winning Card of the Week (The King's Card in gallery)": 'assetDescKingsCard',
};

/**
 * Get translated asset description
 * @param description The English description
 * @param translations Translation function from useTranslations('myDice')
 * @returns Translated description or original if translation not found
 */
export function getTranslatedDescription(
  description: string,
  translations: (key: string) => string
): string {
  const translationKey = DESCRIPTION_TO_KEY[description];
  if (translationKey) {
    const translated = translations(translationKey);
    // If translation exists and is not the key itself, return it
    if (translated && translated !== translationKey) {
      return translated;
    }
  }
  // Fallback to original description
  return description;
}

