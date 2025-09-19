const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class MechanicsThumbnailUpdater {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
  }

  async updateMissingData(limit = 20) {
    try {
      console.log(`🔄 Starting to update missing Mechanics and Thumbnails for ${limit} games...`);
      
      // Get games missing mechanics or thumbnails
      const gamesMissingData = await prisma.game.findMany({
        where: {
          OR: [
            {
              gameMechanics: {
                none: {}
              }
            },
            {
              thumbnailUrl: null
            }
          ]
        },
        include: {
          gameMechanics: {
            include: {
              mechanic: true
            }
          }
        },
        take: limit,
        orderBy: {
          id: 'asc'
        }
      });
      
      console.log(`Found ${gamesMissingData.length} games missing Mechanics/Thumbnails\n`);
      
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
            
            let hasUpdates = false;
            
            // Extract and update thumbnail
            const thumbnail = this.extractThumbnail(bggGame);
            if (thumbnail) {
              console.log(`🖼️  Thumbnail: ${thumbnail.substring(0, 50)}...`);
              await prisma.game.update({
                where: { id: game.id },
                data: { thumbnailUrl: thumbnail }
              });
              hasUpdates = true;
            }
            
            // Extract and update mechanics
            const mechanics = await this.extractMechanics(bggGame);
            if (mechanics && mechanics.length > 0) {
              console.log(`⚙️  Mechanics: ${mechanics.map(m => m.nameEn).join(', ')}`);
              
              // Remove existing mechanics first
              await prisma.gameMechanic.deleteMany({
                where: { gameId: game.id }
              });
              
              // Add new mechanics
              for (const mechanic of mechanics) {
                await prisma.gameMechanic.create({
                  data: {
                    gameId: game.id,
                    mechanicId: mechanic.id
                  }
                });
              }
              hasUpdates = true;
            }
            
            if (hasUpdates) {
              console.log(`✅ Updated successfully`);
              updatedCount++;
            } else {
              console.log(`⏭️  No new data to update`);
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
      console.error('Error updating mechanics/thumbnails:', error);
    }
  }
  
  extractThumbnail(game) {
    try {
      if (game.thumbnail) {
        // BGG provides thumbnail as a direct string, not as an object with .value
        return game.thumbnail;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  async extractMechanics(game) {
    try {
      if (!game.link) return [];
      
      const links = Array.isArray(game.link) ? game.link : [game.link];
      const mechanicLinks = links.filter(l => l.type === 'boardgamemechanic');
      
      if (mechanicLinks.length === 0) return [];
      
      const mechanics = [];
      
      for (const mechanicLink of mechanicLinks) {
        if (mechanicLink.value && mechanicLink.id) {
          // Find or create the mechanic
          let mechanic = await prisma.mechanic.findFirst({
            where: { nameEn: mechanicLink.value }
          });
          
          if (!mechanic) {
            mechanic = await prisma.mechanic.create({
              data: {
                nameEn: mechanicLink.value,
                nameEs: mechanicLink.value, // For now, use English name
                descriptionEn: `Game mechanic: ${mechanicLink.value}`,
                descriptionEs: `Mecánica de juego: ${mechanicLink.value}`
              }
            });
          }
          
          mechanics.push(mechanic);
        }
      }
      
      return mechanics;
    } catch (error) {
      console.error('Error extracting mechanics:', error);
      return [];
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const updater = new MechanicsThumbnailUpdater();
    
    // Update missing mechanics/thumbnails for 20 games
    console.log('Starting Mechanics/Thumbnails update process...');
    await updater.updateMissingData(20);
    
    console.log('Mechanics/Thumbnails update completed!');
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
