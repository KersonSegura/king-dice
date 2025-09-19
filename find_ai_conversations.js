const fs = require('fs');
const path = require('path');

// Script específico para encontrar conversaciones AI de Cursor
const SEARCH_PATHS = [
    'C:\\Users\\Kerson\\AppData\\Roaming\\Cursor',
    'C:\\Users\\Kerson\\AppData\\Local\\Cursor',
    'C:\\Users\\Kerson\\.cursor'
];

console.log('🤖 Buscador de Conversaciones AI de Cursor');
console.log('==========================================');

function searchAIConversations(directory, depth = 0) {
    if (depth > 5) return []; // Evitar recursión infinita
    
    const conversations = [];
    
    try {
        const items = fs.readdirSync(directory);
        
        for (const item of items) {
            const fullPath = path.join(directory, item);
            
            try {
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    conversations.push(...searchAIConversations(fullPath, depth + 1));
                } else if (item.endsWith('.json') || item.endsWith('.db') || item.endsWith('.sqlite')) {
                    try {
                        let content = '';
                        
                        if (item.endsWith('.json')) {
                            content = fs.readFileSync(fullPath, 'utf8');
                        } else {
                            // Para archivos binarios, convertir a string
                            const buffer = fs.readFileSync(fullPath);
                            content = buffer.toString('utf8', 0, Math.min(10000, buffer.length));
                        }
                        
                        // Patrones específicos para conversaciones AI
                        const aiPatterns = [
                            /assistant.*message/i,
                            /user.*message/i,
                            /conversation.*history/i,
                            /chat.*session/i,
                            /"role":\s*"assistant"/,
                            /"role":\s*"user"/,
                            /cursor.*chat/i,
                            /ai.*response/i,
                            /previous.*conversations?/i,
                            /message.*thread/i
                        ];
                        
                        let foundPattern = null;
                        for (const pattern of aiPatterns) {
                            if (pattern.test(content)) {
                                foundPattern = pattern;
                                break;
                            }
                        }
                        
                        if (foundPattern) {
                            console.log(`\n🎯 CONVERSACIÓN AI ENCONTRADA:`);
                            console.log(`   📁 Archivo: ${fullPath}`);
                            console.log(`   📏 Tamaño: ${stat.size} bytes`);
                            console.log(`   📅 Modificado: ${stat.mtime.toLocaleString()}`);
                            console.log(`   🔍 Patrón: ${foundPattern.toString()}`);
                            
                            // Mostrar preview del contenido
                            const preview = content.substring(0, 200).replace(/\\n/g, ' ').replace(/\s+/g, ' ');
                            console.log(`   👀 Preview: ${preview}...`);
                            
                            conversations.push({
                                file: fullPath,
                                size: stat.size,
                                modified: stat.mtime,
                                pattern: foundPattern.toString(),
                                preview: preview
                            });
                        }
                    } catch (readError) {
                        // Ignorar errores de lectura
                    }
                }
            } catch (statError) {
                // Ignorar errores de stat
            }
        }
    } catch (error) {
        // Ignorar errores de acceso
    }
    
    return conversations;
}

// Función principal
function findAIConversations() {
    let allConversations = [];
    
    for (const searchPath of SEARCH_PATHS) {
        if (fs.existsSync(searchPath)) {
            console.log(`\n📁 Buscando en: ${searchPath}`);
            const conversations = searchAIConversations(searchPath);
            allConversations.push(...conversations);
        } else {
            console.log(`\n❌ Directorio no existe: ${searchPath}`);
        }
    }
    
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   Total de conversaciones AI encontradas: ${allConversations.length}`);
    
    if (allConversations.length > 0) {
        // Ordenar por fecha de modificación (más reciente primero)
        allConversations.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        
        console.log(`\n🏆 TOP 5 MÁS RECIENTES:`);
        allConversations.slice(0, 5).forEach((conv, index) => {
            console.log(`   ${index + 1}. ${path.basename(conv.file)} (${conv.size} bytes)`);
            console.log(`      📅 ${conv.modified.toLocaleString()}`);
        });
        
        // Guardar resultados
        const summary = {
            totalFound: allConversations.length,
            searchPaths: SEARCH_PATHS,
            conversations: allConversations
        };
        
        fs.writeFileSync('ai_conversations_found.json', JSON.stringify(summary, null, 2));
        console.log(`\n💾 Resultados guardados en: ai_conversations_found.json`);
    } else {
        console.log(`\n❓ POSIBLES UBICACIONES ALTERNATIVAS:`);
        console.log(`   1. Los chats pueden estar en la nube (cuenta de Cursor)`);
        console.log(`   2. Pueden estar en formato diferente (.db, .sqlite)`);
        console.log(`   3. Pueden estar en: %LOCALAPPDATA%\\Programs\\Cursor`);
        console.log(`   4. Verificar configuración de sincronización en Cursor`);
    }
}

// Ejecutar
findAIConversations();

