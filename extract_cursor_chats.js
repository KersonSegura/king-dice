const fs = require('fs');
const path = require('path');

// Script para extraer chats de Cursor desde LevelDB
const LEVELDB_PATH = 'C:\\Users\\Kerson\\AppData\\Roaming\\Cursor\\Local Storage\\leveldb';

console.log('🔍 Extractor de Chats de Cursor');
console.log('================================');

// Función para leer archivos binarios y buscar texto legible
function extractTextFromBinaryFile(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        const text = buffer.toString('utf8');
        
        // Buscar patrones que parezcan conversaciones
        const chatPatterns = [
            /conversation[^}]*}/gi,
            /messages?[^}]*}/gi,
            /"content":\s*"[^"]*"/gi,
            /"role":\s*"[^"]*"/gi,
            /"timestamp":\s*"[^"]*"/gi,
            /\{"id":[^}]*\}/gi
        ];
        
        let foundData = [];
        
        chatPatterns.forEach((pattern, index) => {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                console.log(`\n📋 Patrón ${index + 1} encontrado (${matches.length} coincidencias):`);
                matches.slice(0, 3).forEach((match, i) => {
                    console.log(`  ${i + 1}. ${match.substring(0, 100)}...`);
                });
                foundData = foundData.concat(matches);
            }
        });
        
        return foundData;
    } catch (error) {
        console.log(`❌ Error leyendo ${filePath}: ${error.message}`);
        return [];
    }
}

// Función principal
function extractChats() {
    if (!fs.existsSync(LEVELDB_PATH)) {
        console.log('❌ No se encontró el directorio de LevelDB');
        return;
    }
    
    console.log(`📁 Explorando: ${LEVELDB_PATH}`);
    
    const files = fs.readdirSync(LEVELDB_PATH);
    console.log(`📄 Archivos encontrados: ${files.join(', ')}`);
    
    let allChatData = [];
    
    files.forEach(file => {
        if (file.endsWith('.log') || file.startsWith('MANIFEST') || file.endsWith('.ldb')) {
            console.log(`\n🔍 Analizando: ${file}`);
            const filePath = path.join(LEVELDB_PATH, file);
            const chatData = extractTextFromBinaryFile(filePath);
            allChatData = allChatData.concat(chatData);
        }
    });
    
    if (allChatData.length > 0) {
        console.log(`\n✅ Total de datos encontrados: ${allChatData.length}`);
        
        // Guardar en archivo para análisis
        const outputFile = 'cursor_chats_extracted.json';
        fs.writeFileSync(outputFile, JSON.stringify(allChatData, null, 2));
        console.log(`💾 Datos guardados en: ${outputFile}`);
    } else {
        console.log('\n❌ No se encontraron datos de chat en los archivos');
    }
}

// Ejecutar
extractChats();

