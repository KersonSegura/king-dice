const { scrapeGameRules } = require('./scrape-ultrabg-rules');

async function testScraper() {
  console.log('🧪 Testing UltraBoardGames scraper...');
  
  // Test with a simple game
  const testGame = 'catan';
  console.log(`\n🎯 Testing with: ${testGame}`);
  
  try {
    const result = await scrapeGameRules(testGame, false); // Don't download images for test
    
    if (result) {
      console.log('\n✅ Scraper test successful!');
      console.log(`📝 Title: ${result.title}`);
      console.log(`📏 Content length: ${result.htmlContent.length} characters`);
      console.log(`🔗 Source URL: ${result.sourceUrl}`);
      console.log(`📅 Scraped at: ${result.scrapedAt}`);
      
      // Show first 200 characters of content
      const preview = result.htmlContent.substring(0, 200).replace(/\n/g, ' ');
      console.log(`📖 Content preview: ${preview}...`);
      
      return true;
    } else {
      console.log('❌ Scraper test failed - no result returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Scraper test failed with error:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testScraper()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testScraper };
