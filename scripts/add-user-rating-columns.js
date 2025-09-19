const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addUserRatingColumns() {
  console.log('🚀 Agregando columnas de rating de usuarios...');
  
  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Agregar columnas de rating de usuarios
    console.log('🔄 Agregando columnas userRating y userVotes...');
    await prisma.$executeRaw`
      ALTER TABLE games
      ADD COLUMN IF NOT EXISTS "userRating" FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "userVotes" INTEGER DEFAULT 0
    `;
    console.log('✅ Columnas de rating de usuarios agregadas exitosamente');
    
    // Crear tabla de votos de usuarios si no existe
    console.log('🔄 Creando tabla user_votes...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_votes (
        id SERIAL PRIMARY KEY,
        "gameId" INTEGER NOT NULL,
        "userId" VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("gameId") REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE("gameId", "userId")
      )
    `;
    console.log('✅ Tabla user_votes creada exitosamente');
    
    // Verificar la estructura de la tabla games
    console.log('\n📊 Estructura actual de la tabla games:');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'games'
      ORDER BY ordinal_position
    `;
    
    tableInfo.forEach(column => {
      console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${column.column_default ? `default: ${column.column_default}` : ''}`);
    });
    
    console.log('\n✅ Columnas de rating de usuarios agregadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error agregando columnas de rating de usuarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  addUserRatingColumns()
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { addUserRatingColumns }; 