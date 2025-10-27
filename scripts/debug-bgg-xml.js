const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// BoardGameGeek XML API2 endpoint for getting game details
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2/thing';

async function debugBGGData(bggId) {
  try {
    console.log(`🔍 Debugging BGG data for game ID: ${bggId}`);
    
    const response = await fetch(`${BGG_API_BASE}?id=${bggId}&stats=1`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Log the XML to see the structure
    console.log('📄 Raw XML (first 2000 chars):');
    console.log(xmlText.substring(0, 2000));
    console.log('\n...\n');
    
    // Look for all rank elements
    const rankMatches = xmlText.match(/<rank[^>]*>/g);
    console.log('🏆 All rank elements found:');
    if (rankMatches) {
      rankMatches.forEach((rank, index) => {
        console.log(`${index + 1}: ${rank}`);
      });
    } else {
      console.log('No rank elements found');
    }
    
    // Look for average rating
    const ratingMatch = xmlText.match(/<average[^>]*>/g);
    console.log('\n⭐ Average rating element:');
    if (ratingMatch) {
      console.log(ratingMatch[0]);
    } else {
      console.log('No average rating element found');
    }
    
    // Look for usersrated
    const votesMatch = xmlText.match(/<usersrated[^>]*>/g);
    console.log('\n👥 Users rated element:');
    if (votesMatch) {
      console.log(votesMatch[0]);
    } else {
      console.log('No usersrated element found');
    }
    
  } catch (error) {
    console.error(`❌ Error debugging BGG data for ${bggId}:`, error.message);
  }
}

async function debugSpecificGame() {
  try {
    // Debug SETI specifically since you mentioned it
    await debugBGGData(418059);
  } catch (error) {
    console.error('❌ Fatal error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugSpecificGame();
