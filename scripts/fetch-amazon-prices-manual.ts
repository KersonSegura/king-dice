/**
 * Script to help manually fetch Amazon prices
 * This script opens each Amazon product page so you can easily copy prices
 */

import fs from 'fs';
import path from 'path';
import { boardGames } from '../data/board-games';

interface PriceInfo {
  asin: string;
  name: string;
  amazonUrl: string;
  currentPrice?: string;
  originalPrice?: string;
  rating?: number;
}

console.log('📋 Amazon Price Fetcher - Manual Helper\n');
console.log('Este script te ayudará a obtener precios de Amazon manualmente.\n');
console.log('Para cada juego:\n');
console.log('1. Abre el enlace de Amazon');
console.log('2. Busca el precio actual (cerca del botón "Add to Cart")');
console.log('3. Busca el precio original/list price (si hay descuento)');
console.log('4. Busca el rating (estrellas)');
console.log('5. Copia la información y actualiza el archivo data/board-games.ts\n');
console.log('='.repeat(80));
console.log('\n');

const gamesNeedingPrices = boardGames.filter(game => 
  !game.price || game.price === '$0.00' || !game.rating
);

if (gamesNeedingPrices.length === 0) {
  console.log('✅ Todos los juegos ya tienen precios y ratings configurados!');
  process.exit(0);
}

console.log(`📊 Juegos que necesitan precios: ${gamesNeedingPrices.length}\n`);

gamesNeedingPrices.forEach((game, index) => {
  console.log(`${index + 1}. ${game.name}`);
  console.log(`   ASIN: ${game.asin}`);
  console.log(`   URL: ${game.amazonUrl}`);
  console.log(`   Precio actual: ${game.price || 'NO CONFIGURADO'}`);
  console.log(`   Rating: ${game.rating || 'NO CONFIGURADO'}`);
  console.log('');
});

console.log('='.repeat(80));
console.log('\n💡 Tips para obtener precios:\n');
console.log('1. El precio actual está cerca del botón "Add to Cart"');
console.log('2. El precio original (si hay descuento) aparece tachado');
console.log('3. El rating está en las estrellas (ej: "4.8 out of 5 stars")');
console.log('4. Algunos productos no tienen descuento, solo precio actual');
console.log('\n📝 Formato para actualizar en data/board-games.ts:\n');
console.log('price: \'$XX.XX\',');
console.log('originalPrice: \'$XX.XX\', // Solo si hay descuento');
console.log('rating: X.X,');
console.log('\n');

// Generate a template file with all the games
const template = gamesNeedingPrices.map((game, index) => {
  return `// ${index + 1}. ${game.name} (ASIN: ${game.asin})
// URL: ${game.amazonUrl}
// TODO: Visita la URL y copia:
// - Precio actual: $XX.XX
// - Precio original (si hay descuento): $XX.XX
// - Rating: X.X estrellas
{
  id: '${game.id}',
  price: '$0.00', // TODO: Actualizar
  originalPrice: undefined, // TODO: Actualizar si hay descuento
  rating: 0, // TODO: Actualizar
}`;
}).join('\n\n');

const templatePath = path.join(process.cwd(), 'data', 'price-update-template.ts');
fs.writeFileSync(templatePath, `// Template para actualizar precios\n// Copia y pega en data/board-games.ts\n\n${template}\n`);

console.log(`✅ Template generado en: ${templatePath}`);
console.log('   Puedes usar este archivo como referencia al actualizar los precios.\n');

