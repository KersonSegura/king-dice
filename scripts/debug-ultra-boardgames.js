const axios = require('axios');
const cheerio = require('cheerio');

async function debugUltraBoardGames() {
  try {
    console.log('🔍 Debugging Ultra BoardGames website structure...\n');
    
    // Test 1: Main page
    console.log('1️⃣ Testing main page...');
    try {
      const response = await axios.get('https://ultraboardgames.com/');
      const $ = cheerio.load(response.data);
      
      console.log(`   Page title: ${$('title').text()}`);
      console.log(`   Page length: ${response.data.length}`);
      
      // Look for navigation links
      const navLinks = $('nav a, .menu a, .navigation a');
      console.log(`   Navigation links: ${navLinks.length}`);
      
      navLinks.slice(0, 10).each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (text && text.length < 50) {
          console.log(`     ${i + 1}. "${text}" -> ${href}`);
        }
      });
      
      // Look for game-related links
      const gameLinks = $('a[href*="game"], a[href*="rules"]');
      console.log(`   Game/Rules links: ${gameLinks.length}`);
      
      gameLinks.slice(0, 5).each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (text && text.length < 100) {
          console.log(`     ${i + 1}. "${text}" -> ${href}`);
        }
      });
      
    } catch (error) {
      console.log(`   Main page error: ${error.message}`);
    }
    
    // Test 2: Games page
    console.log('\n2️⃣ Testing games page...');
    try {
      const response = await axios.get('https://ultraboardgames.com/games/');
      const $ = cheerio.load(response.data);
      
      console.log(`   Games page title: ${$('title').text()}`);
      console.log(`   Games page length: ${response.data.length}`);
      
      // Look for game links
      const gameLinks = $('a[href*="/game/"], a[href*="/games/"]');
      console.log(`   Game links found: ${gameLinks.length}`);
      
      gameLinks.slice(0, 10).each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (text && text.length < 100) {
          console.log(`     ${i + 1}. "${text}" -> ${href}`);
        }
      });
      
    } catch (error) {
      console.log(`   Games page error: ${error.message}`);
    }
    
    // Test 3: Try to find a specific game page
    console.log('\n3️⃣ Testing specific game page...');
    try {
      // Try to find a game that might exist
      const response = await axios.get('https://ultraboardgames.com/game/monopoly-speed-game-rules/');
      const $ = cheerio.load(response.data);
      
      console.log(`   Game page title: ${$('title').text()}`);
      console.log(`   Game page length: ${response.data.length}`);
      
      // Look for content
      const content = $('h1, h2, h3, p').text().substring(0, 500);
      console.log(`   Content preview: ${content}...`);
      
    } catch (error) {
      console.log(`   Specific game page error: ${error.message}`);
    }
    
    // Test 4: Look for search functionality
    console.log('\n4️⃣ Testing search functionality...');
    try {
      const response = await axios.get('https://ultraboardgames.com/?s=monopoly');
      const $ = cheerio.load(response.data);
      
      console.log(`   Search page title: ${$('title').text()}`);
      console.log(`   Search page length: ${response.data.length}`);
      
      // Look for search results
      const searchResults = $('.search-results, .results, article');
      console.log(`   Search results found: ${searchResults.length}`);
      
      if (searchResults.length > 0) {
        searchResults.slice(0, 3).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length < 200) {
            console.log(`     Result ${i + 1}: ${text}`);
          }
        });
      }
      
    } catch (error) {
      console.log(`   Search error: ${error.message}`);
    }
    
    console.log('\n🎯 Debug complete!');
    
  } catch (error) {
    console.error('❌ Main error:', error.message);
  }
}

debugUltraBoardGames();
