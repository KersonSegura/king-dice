const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🚀 Configurando base de datos...');
  
  try {
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Crear tabla si no existe
    console.log('🔄 Sincronizando schema...');
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      "bggId" INTEGER UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      year INTEGER,
      "minPlayers" INTEGER,
      "maxPlayers" INTEGER,
      "minPlayTime" INTEGER,
      "maxPlayTime" INTEGER,
      image TEXT,
      ranking INTEGER,
      "averageRating" FLOAT,
      "numVotes" INTEGER,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    console.log('✅ Tabla games creada/verificada');
    
    // Verificar si hay datos
    const gameCount = await prisma.game.count();
    console.log(`📊 Juegos en la base de datos: ${gameCount}`);
    
    if (gameCount === 0) {
      console.log('💡 La base de datos está vacía. Ejecuta "npm run db:seed" para poblarla.');
    } else {
      console.log('✅ La base de datos ya tiene datos.');
    }
    
  } catch (error) {
    console.error('❌ Error configurando la base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Configuración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la configuración:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase }; 