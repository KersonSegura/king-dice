const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class DescriptionFixer {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
  }

  async fixDescriptions(limit = 10) {
    try {
      console.log(`🔧 Starting to fix descriptions for ${limit} games...`);
      
      // Get games that have descriptions but with NULL content
      const gamesWithNullDescriptions = await prisma.game.findMany({
        where: {
          descriptions: {
            some: {
              OR: [
                { shortDescription: null },
                { fullDescription: null }
              ]
            }
          }
        },
        include: {
          descriptions: true
        },
        take: limit,
        orderBy: {
          id: 'asc'
        }
      });
      
      console.log(`Found ${gamesWithNullDescriptions.length} games with NULL description fields`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const game of gamesWithNullDescriptions) {
        try {
          console.log(`\n🔄 Fixing description for: ${game.nameEn} (BGG ID: ${game.bggId})`);
          
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
              
              // Update existing descriptions
              for (const desc of game.descriptions) {
                await prisma.gameDescription.update({
                  where: {
                    id: desc.id
                  },
                  data: {
                    shortDescription: this.createShortDescription(description),
                    fullDescription: description
                  }
                });
              }
              
              console.log(`✅ Description fixed successfully`);
              updatedCount++;
              
            } else {
              console.log(`❌ No description found in BGG data`);
              errorCount++;
            }
          }
          
          // Be respectful to BGG API
          await this.delay(1000);
          
        } catch (error) {
          console.error(`❌ Error fixing ${game.nameEn}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`\n🎯 Fix Summary:`);
      console.log(`✅ Successfully fixed: ${updatedCount} games`);
      console.log(`❌ Errors: ${errorCount} games`);
      console.log(`📊 Total processed: ${updatedCount + errorCount} games`);
      
    } catch (error) {
      console.error('Error fixing descriptions:', error);
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
    const fixer = new DescriptionFixer();
    
    // Fix descriptions for 10 games first to test
    console.log('Starting description fix process...');
    await fixer.fixDescriptions(10);
    
    console.log('Description fix completed!');
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
