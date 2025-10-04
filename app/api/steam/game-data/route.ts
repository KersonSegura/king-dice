import { NextResponse } from 'next/server';

interface SteamGameData {
  appid: number;
  name: string;
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted: string;
    final_formatted: string;
  };
  current_players?: number;
  peak_players?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appIds = searchParams.get('appids');
  
  if (!appIds) {
    return NextResponse.json({ error: 'Missing appids parameter' }, { status: 400 });
  }

  try {
    const appIdList = appIds.split(',').map(id => id.trim());
    const gameData: SteamGameData[] = [];

    // Fetch game details from Steam Store API
    for (const appId of appIdList) {
      try {
        // Steam Store API for game details
        const storeResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=english`);
        const storeData = await storeResponse.json();
        
        if (storeData[appId]?.success) {
          const game = storeData[appId].data;
          
          // Extract pricing info
          let priceOverview = undefined;
          if (game.price_overview) {
            priceOverview = {
              currency: game.price_overview.currency,
              initial: game.price_overview.initial,
              final: game.price_overview.final,
              discount_percent: game.price_overview.discount_percent,
              initial_formatted: game.price_overview.initial_formatted,
              final_formatted: game.price_overview.final_formatted
            };
          } else if (game.is_free) {
            priceOverview = {
              currency: "USD",
              initial: 0,
              final: 0,
              discount_percent: 0,
              initial_formatted: "FREE",
              final_formatted: "FREE"
            };
          }

          gameData.push({
            appid: parseInt(appId),
            name: game.name,
            price_overview: priceOverview
          });
        }
      } catch (error) {
        console.error(`Error fetching data for app ${appId}:`, error);
        // Continue with other games even if one fails
      }
    }

    // Fetch real player data for each game
    for (let i = 0; i < gameData.length; i++) {
      const game = gameData[i];
      try {
        // Use Steam's public player count API
        const playerResponse = await fetch(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${game.appid}`);
        const playerData = await playerResponse.json();
        
        if (playerData.response?.result === 1) {
          game.current_players = playerData.response.player_count;
        }
        
        // Add a small delay to avoid rate limiting
        if (i < gameData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching player data for ${game.appid}:`, error);
        // Keep undefined if we can't fetch player data
      }
    }

    return NextResponse.json({ 
      success: true, 
      games: gameData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching Steam data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Steam data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
