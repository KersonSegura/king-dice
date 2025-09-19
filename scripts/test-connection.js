const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Probando conexión a PostgreSQL...');
console.log('📋 Variables de entorno:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Intentando conectar...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa!');
    
    // Probar una consulta simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Consulta de prueba exitosa:', result);
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('🔍 Detalles del error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .then(() => {
    console.log('✅ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 