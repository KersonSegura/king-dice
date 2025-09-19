async function testSingleGame() {
  const url = 'https://boardgamegeek.com/xmlapi2/thing?id=13&stats=1';
  
  try {
    console.log(`🔗 Probando URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReglasDeMesa/1.0 (https://reglasdemesa.com)',
        'Accept': 'application/xml'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`📄 Response length: ${text.length}`);
    console.log(`📄 First 500 chars:`, text.substring(0, 500));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleGame(); 