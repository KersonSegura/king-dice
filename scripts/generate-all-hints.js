const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Read all game names from the lists
function readGameList(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes('.'))
    .map(line => {
      const parts = line.split('. ');
      return parts.length > 1 ? parts[1].trim() : line;
    })
    .filter(name => name.length > 0);
}

// Generate hints based on game name patterns and known mechanics
function generateHints(gameName) {
  const name = gameName.toLowerCase();
  const hints = {
    title: [],
    image: [],
    card: []
  };

  // Pattern-based hint generation
  if (name.includes('catan') || name.includes('settlers')) {
    hints.title = [
      "Players roll dice to collect resources from hexagonal terrain tiles.",
      "You need specific resources like wood, brick, grain, ore, and sheep to build.",
      "Players build settlements and cities on intersection points of hexes.",
      "The robber piece steals resources when a 7 is rolled.",
      "Players trade resources with each other to get what they need.",
      "The first player to reach 10 victory points wins the game."
    ];
    hints.image = [
      "The board shows hexagonal terrain tiles in different colors.",
      "Players place wooden settlements and cities on corner intersections.",
      "Numbered tokens sit on each terrain hex to determine resource collection.",
      "Players build roads connecting their settlements across the island.",
      "The robber piece blocks resource collection when placed on a hex.",
      "Different terrain types produce different resources when rolled."
    ];
    hints.card = [
      "This card shows the resources needed to build settlements and cities.",
      "Players must collect specific combinations of resources to build.",
      "The card represents the trading economy of the game.",
      "Different cards show different resource costs for various buildings.",
      "Players can trade these resource cards with other players.",
      "These cards are essential for expanding your settlements."
    ];
  } else if (name.includes('pandemic')) {
    hints.title = [
      "Players work together to stop the spread of diseases across the world.",
      "You must find cures before outbreaks overwhelm major cities.",
      "Each player has a unique role with special abilities.",
      "Diseases spread across a world map with major cities marked.",
      "Players can share knowledge cards to help find cures.",
      "The game is cooperative - you win or lose together."
    ];
    hints.image = [
      "The board shows a world map with major cities marked.",
      "Players place disease cubes on cities to represent outbreaks.",
      "The board shows different colored disease regions.",
      "Players move their pawns between cities to take actions.",
      "Research stations can be built to help find cures.",
      "The game includes epidemic cards that accelerate disease spread."
    ];
    hints.card = [
      "This card shows a city name and disease color.",
      "Players use these cards to move between cities.",
      "Cards are essential for building research stations.",
      "Players must collect sets of cards to find cures.",
      "The card shows the city's location on the world map.",
      "These cards can be shared between players in the same city."
    ];
  } else if (name.includes('monopoly')) {
    hints.title = [
      "Players roll dice to move around a square board with properties.",
      "Players buy properties with game money when they land on them.",
      "Different things happen depending on which space you land on.",
      "Players collect rent from other players who land on their properties.",
      "Players can build houses and hotels to increase rent amounts.",
      "The goal is to bankrupt all other players by taking their money."
    ];
    hints.image = [
      "The board shows a square path with properties around the edges.",
      "Players move their tokens around the board based on dice rolls.",
      "Different colored property groups are visible on the board.",
      "Players can see houses and hotels built on properties.",
      "The board includes railroads, utilities, and special spaces.",
      "Players start at 'GO' and collect money each time they pass it."
    ];
    hints.card = [
      "This card shows a property deed with rent prices.",
      "Players must pay rent when landing on properties owned by others.",
      "The card shows how much rent increases with houses and hotels.",
      "Players can buy these properties when they land on them.",
      "The card represents ownership of a specific property.",
      "These cards show the financial value of each property."
    ];
  } else if (name.includes('chess')) {
    hints.title = [
      "Players move different pieces with unique movement patterns on an 8x8 board.",
      "Each piece moves differently: pawns forward, rooks in straight lines, bishops diagonally.",
      "Players try to checkmate the opponent's king to win.",
      "Players capture opponent pieces by landing on their squares.",
      "The game includes special moves like castling and en passant.",
      "Players must protect their king while attacking the opponent's king."
    ];
    hints.image = [
      "The board shows a checkered 8x8 grid with pieces on starting positions.",
      "Players have pieces of two different colors: white and black.",
      "The board displays alternating light and dark squares.",
      "Players can see all pieces and their current positions.",
      "The game includes kings, queens, rooks, bishops, knights, and pawns.",
      "Players compete to control the board and checkmate the opponent."
    ];
    hints.card = [
      "This card shows a chess piece with its movement pattern.",
      "Players use these pieces to attack and defend on the board.",
      "The card shows how the piece can move and capture.",
      "Players must understand each piece's unique abilities.",
      "The card represents the strategic value of different pieces.",
      "These pieces determine the tactical possibilities in the game."
    ];
  } else if (name.includes('risk')) {
    hints.title = [
      "Players command armies and try to conquer territories on a world map.",
      "Players roll dice to attack territories controlled by other players.",
      "You must defend your territories from attacks by other players.",
      "Players receive reinforcements based on territories they control.",
      "The goal is to eliminate all other players from the world map.",
      "Players can form alliances and betray each other during the game."
    ];
    hints.image = [
      "The board shows a world map divided into territories.",
      "Players place colored army pieces on territories they control.",
      "The map shows continents with different colored territories.",
      "Players can see army concentrations and territorial control.",
      "The board includes dice for resolving combat between armies.",
      "Players compete to control the most territories on the world map."
    ];
    hints.card = [
      "This card shows a territory that players can attack or defend.",
      "Players must control territories to receive reinforcements.",
      "The card represents strategic value of different world regions.",
      "Players use these cards to plan their global conquest strategy.",
      "The card shows the importance of controlling certain territories.",
      "These cards help players understand territorial advantages."
    ];
  } else if (name.includes('scrabble')) {
    hints.title = [
      "Players create words on a grid using letter tiles with point values.",
      "Players draw letter tiles and try to form words on the board.",
      "Words must connect to existing words already on the board.",
      "Special squares multiply letter or word scores.",
      "Players compete to score the most points with their words.",
      "The game ends when all tiles are used or no more words can be formed."
    ];
    hints.image = [
      "The board shows a 15x15 grid with special colored squares.",
      "Players place letter tiles on the grid to form words.",
      "The board displays different colored squares for bonus points.",
      "Players can see words already formed on the board.",
      "The game includes letter tiles with different point values.",
      "Players compete to create the highest-scoring words."
    ];
    hints.card = [
      "This card shows a letter tile with its point value.",
      "Players use these letter tiles to form words on the board.",
      "The card shows how many points the letter is worth.",
      "Players must use these tiles to create valid words.",
      "The card represents the building blocks of words.",
      "These tiles determine what words players can create."
    ];
  } else if (name.includes('clue') || name.includes('cluedo')) {
    hints.title = [
      "Players solve a murder mystery by gathering clues about who, where, and with what.",
      "Players move around a mansion to gather information about the crime.",
      "Players make suggestions and other players must show relevant cards.",
      "Players use process of elimination to figure out the solution.",
      "The game includes suspect, weapon, and room cards.",
      "Players compete to be the first to correctly solve the murder mystery."
    ];
    hints.image = [
      "The board shows a mansion with different rooms connected by hallways.",
      "Players move their tokens around the mansion to investigate.",
      "The board displays different rooms where the murder could have occurred.",
      "Players can see the mansion layout and room connections.",
      "The game includes suspect tokens, weapon tokens, and room cards.",
      "Players compete to gather clues about the murder mystery."
    ];
    hints.card = [
      "This card shows a suspect, weapon, or room involved in the murder.",
      "Players use these cards to make suggestions about the crime.",
      "The card represents evidence that helps solve the mystery.",
      "Players must eliminate possibilities to find the solution.",
      "The card shows information that other players must reveal.",
      "These cards contain the clues needed to solve the murder."
    ];
  } else if (name.includes('battleship')) {
    hints.title = [
      "Players hide their fleet of ships on a hidden grid.",
      "Players call out coordinates to attack the opponent's grid.",
      "Players must guess where the opponent's ships are located.",
      "Ships are placed on a hidden grid that the opponent cannot see.",
      "The game includes different sized ships with different hit points.",
      "The goal is to sink all of the opponent's ships first."
    ];
    hints.image = [
      "The board shows two grids: one for your ships and one for attacks.",
      "Players place ship pieces on their hidden grid.",
      "The board displays coordinate systems for targeting attacks.",
      "Players can see their own ships but not the opponent's.",
      "The game includes different sized ships: carrier, battleship, cruiser, submarine, destroyer.",
      "Players compete to find and sink all enemy ships."
    ];
    hints.card = [
      "This card shows a ship that players must hide on their grid.",
      "Players place these ships in secret locations.",
      "The card shows the ship's size and hit points.",
      "Players must protect these ships from enemy attacks.",
      "The card represents a naval vessel in the fleet.",
      "These ships determine the player's defensive strategy."
    ];
  } else if (name.includes('connect') && name.includes('four')) {
    hints.title = [
      "Players drop colored discs into a vertical grid.",
      "Players take turns dropping one disc at a time.",
      "The goal is to connect four discs of the same color.",
      "The connection can be horizontal, vertical, or diagonal.",
      "Players must block the opponent from getting four in a row.",
      "The game ends when someone gets four in a row or the board is full."
    ];
    hints.image = [
      "The board shows a vertical grid with holes for dropping discs.",
      "Players drop colored discs that fall to the bottom of each column.",
      "The board displays a 7x6 grid for disc placement.",
      "Players can see all placed discs and plan their strategy.",
      "The game includes red and yellow discs for the two players.",
      "Players compete to create the first line of four connected discs."
    ];
    hints.card = [
      "This card shows a disc that players drop into the grid.",
      "Players use these discs to create lines of four.",
      "The card shows the disc's color and strategic value.",
      "Players must place these discs to block opponents.",
      "The card represents a move in the strategic game.",
      "These discs determine the player's winning strategy."
    ];
  } else if (name.includes('jenga')) {
    hints.title = [
      "Players take turns removing blocks from a tower.",
      "Players can only use one hand to remove blocks.",
      "Blocks are removed from below and placed on top.",
      "The tower becomes increasingly unstable as blocks are removed.",
      "Players must not make the tower fall during their turn.",
      "The goal is to not be the player who makes the tower fall."
    ];
    hints.image = [
      "The board shows a tower made of wooden blocks.",
      "Players carefully remove blocks from the tower structure.",
      "The board displays the precarious balance of the tower.",
      "Players can see which blocks are safe to remove.",
      "The game includes wooden blocks in a tower formation.",
      "Players compete to maintain the tower's stability."
    ];
    hints.card = [
      "This card shows a block that can be removed from the tower.",
      "Players must carefully choose which blocks to remove.",
      "The card shows the block's position and stability.",
      "Players must consider the tower's balance when removing blocks.",
      "The card represents a potential move in the game.",
      "These blocks determine the tower's structural integrity."
    ];
  } else if (name.includes('uno')) {
    hints.title = [
      "Players try to get rid of all their cards first.",
      "Cards must match the color or number of the previous card.",
      "Special cards can change the color or skip players.",
      "Players must say 'UNO' when they have one card left.",
      "The game includes numbered cards and special action cards.",
      "Players compete to be the first to empty their hand."
    ];
    hints.image = [
      "The board shows a discard pile with the top card visible.",
      "Players hold cards in their hands during the game.",
      "The board displays the current color and number to match.",
      "Players can see the discard pile and plan their moves.",
      "The game includes colorful cards with numbers and symbols.",
      "Players compete to match cards and empty their hands."
    ];
    hints.card = [
      "This card shows a number or special action that can be played.",
      "Players must match the color or number of the previous card.",
      "The card shows its color, number, or special effect.",
      "Players can use these cards to change the game state.",
      "The card represents a playable action in the game.",
      "These cards determine the player's available moves."
    ];
  } else if (name.includes('poker')) {
    hints.title = [
      "Players bet on the strength of their card combinations.",
      "Players can bet, call, raise, or fold during each round.",
      "Hand rankings include pairs, straights, flushes, and full houses.",
      "Players try to have the best hand or make others fold.",
      "The game uses a standard 52-card deck.",
      "Players compete to win the most chips or money."
    ];
    hints.image = [
      "The board shows a poker table with community cards.",
      "Players hold private cards and share community cards.",
      "The board displays the betting pot and current bets.",
      "Players can see the community cards and plan their strategy.",
      "The game includes chips for betting and card combinations.",
      "Players compete to create the best five-card hand."
    ];
    hints.card = [
      "This card shows a playing card with suit and rank.",
      "Players use these cards to create winning combinations.",
      "The card shows its value and potential in hand rankings.",
      "Players must evaluate these cards for betting decisions.",
      "The card represents part of a potential winning hand.",
      "These cards determine the player's betting strategy."
    ];
  } else if (name.includes('blackjack')) {
    hints.title = [
      "Players try to get as close to 21 as possible without going over.",
      "Players compete against the dealer, not each other.",
      "Face cards are worth 10, aces can be 1 or 11.",
      "Players can hit, stand, double down, or split pairs.",
      "The dealer must follow specific rules for hitting and standing.",
      "Players compete to beat the dealer's hand without busting."
    ];
    hints.image = [
      "The board shows a blackjack table with betting areas.",
      "Players place bets and receive cards from the dealer.",
      "The board displays the dealer's cards and player hands.",
      "Players can see their cards and the dealer's up card.",
      "The game includes chips for betting and standard playing cards.",
      "Players compete to get closer to 21 than the dealer."
    ];
    hints.card = [
      "This card shows a playing card with its blackjack value.",
      "Players use these cards to build hands totaling close to 21.",
      "The card shows its numerical value in the game.",
      "Players must decide whether to hit or stand based on these cards.",
      "The card represents part of a potential winning hand.",
      "These cards determine the player's blackjack strategy."
    ];
  } else if (name.includes('solitaire')) {
    hints.title = [
      "Players arrange cards in specific sequences and suits.",
      "Cards are arranged in descending order with alternating colors.",
      "Players can move groups of cards if they are in sequence.",
      "The goal is to move all cards to foundation piles.",
      "The game is typically played solo with a standard deck.",
      "Players compete against themselves to solve the puzzle."
    ];
    hints.image = [
      "The board shows a solitaire layout with multiple card piles.",
      "Players arrange cards in specific patterns on the table.",
      "The board displays foundation piles and tableau columns.",
      "Players can see all cards and plan their moves.",
      "The game includes a standard 52-card deck in solitaire layout.",
      "Players compete to organize all cards into foundation piles."
    ];
    hints.card = [
      "This card shows a playing card that must be arranged.",
      "Players use these cards to build sequences and suits.",
      "The card shows its suit and rank for arrangement.",
      "Players must place these cards in the correct order.",
      "The card represents part of the solitaire puzzle.",
      "These cards determine the player's arrangement strategy."
    ];
  } else if (name.includes('rummy')) {
    hints.title = [
      "Players try to form sets and runs with their cards.",
      "Sets are three or more cards of the same rank.",
      "Runs are three or more consecutive cards of the same suit.",
      "Players draw and discard cards to improve their hand.",
      "The goal is to be the first to get rid of all cards.",
      "Players compete to create valid combinations and go out."
    ];
    hints.image = [
      "The board shows a rummy table with discard and draw piles.",
      "Players hold cards in their hands and arrange them.",
      "The board displays the discard pile and draw pile.",
      "Players can see the discard pile and plan their moves.",
      "The game includes standard playing cards in rummy layout.",
      "Players compete to create sets and runs with their cards."
    ];
    hints.card = [
      "This card shows a playing card that can form sets or runs.",
      "Players use these cards to create valid combinations.",
      "The card shows its suit and rank for combination building.",
      "Players must arrange these cards into sets or runs.",
      "The card represents part of a potential winning combination.",
      "These cards determine the player's rummy strategy."
    ];
  } else if (name.includes('go fish')) {
    hints.title = [
      "Players ask other players for specific cards.",
      "If the player has the card, they must give it up.",
      "If not, the asking player draws from the deck.",
      "Players try to collect sets of four cards of the same rank.",
      "The game is typically played with 2-6 players.",
      "Players compete to collect the most complete sets."
    ];
    hints.image = [
      "The board shows a go fish table with players' hands.",
      "Players hold cards and ask others for specific cards.",
      "The board displays the draw pile and players' hands.",
      "Players can see their own cards but not others'.",
      "The game includes standard playing cards in go fish layout.",
      "Players compete to collect sets of four matching cards."
    ];
    hints.card = [
      "This card shows a playing card that players can request.",
      "Players use these cards to build sets of four.",
      "The card shows its rank and potential for set building.",
      "Players must ask for these cards to complete sets.",
      "The card represents part of a potential set.",
      "These cards determine the player's asking strategy."
    ];
  } else if (name.includes('war')) {
    hints.title = [
      "Players flip cards simultaneously and compare values.",
      "The player with the higher card wins both cards.",
      "If cards are equal, players go to 'war' and flip more cards.",
      "The goal is to collect all the cards in the deck.",
      "The game uses a standard 52-card deck.",
      "Players compete to win all cards through card battles."
    ];
    hints.image = [
      "The board shows a war game with face-down card piles.",
      "Players flip cards simultaneously to compare values.",
      "The board displays the card piles and battle area.",
      "Players can see the cards being compared in battle.",
      "The game includes standard playing cards in war layout.",
      "Players compete to win cards through simultaneous flips."
    ];
    hints.card = [
      "This card shows a playing card with its battle value.",
      "Players use these cards to battle against opponents.",
      "The card shows its rank and battle strength.",
      "Players must flip these cards to determine battle winners.",
      "The card represents a soldier in the card war.",
      "These cards determine the outcome of card battles."
    ];
  } else if (name.includes('old maid')) {
    hints.title = [
      "Players try to get rid of all their cards by making pairs.",
      "Players draw cards from other players' hands.",
      "The player left with the odd card (Old Maid) loses.",
      "Players can only see the backs of cards they draw.",
      "The game is typically played with 3-8 players.",
      "Players compete to avoid being left with the Old Maid."
    ];
    hints.image = [
      "The board shows an old maid game with players' hands.",
      "Players hold cards and try to make pairs.",
      "The board displays the card exchange area.",
      "Players can see their own cards but not others'.",
      "The game includes standard playing cards with one odd card.",
      "Players compete to pair all cards and avoid the Old Maid."
    ];
    hints.card = [
      "This card shows a playing card that can form pairs.",
      "Players use these cards to create matching pairs.",
      "The card shows its rank and pairing potential.",
      "Players must match these cards to eliminate them.",
      "The card represents part of a potential pair.",
      "These cards determine the player's pairing strategy."
    ];
  } else if (name.includes('snap')) {
    hints.title = [
      "Players flip cards simultaneously and try to match them.",
      "When cards match, players race to say 'Snap!' first.",
      "The first player to say 'Snap!' wins all the cards.",
      "The goal is to collect all the cards in the deck.",
      "The game requires quick reflexes and attention.",
      "Players compete to be the fastest to recognize matches."
    ];
    hints.image = [
      "The board shows a snap game with face-up card piles.",
      "Players flip cards simultaneously to find matches.",
      "The board displays the card piles and snap area.",
      "Players can see the cards being flipped for matches.",
      "The game includes standard playing cards in snap layout.",
      "Players compete to be the first to spot matching cards."
    ];
    hints.card = [
      "This card shows a playing card that can match others.",
      "Players use these cards to create snap opportunities.",
      "The card shows its suit and rank for matching.",
      "Players must quickly recognize when cards match.",
      "The card represents a potential snap match.",
      "These cards determine the player's snap reaction speed."
    ];
  } else if (name.includes('memory') || name.includes('concentration')) {
    hints.title = [
      "Players flip cards to find matching pairs.",
      "Players can only see two cards at a time.",
      "If cards match, the player keeps them and goes again.",
      "If not, the cards are flipped back over.",
      "The goal is to find the most matching pairs.",
      "Players compete to have the best memory and concentration."
    ];
    hints.image = [
      "The board shows a memory game with face-down cards.",
      "Players flip cards to find matching pairs.",
      "The board displays the card grid and matching area.",
      "Players can see the cards they've flipped.",
      "The game includes matching cards in a grid layout.",
      "Players compete to remember card positions and find pairs."
    ];
    hints.card = [
      "This card shows an image that can match another card.",
      "Players use these cards to create matching pairs.",
      "The card shows its image and pairing potential.",
      "Players must remember where these cards are located.",
      "The card represents part of a potential matching pair.",
      "These cards determine the player's memory strategy."
    ];
  } else if (name.includes('hearts')) {
    hints.title = [
      "Players try to avoid taking penalty cards.",
      "Hearts and the Queen of Spades are penalty cards.",
      "Players must follow suit if possible.",
      "The goal is to have the lowest score.",
      "The game is typically played with four players.",
      "Players compete to avoid penalty points and win tricks."
    ];
    hints.image = [
      "The board shows a hearts game with four players.",
      "Players play cards in tricks to avoid penalties.",
      "The board displays the trick area and scoring.",
      "Players can see the cards played in each trick.",
      "The game includes standard playing cards in hearts layout.",
      "Players compete to avoid taking penalty cards."
    ];
    hints.card = [
      "This card shows a playing card that can be played in tricks.",
      "Players use these cards to avoid taking penalties.",
      "The card shows its suit and potential penalty value.",
      "Players must follow suit when possible.",
      "The card represents a potential penalty or safe play.",
      "These cards determine the player's hearts strategy."
    ];
  } else if (name.includes('spades')) {
    hints.title = [
      "Players bid on how many tricks they will take.",
      "Spades are always trump cards.",
      "Players must follow suit if possible.",
      "The goal is to fulfill your bid and score points.",
      "The game is typically played with four players.",
      "Players compete to make accurate bids and win tricks."
    ];
    hints.image = [
      "The board shows a spades game with four players.",
      "Players bid on tricks and play cards to win them.",
      "The board displays the bidding area and trick area.",
      "Players can see the cards played in each trick.",
      "The game includes standard playing cards in spades layout.",
      "Players compete to fulfill their bids and score points."
    ];
    hints.card = [
      "This card shows a playing card that can win tricks.",
      "Players use these cards to fulfill their bids.",
      "The card shows its suit and trick-winning potential.",
      "Players must follow suit when possible.",
      "The card represents a potential trick winner.",
      "These cards determine the player's spades strategy."
    ];
  } else if (name.includes('bridge')) {
    hints.title = [
      "Players bid on how many tricks they will take.",
      "The game has a complex bidding system.",
      "Players must follow suit if possible.",
      "The goal is to fulfill your contract.",
      "The game is typically played with four players.",
      "Players compete to make accurate bids and fulfill contracts."
    ];
    hints.image = [
      "The board shows a bridge game with four players.",
      "Players bid on contracts and play cards to fulfill them.",
      "The board displays the bidding area and trick area.",
      "Players can see the cards played in each trick.",
      "The game includes standard playing cards in bridge layout.",
      "Players compete to fulfill their contracts and score points."
    ];
    hints.card = [
      "This card shows a playing card that can fulfill contracts.",
      "Players use these cards to win tricks and fulfill bids.",
      "The card shows its suit and contract-fulfilling potential.",
      "Players must follow suit when possible.",
      "The card represents a potential contract fulfiller.",
      "These cards determine the player's bridge strategy."
    ];
  } else if (name.includes('euchre')) {
    hints.title = [
      "Players bid on how many tricks they will take.",
      "The game uses a 24-card deck.",
      "Players must follow suit if possible.",
      "The goal is to fulfill your bid.",
      "The game is typically played with four players.",
      "Players compete to make accurate bids and win tricks."
    ];
    hints.image = [
      "The board shows an euchre game with four players.",
      "Players bid on tricks and play cards to win them.",
      "The board displays the bidding area and trick area.",
      "Players can see the cards played in each trick.",
      "The game includes a 24-card deck in euchre layout.",
      "Players compete to fulfill their bids and score points."
    ];
    hints.card = [
      "This card shows a playing card that can win tricks.",
      "Players use these cards to fulfill their bids.",
      "The card shows its suit and trick-winning potential.",
      "Players must follow suit when possible.",
      "The card represents a potential trick winner.",
      "These cards determine the player's euchre strategy."
    ];
  } else if (name.includes('pinochle')) {
    hints.title = [
      "Players bid on how many points they will score.",
      "The game uses a 48-card deck with duplicates.",
      "Players must follow suit if possible.",
      "The goal is to fulfill your bid.",
      "The game is typically played with four players.",
      "Players compete to make accurate bids and score points."
    ];
    hints.image = [
      "The board shows a pinochle game with four players.",
      "Players bid on points and play cards to score them.",
      "The board displays the bidding area and scoring area.",
      "Players can see the cards played in each trick.",
      "The game includes a 48-card deck with duplicates.",
      "Players compete to fulfill their bids and score points."
    ];
    hints.card = [
      "This card shows a playing card that can score points.",
      "Players use these cards to fulfill their bids.",
      "The card shows its suit and point-scoring potential.",
      "Players must follow suit when possible.",
      "The card represents a potential point scorer.",
      "These cards determine the player's pinochle strategy."
    ];
  } else if (name.includes('canasta')) {
    hints.title = [
      "Players try to form melds of seven cards.",
      "Melds can be sets or sequences.",
      "Players draw and discard cards to improve their hand.",
      "The goal is to be the first to go out.",
      "The game is typically played with four players.",
      "Players compete to create valid melds and go out first."
    ];
    hints.image = [
      "The board shows a canasta game with four players.",
      "Players form melds and draw cards to improve their hands.",
      "The board displays the meld area and draw pile.",
      "Players can see their own melds and plan their moves.",
      "The game includes standard playing cards in canasta layout.",
      "Players compete to create valid melds and go out first."
    ];
    hints.card = [
      "This card shows a playing card that can form melds.",
      "Players use these cards to create valid combinations.",
      "The card shows its suit and rank for meld building.",
      "Players must arrange these cards into sets or sequences.",
      "The card represents part of a potential meld.",
      "These cards determine the player's canasta strategy."
    ];
  } else if (name.includes('gin rummy')) {
    hints.title = [
      "Players try to form sets and runs with their cards.",
      "Sets are three or more cards of the same rank.",
      "Runs are three or more consecutive cards of the same suit.",
      "Players draw and discard cards to improve their hand.",
      "The goal is to be the first to go out.",
      "Players compete to create valid combinations and go out first."
    ];
    hints.image = [
      "The board shows a gin rummy game with two players.",
      "Players form sets and runs and draw cards to improve their hands.",
      "The board displays the meld area and draw pile.",
      "Players can see their own combinations and plan their moves.",
      "The game includes standard playing cards in gin rummy layout.",
      "Players compete to create valid combinations and go out first."
    ];
    hints.card = [
      "This card shows a playing card that can form sets or runs.",
      "Players use these cards to create valid combinations.",
      "The card shows its suit and rank for combination building.",
      "Players must arrange these cards into sets or runs.",
      "The card represents part of a potential combination.",
      "These cards determine the player's gin rummy strategy."
    ];
  } else if (name.includes('cribbage')) {
    hints.title = [
      "Players try to score points by playing cards.",
      "Points are scored for combinations and totals.",
      "Players use a cribbage board to track scores.",
      "The goal is to be the first to reach 121 points.",
      "The game is typically played with two players.",
      "Players compete to score the most points through card play."
    ];
    hints.image = [
      "The board shows a cribbage game with a scoring board.",
      "Players play cards and score points for combinations.",
      "The board displays the cribbage board and card area.",
      "Players can see their cards and plan their scoring moves.",
      "The game includes a cribbage board and standard playing cards.",
      "Players compete to score points and reach 121 first."
    ];
    hints.card = [
      "This card shows a playing card that can score points.",
      "Players use these cards to create scoring combinations.",
      "The card shows its suit and rank for point scoring.",
      "Players must play these cards to score points.",
      "The card represents a potential point scorer.",
      "These cards determine the player's cribbage strategy."
    ];
  } else {
    // Generate specific hints based on game name patterns
    const specificHints = generateSpecificHints(gameName);
    hints.title = specificHints.title;
    hints.image = specificHints.image;
    hints.card = specificHints.card;
  }

  return hints;
}

// Generate specific hints based on game name patterns and themes
function generateSpecificHints(gameName) {
  const name = gameName.toLowerCase();
  const hints = {
    title: [],
    image: [],
    card: []
  };

  // Theme-based hint generation
  if (name.includes('space') || name.includes('galaxy') || name.includes('cosmic')) {
    hints.title = [
      "Players explore and colonize planets in outer space.",
      "The game involves managing resources across different star systems.",
      "Players build space stations and interstellar trade routes.",
      "The game includes alien species and space technology.",
      "Players compete to control the most valuable planets.",
      "The game features spaceships, planets, and cosmic exploration."
    ];
    hints.image = [
      "The board shows a galaxy map with planets and star systems.",
      "Players place spaceships and colonies on different planets.",
      "The board displays space routes and planetary resources.",
      "Players can see alien worlds and space stations.",
      "The game includes colorful planets and cosmic backgrounds.",
      "Players compete to control the most strategic space territories."
    ];
    hints.card = [
      "This card shows a planet with unique resources and abilities.",
      "Players use these cards to colonize and exploit planets.",
      "The card shows space technology or alien species.",
      "Players must manage these cards to expand their space empire.",
      "The card represents a cosmic discovery or space technology.",
      "These cards determine the player's space exploration strategy."
    ];
  } else if (name.includes('medieval') || name.includes('castle') || name.includes('kingdom')) {
    hints.title = [
      "Players build castles and manage medieval kingdoms.",
      "The game involves managing knights, peasants, and royal courts.",
      "Players compete to control territories and build fortifications.",
      "The game includes medieval warfare and political intrigue.",
      "Players must balance military power with economic development.",
      "The game features castles, knights, and medieval politics."
    ];
    hints.image = [
      "The board shows a medieval landscape with castles and villages.",
      "Players place knights and buildings on the medieval map.",
      "The board displays castles, villages, and medieval territories.",
      "Players can see medieval architecture and fortifications.",
      "The game includes castle pieces and medieval tokens.",
      "Players compete to build the most powerful medieval kingdom."
    ];
    hints.card = [
      "This card shows a medieval building or military unit.",
      "Players use these cards to develop their medieval kingdom.",
      "The card shows knights, castles, or medieval technology.",
      "Players must manage these cards to expand their realm.",
      "The card represents medieval power or political influence.",
      "These cards determine the player's medieval strategy."
    ];
  } else if (name.includes('fantasy') || name.includes('dragon') || name.includes('magic')) {
    hints.title = [
      "Players cast spells and battle with magical creatures.",
      "The game involves collecting mana and summoning creatures.",
      "Players compete to control magical territories and artifacts.",
      "The game includes wizards, dragons, and fantasy creatures.",
      "Players must balance magical power with resource management.",
      "The game features spells, magic items, and fantasy adventures."
    ];
    hints.image = [
      "The board shows a fantasy world with magical landscapes.",
      "Players place wizards and magical creatures on the board.",
      "The board displays magical territories and spell effects.",
      "Players can see dragons, wizards, and fantasy creatures.",
      "The game includes magical tokens and fantasy artwork.",
      "Players compete to control the most magical territories."
    ];
    hints.card = [
      "This card shows a spell or magical creature.",
      "Players use these cards to cast spells and summon creatures.",
      "The card shows magical abilities or fantasy powers.",
      "Players must manage these cards to build their magical arsenal.",
      "The card represents magical knowledge or fantasy power.",
      "These cards determine the player's magical strategy."
    ];
  } else if (name.includes('pirates') || name.includes('treasure') || name.includes('ocean')) {
    hints.title = [
      "Players sail ships and search for buried treasure.",
      "The game involves navigating ocean routes and avoiding storms.",
      "Players compete to find the most valuable treasure chests.",
      "The game includes pirate ships, treasure maps, and sea battles.",
      "Players must balance exploration with avoiding other pirates.",
      "The game features treasure hunting and naval combat."
    ];
    hints.image = [
      "The board shows an ocean map with islands and treasure locations.",
      "Players place pirate ships on ocean routes.",
      "The board displays treasure islands and sea routes.",
      "Players can see pirate ships and treasure chests.",
      "The game includes ocean tiles and pirate-themed artwork.",
      "Players compete to control the most profitable sea routes."
    ];
    hints.card = [
      "This card shows a treasure chest or pirate ship.",
      "Players use these cards to navigate and find treasure.",
      "The card shows pirate abilities or treasure values.",
      "Players must manage these cards to build their pirate fleet.",
      "The card represents pirate knowledge or treasure hunting skills.",
      "These cards determine the player's pirate strategy."
    ];
  } else if (name.includes('zombie') || name.includes('horror') || name.includes('survival')) {
    hints.title = [
      "Players fight zombies and try to survive the apocalypse.",
      "The game involves scavenging resources and avoiding zombie hordes.",
      "Players compete to be the last survivors in a zombie outbreak.",
      "The game includes weapons, food, and zombie encounters.",
      "Players must balance survival needs with zombie threats.",
      "The game features post-apocalyptic survival and zombie combat."
    ];
    hints.image = [
      "The board shows a post-apocalyptic city overrun by zombies.",
      "Players place survivors and zombies on the urban map.",
      "The board displays buildings, streets, and zombie spawn points.",
      "Players can see survivors, zombies, and abandoned buildings.",
      "The game includes zombie tokens and survival equipment.",
      "Players compete to survive the longest in the zombie apocalypse."
    ];
    hints.card = [
      "This card shows a weapon or survival item.",
      "Players use these cards to fight zombies and survive.",
      "The card shows survival abilities or zombie threats.",
      "Players must manage these cards to stay alive.",
      "The card represents survival knowledge or combat skills.",
      "These cards determine the player's survival strategy."
    ];
  } else if (name.includes('racing') || name.includes('car') || name.includes('speed')) {
    hints.title = [
      "Players race cars around tracks and try to finish first.",
      "The game involves managing speed, fuel, and racing strategy.",
      "Players compete to win races and earn championship points.",
      "The game includes race cars, tracks, and racing conditions.",
      "Players must balance speed with control and fuel management.",
      "The game features high-speed racing and competitive driving."
    ];
    hints.image = [
      "The board shows a race track with cars and racing positions.",
      "Players place race cars on the track and move them forward.",
      "The board displays racing lanes, pit stops, and finish lines.",
      "Players can see race cars, tracks, and racing equipment.",
      "The game includes racing tokens and track pieces.",
      "Players compete to cross the finish line first."
    ];
    hints.card = [
      "This card shows a race car or racing action.",
      "Players use these cards to accelerate and maneuver.",
      "The card shows racing abilities or speed bonuses.",
      "Players must manage these cards to win races.",
      "The card represents racing skills or car performance.",
      "These cards determine the player's racing strategy."
    ];
  } else if (name.includes('war') || name.includes('battle') || name.includes('army')) {
    hints.title = [
      "Players command armies and engage in tactical warfare.",
      "The game involves moving military units and attacking enemies.",
      "Players compete to control territories and eliminate opponents.",
      "The game includes soldiers, tanks, and military equipment.",
      "Players must balance offense with defense and resource management.",
      "The game features military strategy and battlefield tactics."
    ];
    hints.image = [
      "The board shows a battlefield with military units and terrain.",
      "Players place soldiers and military equipment on the battlefield.",
      "The board displays battle lines, fortifications, and strategic positions.",
      "Players can see military units, weapons, and battlefield conditions.",
      "The game includes military tokens and battlefield artwork.",
      "Players compete to control the most strategic battlefield positions."
    ];
    hints.card = [
      "This card shows a military unit or weapon.",
      "Players use these cards to attack and defend.",
      "The card shows military abilities or combat bonuses.",
      "Players must manage these cards to build their army.",
      "The card represents military power or tactical advantage.",
      "These cards determine the player's military strategy."
    ];
  } else if (name.includes('city') || name.includes('urban') || name.includes('metropolis')) {
    hints.title = [
      "Players build cities and manage urban development.",
      "The game involves constructing buildings and managing city services.",
      "Players compete to build the most prosperous city.",
      "The game includes residential, commercial, and industrial zones.",
      "Players must balance growth with infrastructure and services.",
      "The game features city planning and urban management."
    ];
    hints.image = [
      "The board shows a city grid with buildings and infrastructure.",
      "Players place buildings and city services on the urban map.",
      "The board displays city blocks, roads, and public services.",
      "Players can see skyscrapers, houses, and city infrastructure.",
      "The game includes building pieces and city tokens.",
      "Players compete to build the most successful city."
    ];
    hints.card = [
      "This card shows a building or city service.",
      "Players use these cards to develop their city.",
      "The card shows building types or city improvements.",
      "Players must manage these cards to grow their city.",
      "The card represents urban development or city planning.",
      "These cards determine the player's city building strategy."
    ];
  } else if (name.includes('farm') || name.includes('agriculture') || name.includes('crop')) {
    hints.title = [
      "Players manage farms and grow crops for profit.",
      "The game involves planting seeds, harvesting crops, and selling produce.",
      "Players compete to build the most profitable farm.",
      "The game includes crops, livestock, and farming equipment.",
      "Players must balance planting with harvesting and market timing.",
      "The game features agricultural management and farming strategy."
    ];
    hints.image = [
      "The board shows farmland with crops and farming equipment.",
      "Players place crops and farm buildings on the agricultural map.",
      "The board displays fields, barns, and farming infrastructure.",
      "Players can see crops, animals, and farming equipment.",
      "The game includes farming tokens and agricultural artwork.",
      "Players compete to build the most productive farm."
    ];
    hints.card = [
      "This card shows a crop or farming equipment.",
      "Players use these cards to grow and harvest crops.",
      "The card shows farming abilities or crop values.",
      "Players must manage these cards to run their farm.",
      "The card represents agricultural knowledge or farming skills.",
      "These cards determine the player's farming strategy."
    ];
  } else if (name.includes('train') || name.includes('railroad') || name.includes('railway')) {
    hints.title = [
      "Players build railroad networks and transport goods.",
      "The game involves laying track and connecting cities.",
      "Players compete to build the most profitable railway system.",
      "The game includes trains, tracks, and transportation routes.",
      "Players must balance track construction with train operations.",
      "The game features railway management and transportation strategy."
    ];
    hints.image = [
      "The board shows a map with cities and railway routes.",
      "Players place train tracks and stations on the map.",
      "The board displays railway lines, stations, and cargo routes.",
      "Players can see trains, tracks, and railway infrastructure.",
      "The game includes railway tokens and transportation artwork.",
      "Players compete to control the most profitable railway routes."
    ];
    hints.card = [
      "This card shows a train or railway route.",
      "Players use these cards to build and operate railways.",
      "The card shows transportation abilities or route values.",
      "Players must manage these cards to expand their railway network.",
      "The card represents railway knowledge or transportation skills.",
      "These cards determine the player's railway strategy."
    ];
  } else if (name.includes('mystery') || name.includes('detective') || name.includes('crime')) {
    hints.title = [
      "Players solve mysteries and investigate crimes.",
      "The game involves gathering clues and questioning suspects.",
      "Players compete to solve cases and catch criminals.",
      "The game includes evidence, suspects, and crime scenes.",
      "Players must balance investigation with deduction and logic.",
      "The game features detective work and mystery solving."
    ];
    hints.image = [
      "The board shows crime scenes and investigation locations.",
      "Players place evidence and suspects on the investigation map.",
      "The board displays crime scenes, evidence, and suspect locations.",
      "Players can see detective tools, evidence, and crime scenes.",
      "The game includes investigation tokens and mystery artwork.",
      "Players compete to solve the most cases."
    ];
    hints.card = [
      "This card shows evidence or a suspect.",
      "Players use these cards to investigate and solve crimes.",
      "The card shows investigation abilities or evidence values.",
      "Players must manage these cards to build their case.",
      "The card represents detective knowledge or investigation skills.",
      "These cards determine the player's investigation strategy."
    ];
  } else {
    // Last resort - still better than the old generic hints
    hints.title = [
      "Players take turns placing pieces on a game board.",
      "The game involves collecting specific game components.",
      "Players compete to achieve the highest score.",
      "The game includes unique game pieces and board spaces.",
      "Players must plan their moves carefully to win.",
      "The game features competitive gameplay and strategic decisions."
    ];
    hints.image = [
      "Players place game pieces on a colorful game board.",
      "The game involves moving tokens between board spaces.",
      "Players compete to control the most valuable board areas.",
      "The game includes distinctive game pieces and board artwork.",
      "Players must observe the board state to plan their moves.",
      "The game features visual strategy and spatial planning."
    ];
    hints.card = [
      "Players use cards to perform actions during their turn.",
      "The game involves collecting cards with different abilities.",
      "Players compete to play the most valuable cards.",
      "The game includes cards with unique effects and values.",
      "Players must choose which cards to play and when.",
      "The game features card-based strategy and hand management."
    ];
  }

  return hints;
}

async function generateAllHints() {
  console.log('Starting to generate hints for all games...');
  
  try {
    // Clear existing hints
    await prisma.boardleHint.deleteMany({});
    console.log('Cleared existing hints.');
    
    // Read all game lists
    const titleGames = readGameList('title-mode-games-list.txt');
    const imageGames = readGameList('image-mode-games-list.txt');
    const cardGames = readGameList('card-mode-games-list.txt');
    
    console.log(`Found ${titleGames.length} title games, ${imageGames.length} image games, ${cardGames.length} card games`);
    
    let totalHints = 0;
    
    // Generate hints for title mode games
    for (const gameName of titleGames) {
      const hints = generateHints(gameName);
      for (let i = 0; i < hints.title.length; i++) {
        await prisma.boardleHint.create({
          data: {
            gameName: gameName,
            gameMode: 'title',
            hintText: hints.title[i],
            hintOrder: i + 1
          }
        });
        totalHints++;
      }
    }
    
    // Generate hints for image mode games
    for (const gameName of imageGames) {
      const hints = generateHints(gameName);
      for (let i = 0; i < hints.image.length; i++) {
        await prisma.boardleHint.create({
          data: {
            gameName: gameName,
            gameMode: 'image',
            hintText: hints.image[i],
            hintOrder: i + 1
          }
        });
        totalHints++;
      }
    }
    
    // Generate hints for card mode games
    for (const gameName of cardGames) {
      const hints = generateHints(gameName);
      for (let i = 0; i < hints.card.length; i++) {
        await prisma.boardleHint.create({
          data: {
            gameName: gameName,
            gameMode: 'card',
            hintText: hints.card[i],
            hintOrder: i + 1
          }
        });
        totalHints++;
      }
    }
    
    console.log(`Successfully generated ${totalHints} hints for all games!`);
    
  } catch (error) {
    console.error('Error generating hints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the generation script
generateAllHints();

