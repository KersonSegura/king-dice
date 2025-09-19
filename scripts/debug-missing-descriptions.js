const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

async function debugMissingDescriptions() {
  try {
    console.log('🔍 Investigating games without descriptions...\n');
    
    // Get games without descriptions
    const gamesWithoutDescriptions = await prisma.game.findMany({
      where: {
        descriptions: {
          none: {}
        }
      },
      take: 5, // Check first 5
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`Found ${gamesWithoutDescriptions.length} games without descriptions to investigate\n`);
    
    for (const game of gamesWithoutDescriptions) {
      try {
        console.log(`\n=== Investigating: ${game.nameEn} (BGG ID: ${game.bggId}) ===`);
        
        if (!game.bggId) {
          console.log(`❌ No BGG ID - can't investigate`);
          continue;
        }
        
        // Fetch from BGG
        const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${game.bggId}&stats=1`);
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '',
          textNodeName: '_text'
        });
        
        const data = parser.parse(response.data);
        
        if (data.items && data.items.item) {
          const bggGame = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
          
          console.log(`📊 Game Type: ${bggGame.type || 'Unknown'}`);
          console.log(`📊 Available Fields: ${Object.keys(bggGame).join(', ')}`);
          
          // Check description specifically
          if (bggGame.description) {
            console.log(`✅ DESCRIPTION FOUND: ${bggGame.description.length} characters`);
            console.log(`📝 Preview: ${bggGame.description.substring(0, 100)}...`);
          } else {
            console.log(`❌ NO DESCRIPTION FIELD`);
            
            // Check for alternative description fields
            const altFields = ['summary', 'overview', 'text', 'content', 'details'];
            altFields.forEach(field => {
              if (bggGame[field]) {
                console.log(`🔍 Alternative field "${field}" found: ${bggGame[field].length || 'unknown'} chars`);
              }
            });
          }
          
          // Check if it's a valid board game
          if (bggGame.type !== 'boardgame') {
            console.log(`⚠️  WARNING: Game type is "${bggGame.type}", not "boardgame"`);
          }
          
        } else {
          console.log(`❌ No BGG data found`);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error investigating ${game.nameEn}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error in investigation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissingDescriptions();
