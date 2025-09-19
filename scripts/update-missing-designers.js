const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class DesignerDeveloperUpdater {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
  }

  async updateMissingDesigners(limit = 20) {
    try {
      console.log(`🔄 Starting to update missing Designer/Developer data for ${limit} games...`);
      
      // Get games missing designer or developer
      const gamesMissingData = await prisma.game.findMany({
        where: {
          OR: [
            { designer: null },
            { designer: 'Unknown' },
            { developer: null },
            { developer: 'Unknown' }
          ]
        },
        take: limit,
        orderBy: {
          id: 'asc'
        }
      });
      
      console.log(`Found ${gamesMissingData.length} games missing Designer/Developer data\n`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const game of gamesMissingData) {
        try {
          console.log(`\n🔄 Updating: ${game.nameEn} (BGG ID: ${game.bggId})`);
          
          if (!game.bggId) {
            console.log(`⏭️  Skipping - no BGG ID`);
            continue;
          }
          
          // Fetch from BGG
          const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${game.bggId}&stats=1`);
          const data = this.parser.parse(response.data);
          
          if (data.items && data.items.item) {
            const bggGame = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
            
            // Extract designer and developer
            const designer = this.extractDesigner(bggGame);
            const developer = this.extractDeveloper(bggGame);
            
            if (designer || developer) {
              console.log(`📝 Designer: ${designer || 'Not found'}`);
              console.log(`📝 Developer: ${developer || 'Not found'}`);
              
              // Update the game
              await prisma.game.update({
                where: { id: game.id },
                data: {
                  designer: designer || game.designer,
                  developer: developer || game.developer
                }
              });
              
              console.log(`✅ Updated successfully`);
              updatedCount++;
            } else {
              console.log(`❌ No designer/developer data found in BGG`);
              errorCount++;
            }
          }
          
          // Be respectful to BGG API
          await this.delay(1000);
          
        } catch (error) {
          console.error(`❌ Error updating ${game.nameEn}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`\n🎯 Update Summary:`);
      console.log(`✅ Successfully updated: ${updatedCount} games`);
      console.log(`❌ Errors: ${errorCount} games`);
      console.log(`📊 Total processed: ${updatedCount + errorCount} games`);
      
    } catch (error) {
      console.error('Error updating designers/developers:', error);
    }
  }
  
  extractDesigner(game) {
    try {
      if (game.link) {
        const links = Array.isArray(game.link) ? game.link : [game.link];
        const designerLink = links.find(l => l.type === 'boardgamedesigner');
        if (designerLink && designerLink.value) {
          return designerLink.value;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  extractDeveloper(game) {
    try {
      if (game.link) {
        const links = Array.isArray(game.link) ? game.link : [game.link];
        const developerLink = links.find(l => l.type === 'boardgamepublisher');
        if (developerLink && developerLink.value) {
          return developerLink.value;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const updater = new DesignerDeveloperUpdater();
    
    // Update missing designer/developer data for 20 games
    console.log('Starting Designer/Developer update process...');
    await updater.updateMissingDesigners(20);
    
    console.log('Designer/Developer update completed!');
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
