const fs = require('fs');
const path = require('path');

// Script para extraer conversaciones de los archivos state.vscdb de Cursor
const PREVIOUS_CHATS_PATH = 'C:\\Users\\Kerson\\AppData\\Roaming\\Cursor\\Local Storage\\Previous Chats';

console.log('💬 Extractor de Conversaciones de Cursor');
console.log('=======================================');

function extractFromBinaryFile(filePath) {
    try {
        console.log(`\n🔍 Analizando: ${filePath}`);
        const buffer = fs.readFileSync(filePath);
        const content = buffer.toString('utf8');
        
        // Buscar patrones de conversaciones
        const conversationPatterns = [
            // Mensajes de usuario y asistente
            /"role":\s*"(user|assistant)"/g,
            /"content":\s*"[^"]{20,}"/g,
            // Patrones de chat
            /conversation[^}]*}/gi,
            /messages?[^}]*}/gi,
            // Timestamps y IDs
            /"timestamp":\s*\d+/g,
            /"id":\s*"[^"]+"/g
        ];
        
        let allMatches = [];
        let hasConversationData = false;
        
        conversationPatterns.forEach((pattern, index) => {
            const matches = [...content.matchAll(pattern)];
            if (matches.length > 0) {
                hasConversationData = true;
                console.log(`   📋 Patrón ${index + 1}: ${matches.length} coincidencias`);
                allMatches = allMatches.concat(matches.map(m => m[0]));
            }
        });
        
        if (hasConversationData) {
            // Buscar texto que parezca conversaciones reales
            const textBlocks = content.match(/"content":\s*"[^"]{50,}"/g) || [];
            
            if (textBlocks.length > 0) {
                console.log(`   💬 Bloques de texto encontrados: ${textBlocks.length}`);
                
                // Mostrar preview de algunos mensajes
                textBlocks.slice(0, 3).forEach((block, i) => {
                    try {
                        const cleanText = block.replace(/"content":\s*"/, '').replace(/"$/, '');
                        const preview = cleanText.substring(0, 100).replace(/\\n/g, ' ');
                        console.log(`   ${i + 1}. "${preview}..."`);
                    } catch (e) {
                        console.log(`   ${i + 1}. [Error parsing text]`);
                    }
                });
            }
            
            return {
                file: filePath,
                hasData: true,
                matches: allMatches,
                textBlocks: textBlocks
            };
        }
        
        return { file: filePath, hasData: false, matches: [], textBlocks: [] };
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { file: filePath, hasData: false, matches: [], textBlocks: [], error: error.message };
    }
}

function extractAllConversations() {
    if (!fs.existsSync(PREVIOUS_CHATS_PATH)) {
        console.log(`❌ Directorio no encontrado: ${PREVIOUS_CHATS_PATH}`);
        return;
    }
    
    console.log(`📁 Explorando: ${PREVIOUS_CHATS_PATH}`);
    
    const chatDirs = fs.readdirSync(PREVIOUS_CHATS_PATH);
    console.log(`📂 Directorios encontrados: ${chatDirs.length}`);
    
    let allConversations = [];
    
    chatDirs.forEach(chatDir => {
        const chatPath = path.join(PREVIOUS_CHATS_PATH, chatDir);
        
        if (fs.statSync(chatPath).isDirectory()) {
            console.log(`\n📁 Procesando directorio: ${chatDir}`);
            
            // Buscar archivos .vscdb
            const files = fs.readdirSync(chatPath);
            const dbFiles = files.filter(f => f.endsWith('.vscdb'));
            
            if (dbFiles.length > 0) {
                console.log(`   🗄️ Archivos de BD encontrados: ${dbFiles.join(', ')}`);
                
                dbFiles.forEach(dbFile => {
                    const dbPath = path.join(chatPath, dbFile);
                    const result = extractFromBinaryFile(dbPath);
                    if (result.hasData) {
                        allConversations.push(result);
                    }
                });
            } else {
                console.log(`   ⚠️ No se encontraron archivos .vscdb`);
            }
        }
    });
    
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   Conversaciones con datos: ${allConversations.length}`);
    
    if (allConversations.length > 0) {
        // Guardar resultados
        const summary = {
            totalConversations: allConversations.length,
            extractedAt: new Date().toISOString(),
            conversations: allConversations.map(conv => ({
                file: conv.file,
                hasData: conv.hasData,
                matchCount: conv.matches.length,
                textBlockCount: conv.textBlocks.length,
                error: conv.error || null
            }))
        };
        
        fs.writeFileSync('cursor_conversations_summary.json', JSON.stringify(summary, null, 2));
        console.log(`\n💾 Resumen guardado en: cursor_conversations_summary.json`);
        
        // Guardar texto extraído
        const allText = allConversations.flatMap(conv => conv.textBlocks);
        if (allText.length > 0) {
            fs.writeFileSync('cursor_extracted_text.json', JSON.stringify(allText, null, 2));
            console.log(`💾 Texto extraído guardado en: cursor_extracted_text.json`);
            console.log(`📝 Total de bloques de texto: ${allText.length}`);
        }
    } else {
        console.log(`\n❓ POSIBLES SOLUCIONES:`);
        console.log(`   1. Los chats pueden estar encriptados`);
        console.log(`   2. Pueden requerir herramientas específicas de SQLite`);
        console.log(`   3. Verificar si hay archivos .db o .sqlite3 en otros directorios`);
        console.log(`   4. Los chats pueden estar sincronizados en la nube`);
    }
}

// Ejecutar
extractAllConversations();

