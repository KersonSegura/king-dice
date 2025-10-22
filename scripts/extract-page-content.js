// Script to extract content from Official Game Rules page
// You can run this in the browser console on the page

function extractContentFromPage() {
  console.log('🔍 Extracting content from Official Game Rules page...');
  
  // Find the main content area
  const contentSelectors = [
    '.entry-content',
    '.post-content',
    '.content',
    'article .content',
    '.game-rules-content',
    'main',
    'article'
  ];
  
  let mainContent = null;
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element;
      console.log('✅ Found content with selector:', selector);
      break;
    }
  }
  
  if (!mainContent) {
    console.log('❌ Could not find main content area');
    return;
  }
  
  // Extract all images first
  const images = [];
  const imageElements = mainContent.querySelectorAll('img');
  imageElements.forEach((img, index) => {
    if (img.src && !img.src.includes('data:') && !img.src.includes('placeholder')) {
      const altText = img.alt || `Game image ${index + 1}`;
      images.push(`![${altText}](${img.src})`);
    }
  });
  
  // Convert HTML to markdown-like format
  function htmlToMarkdown(html) {
    // Remove script and style tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Convert headings
    html = html.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const hashes = '#'.repeat(parseInt(level));
      return `\n${hashes} ${content.trim()}\n`;
    });
    
    // Convert paragraphs
    html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      return cleanContent ? `${cleanContent}\n\n` : '';
    });
    
    // Convert lists
    html = html.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gi);
      if (items) {
        const listItems = items.map(item => {
          const cleanItem = item.replace(/<[^>]*>/g, '').trim();
          return `- ${cleanItem}`;
        }).join('\n');
        return `\n${listItems}\n\n`;
      }
      return '';
    });
    
    html = html.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gi);
      if (items) {
        const listItems = items.map((item, index) => {
          const cleanItem = item.replace(/<[^>]*>/g, '').trim();
          return `${index + 1}. ${cleanItem}`;
        }).join('\n');
        return `\n${listItems}\n\n`;
      }
      return '';
    });
    
    // Convert strong/bold
    html = html.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    
    // Convert emphasis/italic
    html = html.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
    
    // Convert line breaks
    html = html.replace(/<br\s*\/?>/gi, '\n');
    
    // Convert links
    html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
      return `[${text.trim()}](${href})`;
    });
    
    // Remove remaining HTML tags
    html = html.replace(/<[^>]*>/g, '');
    
    // Clean up extra whitespace
    html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
    html = html.replace(/^\s+|\s+$/g, '');
    
    return html;
  }
  
  // Get the HTML content
  const htmlContent = mainContent.innerHTML;
  
  // Convert to markdown
  const markdownContent = htmlToMarkdown(htmlContent);
  
  // Combine images with content
  const finalContent = images.length > 0 ? images.join('\n\n') + '\n\n' + markdownContent : markdownContent;
  
  console.log('✅ Extracted content:');
  console.log('📊 Stats:');
  console.log('- Images found:', images.length);
  console.log('- Content length:', markdownContent.length);
  console.log('- Final length:', finalContent.length);
  
  // Copy to clipboard
  navigator.clipboard.writeText(finalContent).then(() => {
    console.log('✅ Content copied to clipboard!');
    console.log('📋 You can now paste it in your admin interface.');
  }).catch(err => {
    console.log('❌ Could not copy to clipboard:', err);
    console.log('📋 Here is the content to copy manually:');
    console.log(finalContent);
  });
  
  return finalContent;
}

// Run the extraction
extractContentFromPage();
