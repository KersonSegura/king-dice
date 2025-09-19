const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Actualizando cliente de Prisma...');

try {
  // Verificar si el directorio .prisma existe
  const prismaDir = path.join(__dirname, '../node_modules/.prisma');
  
  if (fs.existsSync(prismaDir)) {
    console.log('🗑️ Eliminando directorio .prisma existente...');
    fs.rmSync(prismaDir, { recursive: true, force: true });
  }
  
  console.log('🔄 Regenerando cliente de Prisma...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Cliente de Prisma actualizado exitosamente');
  
} catch (error) {
  console.error('❌ Error actualizando cliente de Prisma:', error.message);
  console.log('💡 Intenta ejecutar manualmente: npx prisma generate');
} 