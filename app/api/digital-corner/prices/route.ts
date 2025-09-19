import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRICE_CACHE_FILE = path.join(process.cwd(), 'data', 'digital-corner-prices.json');

interface CachedPrice {
  appid: number;
  name: string;
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted?: string;
    final_formatted?: string;
  };
  lastUpdated: string;
}

interface PriceCache {
  lastUpdated: string;
  prices: CachedPrice[];
}

// Get cached prices
export async function GET(request: NextRequest) {
  try {
    // Check if cache file exists
    if (!fs.existsSync(PRICE_CACHE_FILE)) {
      return NextResponse.json({
        success: false,
        error: 'Price cache not found. Please refresh cache first.',
        lastUpdated: null,
        prices: []
      });
    }

    // Read cache file
    const cacheData = JSON.parse(fs.readFileSync(PRICE_CACHE_FILE, 'utf-8')) as PriceCache;
    
    // Check if cache is older than 24 hours
    const lastUpdated = new Date(cacheData.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    return NextResponse.json({
      success: true,
      prices: cacheData.prices,
      lastUpdated: cacheData.lastUpdated,
      isStale: hoursSinceUpdate > 24,
      hoursSinceUpdate: Math.round(hoursSinceUpdate * 10) / 10
    });
  } catch (error) {
    console.error('Error reading price cache:', error);
    return NextResponse.json(
      { error: 'Failed to read price cache' },
      { status: 500 }
    );
  }
}

// Refresh price cache (fetch all prices from Steam)
export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer internal-price-refresh') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting daily price cache refresh...');
    
    // Read the games list to get all App IDs
    const gamesListPath = path.join(process.cwd(), 'public', 'Steam-games-list.txt');
    const gamesListContent = fs.readFileSync(gamesListPath, 'utf-8');
    const lines = gamesListContent.trim().split('\n');
    
    const cachedPrices: CachedPrice[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`📋 Fetching prices for ${lines.length} games...`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse the format: "Game Name - AppID/ImageFilename - Steam URL"
      const parts = line.split(' - ');
      if (parts.length < 3) continue;
      
      const gameName = parts.slice(0, -2).join(' - ');
      const appIdAndFilename = parts[parts.length - 2];
      const appIdMatch = appIdAndFilename.match(/^(\d+)\//);
      
      if (!appIdMatch) continue;
      
      const appId = parseInt(appIdMatch[1]);
      
      try {
        // Fetch price from Steam API (using our existing API route)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/steam?appids=${appId}&key=E36F9EC2EFD4913EBE98A73B0D5ED647&t=${Date.now()}`,
          { 
            headers: { 'User-Agent': 'KingDice-PriceCache/1.0' }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data[appId]?.success && data[appId].data) {
            const gameData = data[appId].data;
            
            cachedPrices.push({
              appid: appId,
              name: gameName,
              price_overview: gameData.price_overview || undefined,
              lastUpdated: new Date().toISOString()
            });
            
            successCount++;
            
            const discountText = gameData.price_overview?.discount_percent > 0 
              ? ` (${gameData.price_overview.discount_percent}% OFF!)` 
              : '';
            console.log(`✅ ${i + 1}/${lines.length} ${gameName} - ${gameData.price_overview?.final_formatted || 'No price'}${discountText}`);
          } else {
            console.log(`⚠️ ${i + 1}/${lines.length} ${gameName} - No price data available`);
            
            // Still cache the game without price data
            cachedPrices.push({
              appid: appId,
              name: gameName,
              price_overview: undefined,
              lastUpdated: new Date().toISOString()
            });
            
            errorCount++;
          }
        } else {
          console.error(`❌ ${i + 1}/${lines.length} ${gameName} - API error: ${response.status}`);
          errorCount++;
        }
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`❌ ${i + 1}/${lines.length} ${gameName} - Error:`, error);
        errorCount++;
      }
    }
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save cache to file
    const cacheData: PriceCache = {
      lastUpdated: new Date().toISOString(),
      prices: cachedPrices
    };
    
    fs.writeFileSync(PRICE_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    
    console.log(`✅ Price cache refresh completed!`);
    console.log(`📊 Results: ${successCount} successful, ${errorCount} errors, ${cachedPrices.length} total games cached`);
    
    return NextResponse.json({
      success: true,
      message: 'Price cache refreshed successfully',
      totalGames: cachedPrices.length,
      successCount,
      errorCount,
      lastUpdated: cacheData.lastUpdated
    });
  } catch (error) {
    console.error('❌ Error refreshing price cache:', error);
    return NextResponse.json(
      { error: 'Failed to refresh price cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
