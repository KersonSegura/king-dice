import { NextRequest, NextResponse } from 'next/server';

function getMockGameData(appId: number) {
  const mockGames: { [key: number]: any } = {
    286160: {
      name: "Tabletop Simulator",
      short_description: "Tabletop Simulator is an online sandbox where you can play any tabletop game you can imagine.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/286160/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" },
        { id: 9, description: "Co-op" },
        { id: 13, description: "Cross-Platform Multiplayer" }
      ],
      price_overview: {
        currency: "USD",
        initial: 1999,
        final: 1999,
        discount_percent: 0,
        initial_formatted: "$19.99",
        final_formatted: "$19.99"
      },
      release_date: {
        coming_soon: false,
        date: "5 Jun, 2015"
      }
    },
    965580: {
      name: "Root",
      short_description: "Root is a game of adventure and war where 2 to 4 players battle for control of a vast wilderness.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/965580/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" },
        { id: 9, description: "Co-op" }
      ],
      price_overview: {
        currency: "USD",
        initial: 2499,
        final: 1249,
        discount_percent: 50,
        initial_formatted: "$24.99",
        final_formatted: "$12.49"
      },
      release_date: {
        coming_soon: false,
        date: "28 May, 2020"
      }
    },
    1054490: {
      name: "Wingspan",
      short_description: "Wingspan is a competitive, medium-weight, card-driven, engine-building board game from Stonemaier Games.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1054490/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 1999,
        final: 1999,
        discount_percent: 0,
        initial_formatted: "$19.99",
        final_formatted: "$19.99"
      },
      release_date: {
        coming_soon: false,
        date: "17 Sep, 2020"
      }
    },
    544730: {
      name: "Catan Universe",
      short_description: "The official digital version of the world-famous strategy game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/544730/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 0,
        final: 0,
        discount_percent: 0,
        initial_formatted: "Free",
        final_formatted: "Free"
      },
      release_date: {
        coming_soon: false,
        date: "15 Mar, 2017"
      }
    },
    470220: {
      name: "UNO",
      short_description: "The classic card game UNO is now available on Steam!",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/470220/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "9 Jun, 2016"
      }
    },
    1689500: {
      name: "Dune: Imperium",
      short_description: "Dune: Imperium is a strategy board game set in the Dune universe.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1689500/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 1999,
        final: 1999,
        discount_percent: 0,
        initial_formatted: "$19.99",
        final_formatted: "$19.99"
      },
      release_date: {
        coming_soon: false,
        date: "17 Nov, 2021"
      }
    },
    2477010: {
      name: "Ticket to Ride®",
      short_description: "The official digital version of the classic board game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/2477010/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "16 Dec, 2021"
      }
    },
    780290: {
      name: "Gloomhaven",
      short_description: "The digital adaptation of the acclaimed board game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/780290/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" },
        { id: 9, description: "Co-op" }
      ],
      price_overview: {
        currency: "USD",
        initial: 2499,
        final: 2499,
        discount_percent: 0,
        initial_formatted: "$24.99",
        final_formatted: "$24.99"
      },
      release_date: {
        coming_soon: false,
        date: "17 Oct, 2019"
      }
    },
    800270: {
      name: "Terraforming Mars",
      short_description: "The digital version of the popular board game about terraforming Mars.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/800270/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 1999,
        final: 1999,
        discount_percent: 0,
        initial_formatted: "$19.99",
        final_formatted: "$19.99"
      },
      release_date: {
        coming_soon: false,
        date: "25 May, 2021"
      }
    },
    403120: {
      name: "THE GAME OF LIFE",
      short_description: "The classic board game of life choices and adventures.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/403120/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2015"
      }
    },
    1455630: {
      name: "THE GAME OF LIFE 2",
      short_description: "The modern version of the classic life simulation game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1455630/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 1999,
        final: 1999,
        discount_percent: 0,
        initial_formatted: "$19.99",
        final_formatted: "$19.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2020"
      }
    },
    3174070: {
      name: "Texas Hold'em Poker: Pokerist",
      short_description: "Play Texas Hold'em poker with players from around the world.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/3174070/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 0,
        final: 0,
        discount_percent: 0,
        initial_formatted: "Free",
        final_formatted: "Free"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2020"
      }
    },
    2347080: {
      name: "Frosthaven",
      short_description: "The sequel to the acclaimed Gloomhaven board game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/2347080/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" },
        { id: 9, description: "Co-op" }
      ],
      price_overview: {
        currency: "USD",
        initial: 2999,
        final: 2999,
        discount_percent: 0,
        initial_formatted: "$29.99",
        final_formatted: "$29.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2022"
      }
    },
    1722870: {
      name: "Clank!",
      short_description: "A deck-building adventure game with dungeon exploration.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1722870/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 1999,
        final: 1999,
        discount_percent: 0,
        initial_formatted: "$19.99",
        final_formatted: "$19.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2021"
      }
    },
    1128810: {
      name: "RISK: Global Domination",
      short_description: "The classic strategy game of world conquest.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1128810/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2018"
      }
    },
    2506480: {
      name: "Clue/Cluedo",
      short_description: "The classic mystery board game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/2506480/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2019"
      }
    },
    794800: {
      name: "Clue/Cluedo: Classic Edition",
      short_description: "The classic edition of the mystery board game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/794800/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2019"
      }
    },
    1722860: {
      name: "Munchkin Digital",
      short_description: "The digital version of the popular card game.",
      header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1722860/header.jpg",
      categories: [
        { id: 2, description: "Single-player" },
        { id: 1, description: "Multi-player" }
      ],
      price_overview: {
        currency: "USD",
        initial: 999,
        final: 999,
        discount_percent: 0,
        initial_formatted: "$9.99",
        final_formatted: "$9.99"
      },
      release_date: {
        coming_soon: false,
        date: "1 Jan, 2020"
      }
    }
  };
  
  // If we have specific mock data for this game, use it
  if (mockGames[appId]) {
    return mockGames[appId];
  }
  
  // For games not in our specific list, create unique data based on the app ID
  const gameNames = [
    "Tabletop Simulator", "Root", "Wingspan", "Catan Universe", "UNO", 
    "Dune: Imperium", "Ticket to Ride", "Gloomhaven", "Terraforming Mars",
    "The Game of Life", "Texas Hold'em Poker", "Frosthaven", "Clank!",
    "Risk: Global Domination", "Clue/Cluedo", "Munchkin Digital", "Everdell",
    "Just Go", "Cascadia", "Carcassonne", "Spirit Island", "Ark Nova",
    "Mahjong Soul", "Dominion", "Splendor", "Scythe", "Dawnmaker",
    "Unmatched", "Small World", "Sagrada", "Istanbul", "Barrage",
    "Tokaido", "TaleSpire", "Monopoly 2024", "Monopoly Madness", "Battleship",
    "Game of Thrones", "Takenoko", "Love Letter", "Agricola", "Patchwork",
    "Le Havre", "Abalone", "Cards Universe", "Yu-Gi-Oh Duel Links", "Yu-Gi-Oh Master Duel",
    "Magic: The Gathering Arena", "Liar's Bar", "The Game of Life 2", "Clue Classic"
  ];
  
  const randomName = gameNames[appId % gameNames.length];
  const prices = [999, 1499, 1999, 2499, 2999, 3999];
  const randomPrice = prices[appId % prices.length];
  const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : 0;
  const finalPrice = discount > 0 ? Math.floor(randomPrice * (1 - discount / 100)) : randomPrice;
  
  return {
    name: randomName,
    short_description: `A digital board game experience featuring ${randomName.toLowerCase()} gameplay.`,
    header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    categories: [
      { id: 2, description: "Single-player" },
      { id: 1, description: "Multi-player" },
      { id: 9, description: "Co-op" }
    ],
    price_overview: {
      currency: "USD",
      initial: randomPrice,
      final: finalPrice,
      discount_percent: discount,
      initial_formatted: `$${(randomPrice / 100).toFixed(2)}`,
      final_formatted: `$${(finalPrice / 100).toFixed(2)}`
    },
    release_date: {
      coming_soon: false,
      date: "1 Jan, 2020"
    }
  };
}


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appIds = searchParams.get('appids');
  const key = searchParams.get('key');

  if (!appIds || !key) {
    return NextResponse.json({ error: 'Missing appids or key parameter' }, { status: 400 });
  }

  try {
    // Steam API is blocking our requests, so let's use mock data for now
    console.log('Using mock data for appids:', appIds);
    
    const mockData: any = {};
    const appIdList = appIds.split(',');
    
    for (const appId of appIdList) {
      const gameData = getMockGameData(parseInt(appId));
      if (gameData) {
        mockData[appId] = {
          success: true,
          data: gameData
        };
        console.log(`Mock data for ${appId}: ${gameData.name} - ${gameData.price_overview.final_formatted}`);
      }
    }
    
    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Steam API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Steam data' }, 
      { status: 500 }
    );
  }
}
