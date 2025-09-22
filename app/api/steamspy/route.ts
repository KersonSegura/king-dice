import { NextRequest, NextResponse } from 'next/server';


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appIds = searchParams.get('appids');

  if (!appIds) {
    return NextResponse.json({ error: 'Missing appids parameter' }, { status: 400 });
  }

  try {
    // Split comma-separated app IDs if multiple
    const appIdList = appIds.split(',').map(id => id.trim());
    const playerData: { [key: string]: any } = {};

    // Fetch player data for each app ID
    for (const appId of appIdList) {
      try {
        // Try Steam Charts API first (more reliable for current players)
        const steamChartsUrl = `https://steamcharts.com/api/GetGameDetails/${appId}`;
        
        let response = await fetch(steamChartsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Steam Charts data for ${appId}:`, data);
          
          playerData[appId] = {
            appid: parseInt(appId),
            name: data.name || 'Unknown',
            current_players: data.current_players || 0,
            peak_players: data.peak_players || 0,
            total_owners: data.total_owners || 0,
            last_updated: new Date().toISOString()
          };
        } else {
          // Fallback to SteamSpy if Steam Charts fails
          const steamSpyUrl = `https://steamspy.com/api.php?request=appdetails&appid=${appId}`;
          
          response = await fetch(steamSpyUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`SteamSpy data for ${appId}:`, data);
            
            playerData[appId] = {
              appid: parseInt(appId),
              name: data.name || 'Unknown',
              current_players: data.players_forever || 0,
              peak_players: data.peak_players || 0,
              total_owners: data.owners || 0,
              last_updated: new Date().toISOString()
            };
          }
        }
        
        // If both APIs failed, set default values
        if (!playerData[appId]) {
          console.warn(`Both APIs failed for app ${appId}`);
          playerData[appId] = {
            appid: parseInt(appId),
            name: 'Unknown',
            current_players: 0,
            peak_players: 0,
            total_owners: 0,
            last_updated: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error(`Error fetching SteamSpy data for app ${appId}:`, error);
        // Set default values on error
        playerData[appId] = {
          appid: parseInt(appId),
          name: 'Unknown',
          current_players: 0,
          peak_players: 0,
          total_owners: 0,
          last_updated: new Date().toISOString()
        };
      }
    }
    
    return NextResponse.json(playerData);
  } catch (error) {
    console.error('SteamSpy API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SteamSpy data' }, 
      { status: 500 }
    );
  }
}
