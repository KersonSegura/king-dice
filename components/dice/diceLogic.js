/**
 * Generates a uniform random roll for a die with the specified number of sides.
 * Returns a value between 1 and sides (inclusive).
 * 
 * @param {number} sides - Number of faces on the die (must be >= 1)
 * @returns {number} Random integer between 1 and sides (inclusive)
 */
export function getRandomRoll(sides) {
  // Validate input
  if (typeof sides !== 'number' || sides < 1 || !Number.isInteger(sides)) {
    console.warn(`Invalid sides parameter: ${sides}. Using default of 6.`);
    sides = 6;
  }
  
  // Generate uniform random integer from 1 to sides (inclusive)
  // Math.random() returns [0, 1), so:
  // - Math.random() * sides gives [0, sides)
  // - Math.floor(...) gives [0, sides-1] (integers)
  // - + 1 gives [1, sides] (integers)
  return Math.floor(Math.random() * sides) + 1;
}

