const axios = require('axios');
const cheerio = require('cheerio');

async function checkBGGRulebooks() {
  try {
    console.log('🔍 Checking BGG for downloadable rulebooks...\n');
    
    // Check Catan's BGG page for rulebook files
    const catanBGGUrl = 'https://boardgamegeek.com/boardgame/134277/catan';
    console.log(`Checking Catan BGG page: ${catanBGGUrl}`);
    
    const response = await axios.get(catanBGGUrl);
    const $ = cheerio.load(response.data);
    
    console.log('\n🔍 Looking for rulebook files...');
    
    // Look for file download links
    const fileLinks = $('a[href*="/file/"]');
    console.log(`Found ${fileLinks.length} file links`);
    
    fileLinks.each((index, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      console.log(`${index + 1}. ${text} - ${href}`);
    });
    
    // Look for rulebook specific links
    const rulebookLinks = $('a[href*="rulebook"], a[href*="rules"], a[href*="manual"]');
    console.log(`\nFound ${rulebookLinks.length} rulebook-specific links`);
    
    rulebookLinks.each((index, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      console.log(`${index + 1}. ${text} - ${href}`);
    });
    
    // Look for download buttons
    const downloadButtons = $('.download-button, .file-download, [class*="download"]');
    console.log(`\nFound ${downloadButtons.length} download buttons`);
    
    downloadButtons.each((index, element) => {
      const text = $(element).text().trim();
      const href = $(element).attr('href');
      console.log(`${index + 1}. ${text}${href ? ` - ${href}` : ''}`);
    });
    
    // Check for files section
    const filesSection = $('[id*="files"], [class*="files"]');
    console.log(`\nFound ${filesSection.length} files sections`);
    
    filesSection.each((index, element) => {
      const id = $(element).attr('id') || $(element).attr('class');
      const text = $(element).text().substring(0, 100);
      console.log(`${index + 1}. ${id} - ${text}...`);
    });
    
  } catch (error) {
    console.error('Error checking BGG rulebooks:', error.message);
  }
}

checkBGGRulebooks();
