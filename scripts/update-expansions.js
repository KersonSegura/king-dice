const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';

async function makeRequestWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'KingDice/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function getExpansionsForGame(bggId) {
  try {
    const url = `${BGG_API_BASE_URL}/thing?id=${bggId}&stats=1`;
    const response = await makeRequestWithRetry(url);
    
    // Buscar expansiones en la respuesta XML
    const expansionMatches = response.match(/<link type="boardgameexpansion" id="(\d+)" value="([^"]+)"/g);
    
    if (expansionMatches) {
      return expansionMatches.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error getting expansions for BGG ID ${bggId}:`, error.message);
    return 0;
  }
}

async function updateExpansions() {
  try {
    console.log('🔄 Starting expansion data update...');
    
    // Obtener todos los juegos de la base de datos
    const games = await prisma.game.findMany({
      select: {
        id: true,
        bggId: true,
        name: true,
        expansions: true
      }
    });
    
    console.log(`📊 Found ${games.length} games to process`);
    
    let updated = 0;
    let errors = 0;
    
    for (const game of games) {
      try {
        console.log(`🔍 Processing: ${game.name} (BGG ID: ${game.bggId})`);
        
        const expansionCount = await getExpansionsForGame(game.bggId);
        
        if (expansionCount !== game.expansions) {
          await prisma.game.update({
            where: { id: game.id },
            data: { expansions: expansionCount }
          });
          
          console.log(`✅ Updated ${game.name}: ${expansionCount} expansions`);
          updated++;
        } else {
          console.log(`⏭️  ${game.name}: No change needed (${expansionCount} expansions)`);
        }
        
        // Pausa entre requests para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing ${game.name}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Updated: ${updated} games`);
    console.log(`❌ Errors: ${errors} games`);
    console.log(`📊 Total processed: ${games.length} games`);
    
  } catch (error) {
    console.error('❌ Error in updateExpansions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateExpansions().catch(console.error); 