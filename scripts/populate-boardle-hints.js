const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Comprehensive hints database for Boardle games
const gameHints = {
  // Popular games with specific, helpful hints
  "Catan": {
    title: [
      "Players roll dice to collect resources from hexagonal terrain tiles.",
      "You need specific resources like wood, brick, grain, ore, and sheep to build.",
      "Players build settlements and cities on intersection points of hexes.",
      "The robber piece steals resources when a 7 is rolled.",
      "Players trade resources with each other to get what they need.",
      "The first player to reach 10 victory points wins the game."
    ],
    image: [
      "The board shows hexagonal terrain tiles in different colors.",
      "Players place wooden settlements and cities on corner intersections.",
      "Numbered tokens sit on each terrain hex to determine resource collection.",
      "Players build roads connecting their settlements across the island.",
      "The robber piece blocks resource collection when placed on a hex.",
      "Different terrain types produce different resources when rolled."
    ],
    card: [
      "This card shows the resources needed to build settlements and cities.",
      "Players must collect specific combinations of resources to build.",
      "The card represents the trading economy of the game.",
      "Different cards show different resource costs for various buildings.",
      "Players can trade these resource cards with other players.",
      "These cards are essential for expanding your settlements."
    ]
  },

  "Pandemic": {
    title: [
      "Players work together to stop the spread of diseases.",
      "You must find cures before outbreaks overwhelm the world.",
      "Each player has a unique role with special abilities.",
      "Diseases spread across a world map with major cities.",
      "Players can share knowledge cards to help find cures.",
      "The game is cooperative - you win or lose together."
    ],
    image: [
      "This game shows a world map with major cities marked.",
      "Players place disease cubes on cities to represent outbreaks.",
      "The board shows different colored disease regions.",
      "Players move their pawns between cities to take actions.",
      "Research stations can be built to help find cures.",
      "The game includes epidemic cards that accelerate disease spread."
    ],
    card: [
      "This card shows a city name and disease color.",
      "Players use these cards to move between cities.",
      "Cards are essential for building research stations.",
      "Players must collect sets of cards to find cures.",
      "The card shows the city's location on the world map.",
      "These cards can be shared between players in the same city."
    ]
  },

  "Chess": {
    title: [
      "A strategic board game played on an 8x8 grid.",
      "Each player starts with 16 pieces of different types.",
      "The goal is to checkmate the opponent's king.",
      "Pieces move in specific patterns across the board.",
      "Players take turns moving one piece per turn.",
      "The game has been played for over 1000 years."
    ],
    image: [
      "This game is played on a checkered 8x8 board.",
      "Players have pieces of two different colors.",
      "The board shows alternating light and dark squares.",
      "Pieces are placed in specific starting positions.",
      "The game includes kings, queens, rooks, bishops, knights, and pawns.",
      "Players move pieces according to specific rules for each type."
    ],
    card: [
      "This card shows a chess piece with its movement pattern.",
      "Different pieces have different ways of moving.",
      "The card illustrates the strategic possibilities of the piece.",
      "Players use these movement patterns to plan their strategy.",
      "The card shows the piece's value and importance.",
      "Understanding these patterns is key to winning the game."
    ]
  },

  "Monopoly": {
    title: [
      "Players roll dice to move around a square board with properties.",
      "Players buy properties with game money when they land on them.",
      "Different things happen depending on which space you land on.",
      "Players collect rent from other players who land on their properties.",
      "Players can build houses and hotels to increase rent amounts.",
      "The goal is to bankrupt all other players by taking their money."
    ],
    image: [
      "The board shows a square path with properties around the edges.",
      "Players move their tokens around the board based on dice rolls.",
      "Different colored property groups are visible on the board.",
      "Players can see houses and hotels built on properties.",
      "The board includes railroads, utilities, and special spaces.",
      "Players start at 'GO' and collect money each time they pass it."
    ],
    card: [
      "This card shows a property deed with rent prices.",
      "Players must pay rent when landing on properties owned by others.",
      "The card shows how much rent increases with houses and hotels.",
      "Players can buy these properties when they land on them.",
      "The card represents ownership of a specific property.",
      "These cards show the financial value of each property."
    ]
  },

  "Ticket to Ride": {
    title: [
      "Players collect colored train cards to claim routes between cities.",
      "Players draw destination tickets showing two cities to connect.",
      "You must build train routes to complete your destination tickets.",
      "Longer routes cost more train cards but give more points.",
      "Players compete to claim routes before others take them.",
      "The goal is to score the most points from completed routes."
    ],
    image: [
      "The board shows a map with cities connected by colored routes.",
      "Players place colored train car pieces on claimed routes.",
      "Different route colors require matching colored train cards.",
      "The map shows major cities and railway connections.",
      "Players can see which routes have been claimed by opponents.",
      "The board displays the point values for different route lengths."
    ],
    card: [
      "This card shows two cities that must be connected by train routes.",
      "Players score points by completing the route shown on the card.",
      "The card shows how many points you'll earn for completing it.",
      "Players can choose which destination tickets to keep.",
      "Uncompleted tickets subtract points at the end of the game.",
      "These cards determine which routes players will try to claim."
    ]
  },

  "Wingspan": {
    title: [
      "Players attract birds to their wildlife preserves.",
      "Each bird has unique abilities and food requirements.",
      "Players collect food tokens to play bird cards.",
      "The goal is to score the most points through various means.",
      "Players can lay eggs to activate bird abilities.",
      "The game features beautiful bird illustrations."
    ],
    image: [
      "This game shows beautiful bird illustrations on cards.",
      "Players build engines of bird cards in different habitats.",
      "The board shows different habitat types: forest, grassland, wetland.",
      "Players collect colorful food tokens.",
      "The game includes egg tokens and action cubes.",
      "Players can see the detailed bird artwork on each card."
    ],
    card: [
      "This card shows a beautiful bird illustration.",
      "Each bird has specific food requirements.",
      "The card shows the bird's habitat and point value.",
      "Birds have unique abilities when activated.",
      "The card includes scientific information about the bird.",
      "Players must collect the right food to play this bird."
    ]
  },

  "Azul": {
    title: [
      "Players draft colorful tiles to create beautiful patterns.",
      "The goal is to score points by placing tiles strategically.",
      "Players must follow specific placement rules.",
      "Tiles are drafted from factory displays.",
      "Players can score bonus points for completing rows and columns.",
      "The game features beautiful Portuguese ceramic tiles."
    ],
    image: [
      "This game shows colorful geometric tiles.",
      "Players place tiles on individual player boards.",
      "The board shows a pattern of squares for tile placement.",
      "Players draft tiles from central factory displays.",
      "The game includes different colored tile types.",
      "Players can see the beautiful tile patterns being created."
    ],
    card: [
      "This card shows a pattern of colored squares.",
      "Players must match this pattern with their tiles.",
      "The card shows the scoring opportunities available.",
      "Players can see which colors are needed.",
      "The card represents the artistic aspect of the game.",
      "Completing patterns scores bonus points."
    ]
  },

  "Splendor": {
    title: [
      "Players collect gems to buy development cards.",
      "The goal is to attract nobles and reach 15 prestige points.",
      "Players can reserve cards for future purchase.",
      "Development cards provide permanent gem bonuses.",
      "Players must balance short-term and long-term strategies.",
      "The game features beautiful gem tokens."
    ],
    image: [
      "This game shows colorful gem tokens and development cards.",
      "Players collect gems to purchase cards.",
      "The board shows available development cards.",
      "Players can see the gem requirements for each card.",
      "The game includes noble tiles that provide bonus points.",
      "Players build engines of gem-producing cards."
    ],
    card: [
      "This card shows a development with gem requirements.",
      "Players must pay the required gems to purchase it.",
      "The card provides permanent gem bonuses.",
      "Some cards show prestige points for scoring.",
      "The card represents technological advancement.",
      "Players use these cards to build their gem economy."
    ]
  },

  "Gloomhaven": {
    title: [
      "Players control mercenaries in a persistent world.",
      "The game features legacy elements that change over time.",
      "Players complete scenarios to advance the story.",
      "Each character has unique abilities and equipment.",
      "The game includes tactical combat with cards.",
      "Players make choices that affect the campaign."
    ],
    image: [
      "This game shows a dungeon map with monsters and obstacles.",
      "Players place character miniatures on the board.",
      "The board shows different room layouts and connections.",
      "Players can see monster standees and tokens.",
      "The game includes various terrain and obstacle types.",
      "Players explore dungeons and fight monsters."
    ],
    card: [
      "This card shows a character ability or action.",
      "Players use these cards to perform actions in combat.",
      "The card shows initiative order and attack values.",
      "Cards can be modified with equipment and enhancements.",
      "The card represents the character's skills and abilities.",
      "Players must manage their card hand strategically."
    ]
  },

  "Terraforming Mars": {
    title: [
      "Players work to make Mars habitable by raising temperature, oxygen, and oceans.",
      "Players play project cards that represent real scientific concepts.",
      "You must pay energy, steel, titanium, and other resources to play cards.",
      "Players compete to contribute most to Mars' transformation.",
      "The game includes corporations with unique starting abilities.",
      "Players build engines to generate resources for terraforming projects."
    ],
    image: [
      "The board shows Mars being transformed with cities, forests, and oceans.",
      "Players place hexagonal tiles representing different terraforming projects.",
      "The board displays terraforming progress tracks for temperature, oxygen, and oceans.",
      "Players can see various project cards and resource cubes.",
      "The game shows realistic Mars terrain and scientific concepts.",
      "Players compete to place the most terraforming tiles on Mars."
    ],
    card: [
      "This card shows a scientific project for Mars terraforming.",
      "Players must pay specific resources to play the project card.",
      "The card shows how the project affects Mars' terraforming parameters.",
      "Projects can raise temperature, oxygen levels, or create ocean tiles.",
      "The card represents real scientific concepts and technologies.",
      "Players use these cards to advance Mars' habitability."
    ]
  },

  "Risk": {
    title: [
      "Players command armies and try to conquer territories on a world map.",
      "Players roll dice to attack territories controlled by other players.",
      "You must defend your territories from attacks by other players.",
      "Players receive reinforcements based on territories they control.",
      "The goal is to eliminate all other players from the world map.",
      "Players can form alliances and betray each other during the game."
    ],
    image: [
      "The board shows a world map divided into territories.",
      "Players place colored army pieces on territories they control.",
      "The map shows continents with different colored territories.",
      "Players can see army concentrations and territorial control.",
      "The board includes dice for resolving combat between armies.",
      "Players compete to control the most territories on the world map."
    ],
    card: [
      "This card shows a territory that players can attack or defend.",
      "Players must control territories to receive reinforcements.",
      "The card represents strategic value of different world regions.",
      "Players use these cards to plan their global conquest strategy.",
      "The card shows the importance of controlling certain territories.",
      "These cards help players understand territorial advantages."
    ]
  },

  "Scrabble": {
    title: [
      "Players create words on a grid using letter tiles with point values.",
      "Players draw letter tiles and try to form words on the board.",
      "Words must connect to existing words already on the board.",
      "Special squares multiply letter or word scores.",
      "Players compete to score the most points with their words.",
      "The game ends when all tiles are used or no more words can be formed."
    ],
    image: [
      "The board shows a 15x15 grid with special colored squares.",
      "Players place letter tiles on the grid to form words.",
      "The board displays different colored squares for bonus points.",
      "Players can see words already formed on the board.",
      "The game includes letter tiles with different point values.",
      "Players compete to create the highest-scoring words."
    ],
    card: [
      "This card shows a letter tile with its point value.",
      "Players use these letter tiles to form words on the board.",
      "The card shows how many points the letter is worth.",
      "Players must use these tiles to create valid words.",
      "The card represents the building blocks of words.",
      "These tiles determine what words players can create."
    ]
  },

  "Chess": {
    title: [
      "Players move different pieces with unique movement patterns on an 8x8 board.",
      "Each piece moves differently: pawns forward, rooks in straight lines, bishops diagonally.",
      "Players try to checkmate the opponent's king to win.",
      "Players capture opponent pieces by landing on their squares.",
      "The game includes special moves like castling and en passant.",
      "Players must protect their king while attacking the opponent's king."
    ],
    image: [
      "The board shows a checkered 8x8 grid with pieces on starting positions.",
      "Players have pieces of two different colors: white and black.",
      "The board displays alternating light and dark squares.",
      "Players can see all pieces and their current positions.",
      "The game includes kings, queens, rooks, bishops, knights, and pawns.",
      "Players compete to control the board and checkmate the opponent."
    ],
    card: [
      "This card shows a chess piece with its movement pattern.",
      "Players use these pieces to attack and defend on the board.",
      "The card shows how the piece can move and capture.",
      "Players must understand each piece's unique abilities.",
      "The card represents the strategic value of different pieces.",
      "These pieces determine the tactical possibilities in the game."
    ]
  },

  "Clue": {
    title: [
      "Players solve a murder mystery by gathering clues about who, where, and with what.",
      "Players move around a mansion to gather information about the crime.",
      "Players make suggestions and other players must show relevant cards.",
      "Players use process of elimination to figure out the solution.",
      "The game includes suspect, weapon, and room cards.",
      "Players compete to be the first to correctly solve the murder mystery."
    ],
    image: [
      "The board shows a mansion with different rooms connected by hallways.",
      "Players move their tokens around the mansion to investigate.",
      "The board displays different rooms where the murder could have occurred.",
      "Players can see the mansion layout and room connections.",
      "The game includes suspect tokens, weapon tokens, and room cards.",
      "Players compete to gather clues about the murder mystery."
    ],
    card: [
      "This card shows a suspect, weapon, or room involved in the murder.",
      "Players use these cards to make suggestions about the crime.",
      "The card represents evidence that helps solve the mystery.",
      "Players must eliminate possibilities to find the solution.",
      "The card shows information that other players must reveal.",
      "These cards contain the clues needed to solve the murder."
    ]
  }
};

async function populateHints() {
  console.log('Starting to populate Boardle hints...');
  
  try {
    // Clear existing hints
    await prisma.boardleHint.deleteMany({});
    console.log('Cleared existing hints.');
    
    let totalHints = 0;
    
    // Insert hints for each game
    for (const [gameName, modes] of Object.entries(gameHints)) {
      for (const [mode, hints] of Object.entries(modes)) {
        for (let i = 0; i < hints.length; i++) {
          await prisma.boardleHint.create({
            data: {
              gameName: gameName,
              gameMode: mode,
              hintText: hints[i],
              hintOrder: i + 1
            }
          });
          totalHints++;
        }
      }
    }
    
    console.log(`Successfully populated ${totalHints} hints for ${Object.keys(gameHints).length} games.`);
    
  } catch (error) {
    console.error('Error populating hints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the population script
populateHints();
