const fs = require('fs');
const path = require('path');

// Script mejorado para encontrar chats de Cursor
const CURSOR_PATH = 'C:\\Users\\Kerson\\AppData\\Roaming\\Cursor';

console.log('🔍 Buscador Avanzado de Chats de Cursor');
console.log('=====================================');

// Función para buscar recursivamente archivos que contengan conversaciones
function searchForChats(directory) {
    const chatData = [];
    
    try {
        const items = fs.readdirSync(directory);
        
        for (const item of items) {
            const fullPath = path.join(directory, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Recursivamente buscar en subdirectorios
                chatData.push(...searchForChats(fullPath));
            } else if (item.endsWith('.json') && stat.size > 1000) {
                // Leer archivos JSON grandes
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // Buscar patrones que indiquen conversaciones de chat
                    const chatPatterns = [
                        /"messages":\s*\[/,
                        /"conversation/,
                        /"role":\s*"(user|assistant|system)"/,
                        /"content":\s*"[^"]{50,}/,
                        /chat.*history/i,
                        /previous.*chat/i
                    ];
                    
                    let isChat = false;
                    let matchedPattern = '';
                    
                    for (const pattern of chatPatterns) {
                        if (pattern.test(content)) {
                            isChat = true;
                            matchedPattern = pattern.toString();
                            break;
                        }
                    }
                    
                    if (isChat) {
                        console.log(`\n✅ CHAT ENCONTRADO: ${fullPath}`);
                        console.log(`   📏 Tamaño: ${stat.size} bytes`);
                        console.log(`   📅 Modificado: ${stat.mtime.toLocaleString()}`);
                        console.log(`   🔍 Patrón: ${matchedPattern}`);
                        
                        // Intentar parsear como JSON
                        try {
                            const jsonData = JSON.parse(content);
                            chatData.push({
                                file: fullPath,
                                size: stat.size,
                                modified: stat.mtime,
                                data: jsonData
                            });
                            
                            // Mostrar preview del contenido
                            if (jsonData.messages && Array.isArray(jsonData.messages)) {
                                console.log(`   💬 Mensajes: ${jsonData.messages.length}`);
                            } else if (typeof jsonData === 'object') {
                                console.log(`   📋 Claves: ${Object.keys(jsonData).join(', ')}`);
                            }
                        } catch (parseError) {
                            console.log(`   ⚠️ No se pudo parsear como JSON válido`);
                        }
                    }
                } catch (readError) {
                    // Ignorar errores de lectura
                }
            }
        }
    } catch (error) {
        // Ignorar errores de acceso a directorios
    }
    
    return chatData;
}

// Función principal
function findChats() {
    console.log(`📁 Buscando en: ${CURSOR_PATH}`);
    
    const allChats = searchForChats(CURSOR_PATH);
    
    console.log(`\n🎯 RESUMEN:`);
    console.log(`   Total de chats encontrados: ${allChats.length}`);
    
    if (allChats.length > 0) {
        // Guardar resumen
        const summary = allChats.map(chat => ({
            file: chat.file,
            size: chat.size,
            modified: chat.modified,
            preview: typeof chat.data === 'object' ? Object.keys(chat.data).slice(0, 5) : 'No parseable'
        }));
        
        fs.writeFileSync('cursor_chats_summary.json', JSON.stringify(summary, null, 2));
        console.log(`\n💾 Resumen guardado en: cursor_chats_summary.json`);
        
        // Guardar datos completos si no son demasiados
        if (allChats.length <= 10) {
            fs.writeFileSync('cursor_chats_full_data.json', JSON.stringify(allChats, null, 2));
            console.log(`💾 Datos completos guardados en: cursor_chats_full_data.json`);
        }
    } else {
        console.log(`❌ No se encontraron archivos de chat`);
        console.log(`\n🔍 Búsquedas alternativas:`);
        console.log(`   1. Buscar en: %LOCALAPPDATA%\\Cursor`);
        console.log(`   2. Buscar archivos .db o .sqlite`);
        console.log(`   3. Verificar si los chats están en la nube`);
    }
}

// Ejecutar
findChats();

