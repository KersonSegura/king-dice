const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Enhanced cleaning function for descriptions
function cleanDescription(description) {
  if (!description) return '';
  
  return description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Non-breaking space
    .replace(/&amp;/g, '&') // Ampersand
    .replace(/&lt;/g, '<') // Less than
    .replace(/&gt;/g, '>') // Greater than
    .replace(/&quot;/g, '"') // Quote
    .replace(/&#39;/g, "'") // Single quote
    .replace(/&apos;/g, "'") // Single quote (alternative)
    .replace(/&mdash;/g, '—') // Em dash
    .replace(/&ndash;/g, '–') // En dash
    .replace(/&hellip;/g, '...') // Ellipsis
    .replace(/&#10;/g, '\n') // Line break
    .replace(/&#13;/g, '\r') // Carriage return
    .replace(/&#9;/g, '\t') // Tab
    .replace(/&copy;/g, '©') // Copyright
    .replace(/&reg;/g, '®') // Registered trademark
    .replace(/&trade;/g, '™') // Trademark
    .replace(/&deg;/g, '°') // Degree
    .replace(/&plusmn;/g, '±') // Plus-minus
    .replace(/&times;/g, '×') // Multiplication
    .replace(/&divide;/g, '÷') // Division
    .replace(/&frac12;/g, '½') // Fraction 1/2
    .replace(/&frac14;/g, '¼') // Fraction 1/4
    .replace(/&frac34;/g, '¾') // Fraction 3/4
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n\n') // Multiple line breaks to double line breaks
    .trim();
}

async function cleanAllDescriptions() {
  try {
    console.log('🧹 Starting to clean all existing descriptions...\n');
    
    // Get all descriptions
    const descriptions = await prisma.gameDescription.findMany();
    console.log(`📝 Found ${descriptions.length} descriptions to clean\n`);
    
    let cleaned = 0;
    let unchanged = 0;
    
    for (const desc of descriptions) {
      const originalShort = desc.shortDescription;
      const originalFull = desc.fullDescription;
      
      // Clean both description fields
      const cleanedShort = cleanDescription(originalShort);
      const cleanedFull = cleanDescription(originalFull);
      
      // Check if anything changed
      if (originalShort !== cleanedShort || originalFull !== cleanedFull) {
        await prisma.gameDescription.update({
          where: { id: desc.id },
          data: {
            shortDescription: cleanedShort,
            fullDescription: cleanedFull
          }
        });
        cleaned++;
        
        if (cleaned % 100 === 0) {
          console.log(`   ✅ Cleaned ${cleaned} descriptions...`);
        }
      } else {
        unchanged++;
      }
    }
    
    console.log(`\n🏆 CLEANING COMPLETED!`);
    console.log(`   🧹 Cleaned: ${cleaned} descriptions`);
    console.log(`   ✅ Unchanged: ${unchanged} descriptions`);
    console.log(`   📊 Total processed: ${descriptions.length}`);
    
  } catch (error) {
    console.error('❌ Error cleaning descriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    await cleanAllDescriptions();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
