// Translation helper for Boardle clues
// Since clues are dynamic and come from the database, we translate them on the client side

/**
 * Translate a clue from English to Spanish
 * This is a pattern-based translation for common clue patterns
 * For unknown clues, returns the original text
 */
export function translateClue(clue: string, locale: string): string {
  // If locale is English, return as-is
  if (locale === 'en') {
    return clue;
  }

  // If locale is Spanish, translate common patterns
  if (locale === 'es') {
    // Common clue patterns and their translations
    const clueTranslations: Record<string, string> = {
      // Generic patterns
      'Players take turns making moves on a game board.': 'Los jugadores se turnan para hacer movimientos en un tablero de juego.',
      'The game involves collecting resources or scoring points.': 'El juego implica recolectar recursos o anotar puntos.',
      'Players compete to achieve victory conditions.': 'Los jugadores compiten para lograr condiciones de victoria.',
      'The game includes cards, dice, or other game components.': 'El juego incluye cartas, dados u otros componentes de juego.',
      'Strategy and planning are important for success.': 'La estrategia y la planificación son importantes para el éxito.',
      'Players interact with game components on a board or table.': 'Los jugadores interactúan con componentes del juego en un tablero o mesa.',
      'The game involves placing pieces or moving tokens.': 'El juego implica colocar piezas o mover fichas.',
      'Players compete to control areas or collect resources.': 'Los jugadores compiten para controlar áreas o recolectar recursos.',
      'The game includes visual elements like cards or tiles.': 'El juego incluye elementos visuales como cartas o fichas.',
      'Strategy and timing are important for success.': 'La estrategia y el tiempo son importantes para el éxito.',
      'Players use cards to make moves or take actions.': 'Los jugadores usan cartas para hacer movimientos o tomar acciones.',
      'The game involves collecting or playing cards strategically.': 'El juego implica recolectar o jugar cartas estratégicamente.',
      'Players compete to score points or achieve goals.': 'Los jugadores compiten para anotar puntos o lograr objetivos.',
      'Cards have different values, effects, or abilities.': 'Las cartas tienen diferentes valores, efectos o habilidades.',
      'Hand management and timing are important for success.': 'La gestión de la mano y el tiempo son importantes para el éxito.',
      'This game offers an engaging and challenging gameplay experience.': 'Este juego ofrece una experiencia de juego atractiva y desafiante.',
      'This game typically plays in 30-90 minutes.': 'Este juego típicamente se juega en 30-90 minutos.',
      'This game supports 2-6 players.': 'Este juego admite 2-6 jugadores.',
      'This game involves strategic thinking and player interaction.': 'Este juego implica pensamiento estratégico e interacción entre jugadores.',
      'This game\'s name contains multiple words.': 'El nombre de este juego contiene múltiples palabras.',
      'This game\'s name contains special punctuation characters.': 'El nombre de este juego contiene caracteres de puntuación especiales.',
      'Make a guess to reveal the next clue': 'Haz un intento para revelar la siguiente pista',
      'Make a guess to zoom out and reveal the next clue': 'Haz un intento para alejar la imagen y revelar la siguiente pista'
    };

    // Check if we have a direct translation
    if (clueTranslations[clue]) {
      return clueTranslations[clue];
    }

    // For unknown clues, return original (can be enhanced with translation API later)
    return clue;
  }

  return clue;
}

