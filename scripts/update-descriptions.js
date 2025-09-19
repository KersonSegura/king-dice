const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class DescriptionUpdater {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
  }

  async updateGameDescriptions(limit = 10) {
    try {
      console.log(`Starting to update descriptions for ${limit} games...`);
      
      // Get games without descriptions
      const gamesWithoutDescriptions = await prisma.game.findMany({
        where: {
          descriptions: {
            none: {}
          }
        },
        take: limit,
        orderBy: {
          id: 'asc'
        }
      });
      
      console.log(`Found ${gamesWithoutDescriptions.length} games without descriptions`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const game of gamesWithoutDescriptions) {
        try {
          console.log(`\n🔄 Updating description for: ${game.nameEn} (BGG ID: ${game.bggId})`);
          
          if (!game.bggId) {
            console.log(`⏭️  Skipping - no BGG ID`);
            continue;
          }
          
          // Fetch game details from BGG
          const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${game.bggId}&stats=1`);
          const data = this.parser.parse(response.data);
          
          if (data.items && data.items.item) {
            const bggGame = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
            
            if (bggGame.description) {
              const description = this.cleanDescription(bggGame.description);
              console.log(`📝 Found description: ${description.length} characters`);
              
              // Create or update description
              await prisma.gameDescription.upsert({
                where: {
                  gameId_language: {
                    gameId: game.id,
                    language: 'en'
                  }
                },
                update: {
                  shortDescription: this.createShortDescription(description),
                  fullDescription: description
                },
                create: {
                  gameId: game.id,
                  language: 'en',
                  shortDescription: this.createShortDescription(description),
                  fullDescription: description
                }
              });
              
              // Also create Spanish description (for now, use English)
              await prisma.gameDescription.upsert({
                where: {
                  gameId_language: {
                    gameId: game.id,
                    language: 'es'
                  }
                },
                update: {
                  shortDescription: this.createShortDescription(description),
                  fullDescription: description
                },
                create: {
                  gameId: game.id,
                  language: 'es',
                  shortDescription: this.createShortDescription(description),
                  fullDescription: description
                }
              });
              
              console.log(`✅ Description updated successfully`);
              updatedCount++;
              
            } else {
              console.log(`❌ No description found in BGG data`);
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
      console.error('Error updating descriptions:', error);
    }
  }
  
  cleanDescription(description) {
    // Remove HTML tags and clean up the description
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#10;/g, '\n') // Convert HTML line breaks to actual line breaks
      .trim();
  }
  
  createShortDescription(description) {
    if (description.length <= 200) {
      return description;
    }
    return description.substring(0, 200) + '...';
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const updater = new DescriptionUpdater();
    
    // Update descriptions for 40 games to complete the database
    console.log('Starting description update process...');
    await updater.updateGameDescriptions(40);
    
    console.log('Description update completed!');
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
