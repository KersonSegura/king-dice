const axios = require('axios');
const cheerio = require('cheerio');

async function debugAceSpadesFiles() {
  try {
    console.log('🔍 Debugging Ace of Spades files page...\n');
    
    const response = await axios.get('https://boardgamegeek.com/boardgame/429861/ace-of-spades/files');
    const $ = cheerio.load(response.data);
    
    console.log('📄 Page title:', $('title').text());
    console.log('📄 Page length:', response.data.length);
    
    // Look for any links
    const allLinks = $('a');
    console.log(`\n🔗 Total links found: ${allLinks.length}`);
    
    // Look for links with href
    const linksWithHref = $('a[href]');
    console.log(`🔗 Links with href: ${linksWithHref.length}`);
    
    // Show first 20 links
    console.log('\n📋 First 20 links:');
    linksWithHref.slice(0, 20).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (text && text.length < 100) {
        console.log(`   ${i + 1}. "${text}" -> ${href}`);
      }
    });
    
    // Look for specific patterns
    console.log('\n🔍 Looking for specific patterns...');
    
    // PDF links
    const pdfLinks = $('a[href*=".pdf"]');
    console.log(`   PDF links: ${pdfLinks.length}`);
    
    // File links
    const fileLinks = $('a[href*="file"]');
    console.log(`   File links: ${fileLinks.length}`);
    
    // Download links
    const downloadLinks = $('a[href*="download"]');
    console.log(`   Download links: ${downloadLinks.length}`);
    
    // Look for text containing "rule", "manual", etc.
    const ruleText = $('*:contains("rule"), *:contains("manual"), *:contains("instruction")');
    console.log(`   Elements with rule/manual/instruction: ${ruleText.length}`);
    
    // Check if there's a "No files uploaded" message
    const noFilesText = $('*:contains("No files uploaded"), *:contains("no files"), *:contains("empty")');
    if (noFilesText.length > 0) {
      console.log('\n📝 Found "no files" text:');
      noFilesText.slice(0, 5).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length < 200) {
          console.log(`   "${text}"`);
        }
      });
    }
    
    // Look for table structure
    const tables = $('table');
    console.log(`\n📊 Tables found: ${tables.length}`);
    
    if (tables.length > 0) {
      console.log('   Table contents:');
      tables.each((i, table) => {
        const rows = $(table).find('tr');
        console.log(`     Table ${i + 1}: ${rows.length} rows`);
        
        if (rows.length > 0) {
          rows.slice(0, 3).each((j, row) => {
            const cells = $(row).find('td, th');
            const cellTexts = cells.map((k, cell) => $(cell).text().trim()).get();
            console.log(`       Row ${j + 1}: [${cellTexts.join(' | ')}]`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAceSpadesFiles();
