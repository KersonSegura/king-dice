async function debugXML() {
  const url = 'https://boardgamegeek.com/xmlapi2/thing?id=13&stats=1';
  
  try {
    console.log(`🔗 Probando URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReglasDeMesa/1.0 (https://reglasdemesa.com)',
        'Accept': 'application/xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`📄 Response length: ${text.length}`);
    
    // Buscar elementos <item>
    const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/g);
    console.log(`📄 Encontrados ${itemMatches ? itemMatches.length : 0} elementos <item>`);
    
    if (itemMatches && itemMatches.length > 0) {
      const firstItem = itemMatches[0];
      console.log(`📄 Primer item (primeros 500 chars):`);
      console.log(firstItem.substring(0, 500));
      
      // Buscar objectid de diferentes formas
      const objectIdPatterns = [
        /objectid="(\d+)"/,
        /id="(\d+)"/,
        /<item[^>]*id="(\d+)"/,
        /<item[^>]*objectid="(\d+)"/
      ];
      
      for (let i = 0; i < objectIdPatterns.length; i++) {
        const match = firstItem.match(objectIdPatterns[i]);
        if (match) {
          console.log(`✅ Patrón ${i + 1} encontrado: ${match[1]}`);
        } else {
          console.log(`❌ Patrón ${i + 1} no encontrado`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugXML(); 