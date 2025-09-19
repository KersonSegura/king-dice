// Comprehensive list of board games for UltraBoardGames scraping
// Organized by popularity and likelihood of having rules

const ULTRA_POPULAR_GAMES = [
  // Already done: catan, 7wonders, ticket-to-ride, azul, wingspan, splendor, pandemic, carcassonne, dominion, terraforming-mars, gloomhaven, spirit-island, root, everdell, ark-nova
  
  // Classic gateway games
  'monopoly',
  'scrabble', 
  'risk',
  'clue',
  'chess',
  'checkers',
  'backgammon',
  'yahtzee',
  'uno',
  'phase-10',
  
  // Modern classics
  'settlers-of-catan', // alternative name
  'puerto-rico',
  'power-grid',
  'agricola',
  'le-havre',
  'through-the-ages',
  'race-for-the-galaxy',
  'san-juan',
  'citadels',
  'bang',
  
  // Party games
  'codenames',
  'dixit',
  'telestrations',
  'wavelength',
  'just-one',
  'camel-up',
  'king-of-tokyo', // retry
  'sushi-go',
  'love-letter',
  'exploding-kittens',
  
  // Strategy games
  'twilight-imperium',
  'food-chain-magnate',
  'great-western-trail',
  'orleans',
  'concordia',
  'istanbul',
  'marco-polo',
  'tzolkin',
  'caverna',
  'lords-of-waterdeep',
  
  // Deck builders
  'dominion-intrigue',
  'ascension',
  'star-realms',
  'legendary',
  'arctic-scavengers',
  'valley-of-kings',
  'clank',
  'aeon-end',
  
  // Cooperative games
  'pandemic-legacy',
  'forbidden-island',
  'forbidden-desert',
  'flash-point',
  'hanabi',
  'ghost-stories',
  'zombicide',
  'arkham-horror',
  'eldritch-horror',
  'betrayal-at-house-on-the-hill',
  
  // Euro games
  'castles-of-burgundy',
  'stone-age',
  'village',
  'russian-railroads',
  'keyflower',
  'terra-mystica',
  'gaia-project',
  'brass-lancashire',
  'brass-birmingham', // retry
  'underwater-cities',
  
  // Abstract games
  'azul-stained-glass',
  'patchwork',
  'sagrada',
  'calico',
  'reef',
  'century-spice-road',
  'century-golem',
  'point-salad',
  'kingdomino',
  'blue-lagoon',
  
  // Thematic games
  'betrayal-legacy',
  'mansions-of-madness',
  'descent',
  'imperial-assault',
  'zombies',
  'last-friday',
  'fury-of-dracula',
  'dead-of-winter',
  'battlestar-galactica',
  'dune',
  
  // Card games
  'race-for-the-galaxy-expansion',
  'innovation',
  'red7',
  'skull',
  'coup',
  'resistance',
  'avalon',
  'werewolf',
  'one-night-ultimate-werewolf',
  'secret-hitler',
  
  // Family games
  'ticket-to-ride-europe',
  'king-of-new-york',
  'machi-koro',
  'splendor-cities',
  'azul-summer-pavilion',
  'photosynthesis',
  'parks',
  'wingspan-european',
  'everdell-spirecrest',
  'root-underworld',
  
  // War games
  'memoir-44',
  'command-and-colors',
  'battle-line',
  'air-land-battle',
  'combat-commander',
  'paths-of-glory',
  'twilight-struggle',
  'cold-war',
  'washington-war',
  'empire-of-the-sun',
  
  // Economic games
  'container',
  'chicago-express',
  '1830',
  '1846',
  'age-of-steam',
  'steam',
  'power-grid-deluxe',
  'acquire',
  'modern-art',
  'for-sale',
  
  // Roll and write
  'yahtzee-variants',
  'qwixx',
  'railroad-ink',
  'welcome-to',
  'cartographers',
  'clever',
  'ganz-schon-clever',
  'rolling-realms',
  'fleet-dice-game',
  'dice-throne'
];

const CLASSIC_GAMES = [
  'backgammon-variants',
  'chess-variants',
  'go',
  'checkers-variants',
  'mancala',
  'nine-mens-morris',
  'tic-tac-toe',
  'connect-four',
  'othello',
  'reversi',
  'chinese-checkers',
  'parcheesi',
  'sorry',
  'trouble',
  'aggravation',
  'ludo',
  'snakes-and-ladders',
  'chutes-and-ladders',
  'candy-land',
  'life'
];

const CARD_GAMES = [
  'poker',
  'texas-holdem',
  'blackjack',
  'bridge',
  'spades',
  'hearts',
  'euchre',
  'cribbage',
  'gin-rummy',
  'canasta',
  'pinochle',
  'whist',
  'solitaire',
  'klondike',
  'freecell',
  'spider-solitaire',
  'pyramid-solitaire',
  'golf-solitaire',
  'accordion',
  'clock-solitaire'
];

const DICE_GAMES = [
  'farkle',
  'bunco',
  'liar-dice',
  'perudo',
  'zombie-dice',
  'martian-dice',
  'castle-dice',
  'roll-for-it',
  'tenzi',
  'left-right-center'
];

// Export all game lists
module.exports = {
  ULTRA_POPULAR_GAMES,
  CLASSIC_GAMES,
  CARD_GAMES,
  DICE_GAMES,
  ALL_GAMES: [
    ...ULTRA_POPULAR_GAMES,
    ...CLASSIC_GAMES,
    ...CARD_GAMES,
    ...DICE_GAMES
  ]
};

if (require.main === module) {
  const { ALL_GAMES } = require('./comprehensive-game-list');
  console.log(`📋 Total games to scrape: ${ALL_GAMES.length}`);
  console.log('🎯 Categories:');
  console.log(`  - Ultra Popular: ${ULTRA_POPULAR_GAMES.length}`);
  console.log(`  - Classic Games: ${CLASSIC_GAMES.length}`);
  console.log(`  - Card Games: ${CARD_GAMES.length}`);
  console.log(`  - Dice Games: ${DICE_GAMES.length}`);
}
