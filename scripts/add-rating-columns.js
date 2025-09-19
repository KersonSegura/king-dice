const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addRatingColumns() {
  console.log('🚀 Agregando columnas de rating...');
  
  try {
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Agregar columnas si no existen
    console.log('🔄 Agregando columnas averageRating y numVotes...');
    
    await prisma.$executeRaw`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS "averageRating" FLOAT,
      ADD COLUMN IF NOT EXISTS "numVotes" INTEGER
    `;
    
    console.log('✅ Columnas agregadas exitosamente');
    
    // Verificar la estructura de la tabla
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'games' 
      ORDER BY ordinal_position
    `;
    
    console.log('📊 Estructura actual de la tabla games:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error agregando columnas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  addRatingColumns()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { addRatingColumns }; 