/**
 * Normalizes a game name for consistent database lookups
 * - Converts to lowercase
 * - Trims whitespace
 * - Collapses multiple spaces into single space
 * 
 * This matches the normalization used in the database's generated columns
 */
export function normalizeGameName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

