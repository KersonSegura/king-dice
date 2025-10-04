import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🚀 Image Mode API called');
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '50');
    
    console.log('📁 Reading games list file...');
    // Read the games list file
    const gamesListPath = path.join(process.cwd(), 'image-mode-games-list.txt');
    console.log('📁 Games list path:', gamesListPath);
    const gamesListContent = await fs.readFile(gamesListPath, 'utf-8');
    console.log('📁 Games list content length:', gamesListContent.length);
    
    // Read the zoom points file
    const zoomPointsPath = path.join(process.cwd(), 'image-mode-games-list-zoom-points.txt');
    let zoomPointsContent = '';
    try {
      zoomPointsContent = await fs.readFile(zoomPointsPath, 'utf-8');
    } catch (error) {
      console.log('⚠️ Zoom points file not found, using default middle zoom for all games');
    }
    
    // Parse zoom points into a map
    const zoomPointsMap = new Map<string, 'upper' | 'bottom'>();
    if (zoomPointsContent) {
      zoomPointsContent
        .split('\n')
        .filter((line: string) => line.trim())
        .forEach((line: string) => {
          const [filename, zoomType] = line.split(' - ').map((part: string) => part.trim());
          if (filename && zoomType) {
            if (zoomType === 'upper zoom') {
              zoomPointsMap.set(filename, 'upper');
            } else if (zoomType === 'bottom zoom') {
              zoomPointsMap.set(filename, 'bottom');
            }
          }
        });
    }
    
    // Parse the games list and filter for available images
    const availableGames = gamesListContent
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [name, imageFileName] = line.split(' -> ').map((part: string) => part.trim());
        if (!name || !imageFileName) return null;
        
        // Extract just the game name without the number prefix (e.g., "017. Abyss" -> "Abyss")
        const gameName = name.replace(/^\d+\.\s*/, '');
        
        // Check if the image file exists
        const imagePath = path.join(process.cwd(), 'public', 'boardle-images', imageFileName);
        console.log(`🔍 Checking image path: ${imagePath}`);
        if (!fsSync.existsSync(imagePath)) {
          console.log(`⚠️ Image not found for "${gameName}": ${imageFileName}`);
          return null; // Re-enable image check
        }
        
        // Determine zoom type for this game
        const zoomType = zoomPointsMap.get(imageFileName) || 'middle';
        
        return { name: gameName, imageFileName, zoomType };
      })
      .filter((game): game is { name: string; imageFileName: string; zoomType: 'upper' | 'middle' | 'bottom' } => game !== null);
    
    console.log(`🔍 Image Mode: Found ${availableGames.length} available games`);
    
    if (availableGames.length === 0) {
      return NextResponse.json({ 
        error: 'No games found for Image Mode' 
      }, { status: 500 });
    }

    // Seeded random number generator for consistent daily selection
    const seededRandom = (seed: number, max: number): number => {
      // Simple but effective seeded random algorithm
      const x = Math.sin(seed) * 10000;
      const random = x - Math.floor(x);
      return Math.floor(random * max);
    };

    // 🎯 DAILY ROTATION SYSTEM: Select one game per day in random order
    const getDailyGameIndex = (): number => {
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      
      // Use a completely different seed for Image Mode - separate from Title and Card Modes
      const seed = dayOfYear + 5000;
      const randomIndex = seededRandom(seed, availableGames.length);
      
      // Log only the day and index, not the game name
      console.log(`📅 Image Mode: Day ${dayOfYear}, random game index ${randomIndex + 1}`);
      
      return randomIndex;
    };

    // Check if shuffle parameter is provided for testing
    const shuffleParam = searchParams.get('shuffle');
    let gameIndex: number;
    
    if (shuffleParam) {
      // Use shuffle parameter for testing - generate random game
      const shuffleSeed = parseInt(shuffleParam) + Date.now();
      gameIndex = seededRandom(shuffleSeed, availableGames.length);
      console.log(`🎲 Image Mode: Shuffle mode, random game index ${gameIndex + 1}`);
    } else {
      // Normal daily rotation
      gameIndex = getDailyGameIndex();
    }

    // Get the selected game
    const dailyGame = availableGames[gameIndex];
    
    
    if (!dailyGame) {
      return NextResponse.json({ 
        error: 'Failed to get game for Image Mode' 
      }, { status: 500 });
    }
    
    // Generate specific clues for the daily game
    const generateCluesForGame = (gameName: string): string[] => {
      const clues: string[] = [];
      const lowerName = gameName.toLowerCase();
      
      // Check for numbers in the name
      if (/\d/.test(gameName)) {
        clues.push('This game has a number in its name.');
      }
      
      // Check for specific game types and themes
      if (lowerName.includes('catan')) {
        clues.push('This game involves building settlements and roads on a hexagonal grid.');
        clues.push('Players collect resources based on dice rolls and terrain types.');
        clues.push('The goal is to reach 10 victory points through various means.');
        clues.push('Features a robber that can steal resources from players.');
        clues.push('Includes development cards that provide special abilities.');
      } else if (lowerName.includes('pandemic')) {
        clues.push('Players work together to stop the spread of diseases.');
        clues.push('You must find cures before outbreaks overwhelm the world.');
        clues.push('Each player has a unique role with special abilities.');
        clues.push('Diseases spread across a world map with major cities.');
        clues.push('Players can share knowledge cards to help find cures.');
      } else if (lowerName.includes('chess')) {
        clues.push('A strategic board game played on an 8x8 grid.');
        clues.push('Each piece has specific movement patterns.');
        clues.push('The goal is to checkmate the opponent\'s king.');
        clues.push('Pieces include pawns, rooks, knights, bishops, queens, and kings.');
        clues.push('This game has been played for over 1500 years.');
      } else if (lowerName.includes('monopoly')) {
        clues.push('Players buy, sell, and trade properties to build wealth.');
        clues.push('The goal is to bankrupt all other players.');
        clues.push('Features iconic properties like Boardwalk and Park Place.');
        clues.push('Players collect rent when others land on their properties.');
        clues.push('Includes chance and community chest cards that affect gameplay.');
      } else if (lowerName.includes('risk')) {
        clues.push('This is a game of global domination and military strategy.');
        clues.push('Players command armies and engage in tactical combat.');
        clues.push('The goal is to eliminate all other players from the world map.');
        clues.push('Combat is resolved using dice rolls.');
        clues.push('Players receive reinforcements based on territories they control.');
      } else if (lowerName.includes('scrabble')) {
        clues.push('Players create words on a grid using letter tiles.');
        clues.push('Each letter has a point value, and players score based on words formed.');
        clues.push('Words must connect to existing words on the board.');
        clues.push('Special squares multiply letter or word scores.');
        clues.push('The game ends when all tiles are used or no more words can be formed.');
      } else if (lowerName.includes('clue') || lowerName.includes('cluedo')) {
        clues.push('This is a murder mystery deduction game.');
        clues.push('Players must determine who committed the murder, with what weapon, and where.');
        clues.push('Players move around a mansion collecting clues.');
        clues.push('The game includes character cards, weapon cards, and room cards.');
        clues.push('Players make suggestions and accusations to solve the mystery.');
      } else if (lowerName.includes('battleship')) {
        clues.push('Players place ships on a grid and try to sink each other\'s fleet.');
        clues.push('The goal is to find and destroy all enemy ships before they find yours.');
        clues.push('Players call out coordinates to "fire" at the opponent\'s grid.');
        clues.push('Ships come in different sizes and take multiple hits to sink.');
        clues.push('The game requires strategic thinking and probability assessment.');
      } else if (lowerName.includes('connect') && lowerName.includes('4')) {
        clues.push('Players drop colored discs into a vertical grid.');
        clues.push('The goal is to connect four of your discs in a row.');
        clues.push('Discs can connect horizontally, vertically, or diagonally.');
        clues.push('The game requires blocking your opponent while building your own line.');
        clues.push('This is a classic strategy game that\'s easy to learn but hard to master.');
      } else if (lowerName.includes('jenga')) {
        clues.push('Players take turns removing blocks from a tower and placing them on top.');
        clues.push('The goal is to not be the player who makes the tower fall.');
        clues.push('Players can only use one hand to remove blocks.');
        clues.push('The tower becomes increasingly unstable as the game progresses.');
        clues.push('This game tests steady hands and strategic thinking.');
      } else if (lowerName.includes('uno')) {
        clues.push('Players try to get rid of all their cards by matching colors or numbers.');
        clues.push('Special action cards can skip turns, reverse direction, or make others draw.');
        clues.push('When you have one card left, you must say "UNO!" or draw two cards.');
        clues.push('The first player to get rid of all cards wins.');
        clues.push('This is a fast-paced card game for 2-10 players.');
      } else if (lowerName.includes('yahtzee')) {
        clues.push('Players roll five dice to achieve specific combinations.');
        clues.push('Scoring categories include three-of-a-kind, four-of-a-kind, and full house.');
        clues.push('Players get three rolls per turn to achieve their desired combination.');
        clues.push('The game combines luck with strategic decision-making.');
        clues.push('The highest possible score is achieved with a Yahtzee (five of a kind).');
      } else if (lowerName.includes('trivial') || lowerName.includes('pursuit')) {
        clues.push('This is a trivia game testing knowledge across various categories.');
        clues.push('Players answer questions to move around a board.');
        clues.push('Categories typically include history, science, sports, entertainment, and geography.');
        clues.push('The goal is to collect wedges from each category and reach the center.');
        clues.push('Players can challenge each other\'s answers in some versions.');
      } else if (lowerName.includes('life')) {
        clues.push('Players navigate through different life stages from college to retirement.');
        clues.push('The game includes major life decisions like career choices and family planning.');
        clues.push('Players collect money, pay taxes, and experience life events.');
        clues.push('The goal is to end the game with the most money and happiness.');
        clues.push('This game simulates the journey of life with its ups and downs.');
      } else if (lowerName.includes('ticket') && lowerName.includes('ride')) {
        clues.push('Players build train routes across a map to connect cities.');
        clues.push('Players draw destination tickets that give points for connecting specific cities.');
        clues.push('The game features beautiful artwork of various countries and regions.');
        clues.push('Players must balance building routes with collecting the right train cards.');
        clues.push('Longer routes and more difficult connections earn more points.');
      } else if (lowerName.includes('carcassonne')) {
        clues.push('Players place tiles to build a medieval landscape.');
        clues.push('Players place meeples on features like cities, roads, and monasteries.');
        clues.push('Points are scored when features are completed.');
        clues.push('The game features beautiful artwork of medieval French architecture.');
        clues.push('Players must decide when to place meeples and when to retrieve them.');
      } else if (lowerName.includes('dominion')) {
        clues.push('This is a deck-building card game where players start with basic cards.');
        clues.push('Players use action cards to buy better cards and victory point cards.');
        clues.push('The goal is to have the most victory points when the game ends.');
        clues.push('Each game uses a different set of kingdom cards for variety.');
        clues.push('Players must balance building their deck with scoring points.');
      } else if (lowerName.includes('splendor')) {
        clues.push('Players collect gem tokens to purchase development cards.');
        clues.push('The game features beautiful Renaissance-themed artwork.');
        clues.push('Players must balance short-term gains with long-term strategies.');
        clues.push('Noble tiles provide bonus points for specific card combinations.');
        clues.push('The game ends when a player reaches 15 prestige points.');
      } else if (lowerName.includes('azul')) {
        clues.push('Players draft colorful tiles to decorate a palace wall.');
        clues.push('The game features beautiful Portuguese azulejo tile artwork.');
        clues.push('Players must carefully plan their tile placement to avoid penalties.');
        clues.push('Scoring is based on completed rows, columns, and color sets.');
        clues.push('The game combines abstract strategy with stunning visual appeal.');
      } else if (lowerName.includes('wingspan')) {
        clues.push('Players attract birds to their wildlife preserves.');
        clues.push('Each bird has unique abilities and habitat requirements.');
        clues.push('The game features stunning artwork of North American birds.');
        clues.push('Players must balance food collection with bird placement.');
        clues.push('Scoring includes eggs, cached food, and bird abilities.');
      } else if (lowerName.includes('terraforming')) {
        clues.push('Players work to make Mars habitable for human colonization.');
        clues.push('The game involves raising temperature, oxygen, and ocean levels.');
        clues.push('Players use project cards to advance terraforming goals.');
        clues.push('The game features a detailed Mars map and various resources.');
        clues.push('Victory points come from terraforming progress and achievements.');
      } else if (lowerName.includes('gloomhaven')) {
        clues.push('This is a cooperative dungeon-crawling campaign game.');
        clues.push('Players control mercenaries exploring dark and dangerous places.');
        clues.push('The game features legacy elements that permanently change the world.');
        clues.push('Combat uses a unique card-based system with initiative.');
        clues.push('Players must manage their character\'s exhaustion and resources.');
      } else if (lowerName.includes('root')) {
        clues.push('Players control different animal factions with asymmetric abilities.');
        clues.push('The game features beautiful woodland animal artwork.');
        clues.push('Each faction has completely different victory conditions.');
        clues.push('The game combines area control with unique faction mechanics.');
        clues.push('Players must adapt their strategy based on their chosen faction.');
      } else if (lowerName.includes('scythe')) {
        clues.push('Players control factions in an alternate-history 1920s Europe.');
        clues.push('The game combines engine-building with area control mechanics.');
        clues.push('Players use mechs and workers to expand their territory.');
        clues.push('The game features beautiful artwork by Jakub Rozalski.');
        clues.push('Victory comes from popularity, territory control, and resources.');
      } else if (lowerName.includes('blood')) {
        clues.push('Players compete to become the most influential vampire in the city.');
        clues.push('The game involves political intrigue and blood manipulation.');
        clues.push('Players use influence to control city districts.');
        clues.push('The game features a dark, gothic atmosphere.');
        clues.push('Victory comes from controlling the most valuable districts.');
      } else if (lowerName.includes('ticket') && lowerName.includes('ride')) {
        clues.push('Players build train routes across a map to connect cities.');
        clues.push('Players draw destination tickets that give points for connecting specific cities.');
        clues.push('The game features beautiful artwork of various countries and regions.');
        clues.push('Players must balance building routes with collecting the right train cards.');
        clues.push('Longer routes and more difficult connections earn more points.');
      } else if (lowerName.includes('carcassonne')) {
        clues.push('Players place tiles to build a medieval landscape.');
        clues.push('Players place meeples on features like cities, roads, and monasteries.');
        clues.push('Points are scored when features are completed.');
        clues.push('The game features beautiful artwork of medieval French architecture.');
        clues.push('Players must decide when to place meeples and when to retrieve them.');
      } else if (lowerName.includes('dominion')) {
        clues.push('This is a deck-building card game where players start with basic cards.');
        clues.push('Players use action cards to buy better cards and victory point cards.');
        clues.push('The goal is to have the most victory points when the game ends.');
        clues.push('Each game uses a different set of kingdom cards for variety.');
        clues.push('Players must balance building their deck with scoring points.');
      } else {
        // Generic but more specific clues based on game characteristics
        if (lowerName.includes('war') || lowerName.includes('battle') || lowerName.includes('conflict')) {
          clues.push('This game involves military strategy and tactical combat.');
          clues.push('Players command armies and engage in strategic warfare.');
          clues.push('The goal is to defeat your opponents through superior tactics.');
        } else if (lowerName.includes('mystery') || lowerName.includes('detective') || lowerName.includes('crime')) {
          clues.push('This game involves solving puzzles or uncovering secrets.');
          clues.push('Players gather clues and information to solve a mystery.');
          clues.push('Deduction and logical thinking are required to win.');
        } else if (lowerName.includes('fantasy') || lowerName.includes('magic') || lowerName.includes('wizard')) {
          clues.push('This game is set in a fantasy world with magical elements.');
          clues.push('Players may control magical creatures or cast spells.');
          clues.push('The game features mystical themes and supernatural powers.');
        } else if (lowerName.includes('space') || lowerName.includes('galaxy') || lowerName.includes('cosmic')) {
          clues.push('This game is set in outer space or involves space exploration.');
          clues.push('Players may explore planets, build space stations, or engage in space combat.');
          clues.push('The game features futuristic technology and cosmic themes.');
        } else if (lowerName.includes('ancient') || lowerName.includes('egypt') || lowerName.includes('rome')) {
          clues.push('This game is set in ancient historical times.');
          clues.push('Players may build civilizations, explore ancient ruins, or engage in historical conflicts.');
          clues.push('The game features historical themes and ancient civilizations.');
        } else if (lowerName.includes('zombie') || lowerName.includes('horror') || lowerName.includes('survival')) {
          clues.push('This game involves survival against dangerous threats.');
          clues.push('Players must work together or compete to survive challenging conditions.');
          clues.push('The game features intense themes and high-stakes gameplay.');
        } else if (lowerName.includes('racing') || lowerName.includes('speed') || lowerName.includes('fast')) {
          clues.push('This game involves racing or competing for speed.');
          clues.push('Players race against each other or against time.');
          clues.push('The game emphasizes quick thinking and fast-paced action.');
        } else if (lowerName.includes('puzzle') || lowerName.includes('logic') || lowerName.includes('brain')) {
          clues.push('This game challenges players\' logical thinking and problem-solving skills.');
          clues.push('Players must solve complex puzzles or riddles.');
          clues.push('The game requires careful analysis and strategic planning.');
        } else if (lowerName.includes('party') || lowerName.includes('social') || lowerName.includes('fun')) {
          clues.push('This is a social game designed for groups and parties.');
          clues.push('Players interact and compete in various entertaining challenges.');
          clues.push('The focus is on fun and social interaction rather than complex strategy.');
        } else if (lowerName.includes('economic') || lowerName.includes('trade') || lowerName.includes('business')) {
          clues.push('This game involves managing resources and building economic engines.');
          clues.push('Players trade, invest, and build businesses to accumulate wealth.');
          clues.push('The goal is to become the most successful entrepreneur or trader.');
        } else if (lowerName.includes('adventure') || lowerName.includes('explore') || lowerName.includes('quest')) {
          clues.push('This game involves going on adventures and exploring unknown territories.');
          clues.push('Players embark on quests and discover new places.');
          clues.push('The game features exploration and discovery themes.');
        } else if (lowerName.includes('dragon') || lowerName.includes('creature') || lowerName.includes('monster')) {
          clues.push('This game features mythical creatures and monsters.');
          clues.push('Players may battle or tame various fantastical beasts.');
          clues.push('The game includes magical and mythical elements.');
        } else if (lowerName.includes('city') || lowerName.includes('build') || lowerName.includes('construct')) {
          clues.push('This game involves building and developing cities or structures.');
          clues.push('Players construct buildings and manage urban development.');
          clues.push('The goal is to create the most impressive or efficient city.');
        } else if (lowerName.includes('farm') || lowerName.includes('agriculture') || lowerName.includes('harvest')) {
          clues.push('This game involves farming and agricultural activities.');
          clues.push('Players plant crops, raise animals, and manage farm resources.');
          clues.push('The game features rural and farming themes.');
        } else if (lowerName.includes('ocean') || lowerName.includes('sea') || lowerName.includes('pirate')) {
          clues.push('This game is set on or involves the ocean and maritime activities.');
          clues.push('Players may sail ships, explore islands, or engage in naval combat.');
          clues.push('The game features nautical and seafaring themes.');
        } else if (lowerName.includes('castle') || lowerName.includes('medieval') || lowerName.includes('kingdom')) {
          clues.push('This game is set in medieval times with castles and kingdoms.');
          clues.push('Players may build castles, manage kingdoms, or engage in medieval warfare.');
          clues.push('The game features historical medieval themes.');
        } else if (lowerName.includes('future') || lowerName.includes('robot') || lowerName.includes('cyber')) {
          clues.push('This game is set in the future with advanced technology.');
          clues.push('Players may control robots, use futuristic technology, or explore cyber worlds.');
          clues.push('The game features sci-fi and futuristic themes.');
        } else if (lowerName.includes('nature') || lowerName.includes('wild') || lowerName.includes('forest')) {
          clues.push('This game involves nature and the natural world.');
          clues.push('Players may explore wilderness, protect nature, or survive in natural environments.');
          clues.push('The game features environmental and natural themes.');
        } else if (lowerName.includes('music') || lowerName.includes('rhythm') || lowerName.includes('song')) {
          clues.push('This game involves music, rhythm, or musical elements.');
          clues.push('Players may create music, follow rhythms, or compete in musical challenges.');
          clues.push('The game features musical themes and audio elements.');
        } else if (lowerName.includes('art') || lowerName.includes('creative') || lowerName.includes('design')) {
          clues.push('This game involves creativity and artistic expression.');
          clues.push('Players may create artwork, design objects, or express themselves creatively.');
          clues.push('The game features artistic and creative themes.');
        } else if (lowerName.includes('food') || lowerName.includes('cooking') || lowerName.includes('chef')) {
          clues.push('This game involves food, cooking, or culinary activities.');
          clues.push('Players may cook meals, manage restaurants, or compete in culinary challenges.');
          clues.push('The game features food and cooking themes.');
        } else if (lowerName.includes('sport') || lowerName.includes('athletic') || lowerName.includes('competition')) {
          clues.push('This game involves sports or athletic competition.');
          clues.push('Players compete in various sports or athletic challenges.');
          clues.push('The game features sports and athletic themes.');
        } else if (lowerName.includes('time') || lowerName.includes('clock') || lowerName.includes('hour')) {
          clues.push('This game involves time management or time-based mechanics.');
          clues.push('Players must complete tasks within time limits or manage time resources.');
          clues.push('The game features time-related themes and mechanics.');
        } else if (lowerName.includes('color') || lowerName.includes('rainbow') || lowerName.includes('hue')) {
          clues.push('This game involves colors or color-based mechanics.');
          clues.push('Players may match colors, create color patterns, or use color strategies.');
          clues.push('The game features colorful themes and visual elements.');
        } else if (lowerName.includes('number') || lowerName.includes('math') || lowerName.includes('calculation')) {
          clues.push('This game involves numbers, mathematics, or calculations.');
          clues.push('Players may solve math problems, use number strategies, or perform calculations.');
          clues.push('The game features mathematical themes and numerical thinking.');
        } else if (lowerName.includes('word') || lowerName.includes('letter') || lowerName.includes('language')) {
          clues.push('This game involves words, letters, or language skills.');
          clues.push('Players may form words, solve word puzzles, or use language strategies.');
          clues.push('The game features linguistic themes and word-based gameplay.');
        } else if (lowerName.includes('card') || lowerName.includes('deck') || lowerName.includes('hand')) {
          clues.push('This game primarily uses cards as the main game component.');
          clues.push('Players build decks, play cards, or manage their hand of cards.');
          clues.push('The game features card-based mechanics and strategies.');
        } else if (lowerName.includes('dice') || lowerName.includes('roll') || lowerName.includes('chance')) {
          clues.push('This game heavily relies on dice rolling and chance elements.');
          clues.push('Players roll dice to determine outcomes or make decisions.');
          clues.push('The game combines luck with strategic decision-making.');
        } else if (lowerName.includes('tile') || lowerName.includes('piece') || lowerName.includes('board')) {
          clues.push('This game uses tiles, pieces, or a board as the main playing surface.');
          clues.push('Players place tiles, move pieces, or interact with the game board.');
          clues.push('The game features spatial elements and board-based strategies.');
        } else {
          // Generate much more specific clues based on game characteristics
          if (lowerName.includes('war') || lowerName.includes('battle') || lowerName.includes('conflict')) {
            clues.push('This game involves military strategy and tactical combat.');
            clues.push('Players command armies and engage in strategic warfare.');
            clues.push('The goal is to defeat your opponents through superior tactics.');
            clues.push('Combat resolution involves dice rolling and unit positioning.');
            clues.push('Players must manage supply lines and reinforcements.');
          } else if (lowerName.includes('mystery') || lowerName.includes('detective') || lowerName.includes('crime')) {
        clues.push('This game involves solving puzzles or uncovering secrets.');
            clues.push('Players gather clues and information to solve a mystery.');
            clues.push('Deduction and logical thinking are required to win.');
            clues.push('Players may move around locations to investigate.');
            clues.push('The game includes hidden information and reveal mechanics.');
          } else if (lowerName.includes('fantasy') || lowerName.includes('magic') || lowerName.includes('wizard')) {
            clues.push('This game is set in a fantasy world with magical elements.');
            clues.push('Players may control magical creatures or cast spells.');
            clues.push('The game features mystical themes and supernatural powers.');
            clues.push('Players may collect magical items or artifacts.');
            clues.push('The game includes fantasy races and magical abilities.');
          } else if (lowerName.includes('space') || lowerName.includes('galaxy') || lowerName.includes('cosmic')) {
            clues.push('This game is set in outer space or involves space exploration.');
            clues.push('Players may explore planets, build space stations, or engage in space combat.');
            clues.push('The game features futuristic technology and cosmic themes.');
            clues.push('Players may manage resources across multiple star systems.');
            clues.push('The game includes space travel and colonization mechanics.');
          } else if (lowerName.includes('ancient') || lowerName.includes('egypt') || lowerName.includes('rome')) {
            clues.push('This game is set in ancient historical times.');
            clues.push('Players may build civilizations, explore ancient ruins, or engage in historical conflicts.');
            clues.push('The game features historical themes and ancient civilizations.');
            clues.push('Players may collect historical artifacts or build monuments.');
            clues.push('The game includes historical figures and events.');
          } else if (lowerName.includes('zombie') || lowerName.includes('horror') || lowerName.includes('survival')) {
            clues.push('This game involves survival against dangerous threats.');
            clues.push('Players must work together or compete to survive challenging conditions.');
            clues.push('The game features intense themes and high-stakes gameplay.');
            clues.push('Players may scavenge for resources or weapons.');
            clues.push('The game includes horror elements and survival mechanics.');
          } else if (lowerName.includes('racing') || lowerName.includes('speed') || lowerName.includes('fast')) {
            clues.push('This game involves racing or competing for speed.');
            clues.push('Players race against each other or against time.');
            clues.push('The game emphasizes quick thinking and fast-paced action.');
            clues.push('Players may upgrade vehicles or choose different routes.');
            clues.push('The game includes timing mechanics and speed bonuses.');
          } else if (lowerName.includes('puzzle') || lowerName.includes('logic') || lowerName.includes('brain')) {
            clues.push('This game challenges players\' logical thinking and problem-solving skills.');
            clues.push('Players must solve complex puzzles or riddles.');
            clues.push('The game requires careful analysis and strategic planning.');
            clues.push('Players may work with patterns, sequences, or spatial reasoning.');
            clues.push('The game includes multiple solution paths and optimization challenges.');
          } else if (lowerName.includes('party') || lowerName.includes('social') || lowerName.includes('fun')) {
            clues.push('This is a social game designed for groups and parties.');
            clues.push('Players interact and compete in various entertaining challenges.');
            clues.push('The focus is on fun and social interaction rather than complex strategy.');
            clues.push('Players may perform actions, answer questions, or complete dares.');
            clues.push('The game encourages laughter and group participation.');
          } else if (lowerName.includes('economic') || lowerName.includes('trade') || lowerName.includes('business')) {
            clues.push('This game involves managing resources and building economic engines.');
            clues.push('Players trade, invest, and build businesses to accumulate wealth.');
            clues.push('The goal is to become the most successful entrepreneur or trader.');
            clues.push('Players may manage supply and demand or market fluctuations.');
            clues.push('The game includes economic cycles and investment opportunities.');
          } else if (lowerName.includes('adventure') || lowerName.includes('explore') || lowerName.includes('quest')) {
            clues.push('This game involves going on adventures and exploring unknown territories.');
            clues.push('Players embark on quests and discover new places.');
            clues.push('The game features exploration and discovery themes.');
            clues.push('Players may encounter random events or hidden locations.');
            clues.push('The game includes quest chains and exploration rewards.');
          } else if (lowerName.includes('dragon') || lowerName.includes('creature') || lowerName.includes('monster')) {
            clues.push('This game features mythical creatures and monsters.');
            clues.push('Players may battle or tame various fantastical beasts.');
            clues.push('The game includes magical and mythical elements.');
            clues.push('Players may collect monster cards or build monster collections.');
            clues.push('The game includes creature abilities and evolution mechanics.');
          } else if (lowerName.includes('city') || lowerName.includes('build') || lowerName.includes('construct')) {
            clues.push('This game involves building and developing cities or structures.');
            clues.push('Players construct buildings and manage urban development.');
            clues.push('The goal is to create the most impressive or efficient city.');
            clues.push('Players may manage city services and infrastructure.');
            clues.push('The game includes building placement and adjacency bonuses.');
          } else if (lowerName.includes('farm') || lowerName.includes('agriculture') || lowerName.includes('harvest')) {
            clues.push('This game involves farming and agricultural activities.');
            clues.push('Players plant crops, raise animals, and manage farm resources.');
            clues.push('The game features rural and farming themes.');
            clues.push('Players may manage seasonal cycles and weather effects.');
            clues.push('The game includes crop rotation and animal breeding mechanics.');
          } else if (lowerName.includes('ocean') || lowerName.includes('sea') || lowerName.includes('pirate')) {
            clues.push('This game is set on or involves the ocean and maritime activities.');
            clues.push('Players may sail ships, explore islands, or engage in naval combat.');
            clues.push('The game features nautical and seafaring themes.');
            clues.push('Players may manage ship crews or navigate treacherous waters.');
            clues.push('The game includes treasure hunting and island exploration.');
          } else if (lowerName.includes('castle') || lowerName.includes('medieval') || lowerName.includes('kingdom')) {
            clues.push('This game is set in medieval times with castles and kingdoms.');
            clues.push('Players may build castles, manage kingdoms, or engage in medieval warfare.');
            clues.push('The game features historical medieval themes.');
            clues.push('Players may manage feudal relationships and noble titles.');
            clues.push('The game includes castle defense and siege mechanics.');
          } else if (lowerName.includes('future') || lowerName.includes('robot') || lowerName.includes('cyber')) {
            clues.push('This game is set in the future with advanced technology.');
            clues.push('Players may control robots, use futuristic technology, or explore cyber worlds.');
            clues.push('The game features sci-fi and futuristic themes.');
            clues.push('Players may upgrade technology or manage cyber systems.');
            clues.push('The game includes futuristic weapons and cyber warfare.');
          } else if (lowerName.includes('nature') || lowerName.includes('wild') || lowerName.includes('forest')) {
            clues.push('This game involves nature and the natural world.');
            clues.push('Players may explore wilderness, protect nature, or survive in natural environments.');
            clues.push('The game features environmental and natural themes.');
            clues.push('Players may manage ecosystems or wildlife populations.');
            clues.push('The game includes natural disasters and environmental challenges.');
          } else if (lowerName.includes('music') || lowerName.includes('rhythm') || lowerName.includes('song')) {
            clues.push('This game involves music, rhythm, or musical elements.');
            clues.push('Players may create music, follow rhythms, or compete in musical challenges.');
            clues.push('The game features musical themes and audio elements.');
            clues.push('Players may collect musical instruments or compose melodies.');
            clues.push('The game includes rhythm-based gameplay and musical scoring.');
          } else if (lowerName.includes('art') || lowerName.includes('creative') || lowerName.includes('design')) {
            clues.push('This game involves creativity and artistic expression.');
            clues.push('Players may create artwork, design objects, or express themselves creatively.');
            clues.push('The game features artistic and creative themes.');
            clues.push('Players may collect art supplies or visit galleries.');
            clues.push('The game includes artistic challenges and creative scoring.');
          } else if (lowerName.includes('food') || lowerName.includes('cooking') || lowerName.includes('chef')) {
            clues.push('This game involves food, cooking, or culinary activities.');
            clues.push('Players may cook meals, manage restaurants, or compete in culinary challenges.');
            clues.push('The game features food and cooking themes.');
            clues.push('Players may collect ingredients or manage kitchen equipment.');
            clues.push('The game includes recipe creation and cooking timing.');
          } else if (lowerName.includes('sport') || lowerName.includes('athletic') || lowerName.includes('competition')) {
            clues.push('This game involves sports or athletic competition.');
            clues.push('Players compete in various sports or athletic challenges.');
            clues.push('The game features sports and athletic themes.');
            clues.push('Players may manage teams or train athletes.');
            clues.push('The game includes sports statistics and performance metrics.');
          } else if (lowerName.includes('time') || lowerName.includes('clock') || lowerName.includes('hour')) {
            clues.push('This game involves time management or time-based mechanics.');
            clues.push('Players must complete tasks within time limits or manage time resources.');
            clues.push('The game features time-related themes and mechanics.');
            clues.push('Players may race against timers or manage time pressure.');
            clues.push('The game includes temporal paradoxes or time manipulation.');
          } else if (lowerName.includes('color') || lowerName.includes('rainbow') || lowerName.includes('hue')) {
            clues.push('This game involves colors or color-based mechanics.');
            clues.push('Players may match colors, create color patterns, or use color strategies.');
            clues.push('The game features colorful themes and visual elements.');
            clues.push('Players may collect colored pieces or solve color puzzles.');
            clues.push('The game includes color combinations and visual scoring.');
          } else if (lowerName.includes('number') || lowerName.includes('math') || lowerName.includes('calculation')) {
            clues.push('This game involves numbers, mathematics, or calculations.');
            clues.push('Players may solve math problems, use number strategies, or perform calculations.');
            clues.push('The game features mathematical themes and numerical thinking.');
            clues.push('Players may work with probability or statistical analysis.');
            clues.push('The game includes mathematical optimization and scoring systems.');
          } else if (lowerName.includes('word') || lowerName.includes('letter') || lowerName.includes('language')) {
            clues.push('This game involves words, letters, or language skills.');
            clues.push('Players may form words, solve word puzzles, or use language strategies.');
            clues.push('The game features linguistic themes and word-based gameplay.');
            clues.push('Players may work with anagrams or word associations.');
            clues.push('The game includes vocabulary challenges and linguistic scoring.');
          } else if (lowerName.includes('card') || lowerName.includes('deck') || lowerName.includes('hand')) {
            clues.push('This game primarily uses cards as the main game component.');
            clues.push('Players build decks, play cards, or manage their hand of cards.');
            clues.push('The game features card-based mechanics and strategies.');
            clues.push('Players may collect rare cards or build card combinations.');
            clues.push('The game includes card synergies and deck optimization.');
          } else if (lowerName.includes('dice') || lowerName.includes('roll') || lowerName.includes('chance')) {
            clues.push('This game heavily relies on dice rolling and chance elements.');
            clues.push('Players roll dice to determine outcomes or make decisions.');
            clues.push('The game combines luck with strategic decision-making.');
            clues.push('Players may use multiple dice or special dice with unique faces.');
            clues.push('The game includes probability management and risk assessment.');
          } else if (lowerName.includes('tile') || lowerName.includes('piece') || lowerName.includes('board')) {
            clues.push('This game uses tiles, pieces, or a board as the main playing surface.');
            clues.push('Players place tiles, move pieces, or interact with the game board.');
            clues.push('The game features spatial elements and board-based strategies.');
            clues.push('Players may collect sets of tiles or create tile patterns.');
            clues.push('The game includes spatial reasoning and board optimization.');
          } else {
            // Final fallback - specific game information instead of generic clues
            if (gameName.includes(' ')) {
              clues.push('This game\'s name contains multiple words.');
            }
            
            if (gameName.includes('-') || gameName.includes(':') || gameName.includes('&')) {
              clues.push('This game\'s name contains special punctuation characters.');
            }
            
            // Add specific game information instead of generic mechanics
            clues.push('This game typically plays in 30-60 minutes.');
            clues.push('This game supports 2-4 players.');
            clues.push('This game involves strategic decision-making and resource management.');
          }
        }
      }
      
      // Ensure we have at least 3 clues
      while (clues.length < 3) {
        clues.push('This game offers an engaging and challenging gameplay experience.');
      }
      
      // Limit to 5 clues maximum
      return clues.slice(0, 5);
    };

    // Fetch clues from database
    const fetchCluesFromDatabase = async (gameName: string): Promise<string[]> => {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/boardle/hints?gameName=${encodeURIComponent(gameName)}&gameMode=image`);
        if (response.ok) {
          const data = await response.json();
          return data.hints || [];
        }
      } catch (error) {
        console.error('Error fetching hints from database:', error);
      }
      
      // Fallback to generic clues if database fetch fails
      return [
        'Players interact with game components on a board or table.',
        'The game involves placing pieces or moving tokens.',
        'Players compete to control areas or collect resources.',
        'The game includes visual elements like cards or tiles.',
        'Strategy and timing are important for success.'
      ];
    };

    // Format for Boardle component - return only the daily game
    const clues = await fetchCluesFromDatabase(dailyGame.name);
    const boardleGames = [{
      name: dailyGame.name.toUpperCase(),
      imageUrl: `/api/boardle/image-proxy?id=${gameIndex}`,
      clues: clues,
      zoomType: dailyGame.zoomType
    }];
    
    
    console.log(`🎯 Image Mode: Game selected (Index ${gameIndex + 1})`);
    console.log(`📤 Returning response with ${boardleGames.length} games`);
    
    const response = NextResponse.json({
      games: boardleGames,
      total: boardleGames.length,
      message: shuffleParam ? `Shuffle mode: Game ${gameIndex + 1} for Image Mode` : `Daily rotation: Game ${gameIndex + 1} for Image Mode`
    });
    
    console.log('✅ Image Mode API response sent successfully');
    return response;
    
  } catch (error) {
    console.error('Error fetching Image Mode games:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Image Mode games',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

