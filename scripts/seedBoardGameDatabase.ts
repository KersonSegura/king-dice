import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding board game database...');

  // Create basic categories
  console.log('📂 Creating categories...');
  const categories = [
    // Main categories
    { nameEn: 'Strategy', nameEs: 'Estrategia', descriptionEn: 'Games requiring strategic thinking and planning', descriptionEs: 'Juegos que requieren pensamiento estratégico y planificación' },
    { nameEn: 'Party', nameEs: 'Fiesta', descriptionEn: 'Social games for groups and parties', descriptionEs: 'Juegos sociales para grupos y fiestas' },
    { nameEn: 'Family', nameEs: 'Familiar', descriptionEn: 'Games suitable for all ages', descriptionEs: 'Juegos aptos para todas las edades' },
    { nameEn: 'Card Game', nameEs: 'Juego de Cartas', descriptionEn: 'Games primarily using cards', descriptionEs: 'Juegos que utilizan principalmente cartas' },
    { nameEn: 'Board Game', nameEs: 'Juego de Mesa', descriptionEn: 'Traditional board-based games', descriptionEs: 'Juegos tradicionales basados en tablero' },
    { nameEn: 'Cooperative', nameEs: 'Cooperativo', descriptionEn: 'Games where players work together', descriptionEs: 'Juegos donde los jugadores trabajan juntos' },
    { nameEn: 'Competitive', nameEs: 'Competitivo', descriptionEn: 'Games where players compete against each other', descriptionEs: 'Juegos donde los jugadores compiten entre sí' },
    { nameEn: 'Eurogame', nameEs: 'Eurojuego', descriptionEn: 'European-style strategy games', descriptionEs: 'Juegos de estrategia de estilo europeo' },
    { nameEn: 'Ameritrash', nameEs: 'Ameritrash', descriptionEn: 'American-style thematic games', descriptionEs: 'Juegos temáticos de estilo americano' },
    { nameEn: 'Abstract', nameEs: 'Abstracto', descriptionEn: 'Abstract strategy games', descriptionEs: 'Juegos de estrategia abstractos' },
    
    // Subcategories
    { nameEn: 'Worker Placement', nameEs: 'Colocación de Trabajadores', descriptionEn: 'Games where players place workers to gain resources', descriptionEs: 'Juegos donde los jugadores colocan trabajadores para obtener recursos' },
    { nameEn: 'Deck Building', nameEs: 'Construcción de Mazo', descriptionEn: 'Games where players build their deck during gameplay', descriptionEs: 'Juegos donde los jugadores construyen su mazo durante el juego' },
    { nameEn: 'Area Control', nameEs: 'Control de Área', descriptionEn: 'Games focused on controlling territory', descriptionEs: 'Juegos enfocados en controlar territorio' },
    { nameEn: 'Drafting', nameEs: 'Selección', descriptionEn: 'Games where players select from available options', descriptionEs: 'Juegos donde los jugadores seleccionan de opciones disponibles' },
    { nameEn: 'Social Deduction', nameEs: 'Deducción Social', descriptionEn: 'Games where players must identify hidden roles', descriptionEs: 'Juegos donde los jugadores deben identificar roles ocultos' },
    { nameEn: 'Roll and Write', nameEs: 'Tirar y Escribir', descriptionEn: 'Games combining dice rolling with writing', descriptionEs: 'Juegos que combinan tirar dados con escribir' },
    { nameEn: 'Legacy', nameEs: 'Legado', descriptionEn: 'Games that permanently change between sessions', descriptionEs: 'Juegos que cambian permanentemente entre sesiones' },
    { nameEn: 'Real-time', nameEs: 'Tiempo Real', descriptionEn: 'Games played in real-time without turns', descriptionEs: 'Juegos jugados en tiempo real sin turnos' },
    { nameEn: 'Storytelling', nameEs: 'Narrativa', descriptionEn: 'Games focused on creating stories', descriptionEs: 'Juegos enfocados en crear historias' },
    { nameEn: 'Economic', nameEs: 'Económico', descriptionEn: 'Games focused on resource management and economy', descriptionEs: 'Juegos enfocados en gestión de recursos y economía' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { nameEn: category.nameEn },
      update: {},
      create: category,
    });
  }

  // Create basic mechanics
  console.log('⚙️ Creating mechanics...');
  const mechanics = [
    { nameEn: 'Worker Placement', nameEs: 'Colocación de Trabajadores', descriptionEn: 'Place workers on board spaces to gain resources or actions', descriptionEs: 'Coloca trabajadores en espacios del tablero para obtener recursos o acciones' },
    { nameEn: 'Deck Building', nameEs: 'Construcción de Mazo', descriptionEn: 'Build and improve your deck during the game', descriptionEs: 'Construye y mejora tu mazo durante el juego' },
    { nameEn: 'Area Control', nameEs: 'Control de Área', descriptionEn: 'Control territories or areas on the board', descriptionEs: 'Controla territorios o áreas en el tablero' },
    { nameEn: 'Drafting', nameEs: 'Selección', descriptionEn: 'Select from available options, often passing remaining items', descriptionEs: 'Selecciona de opciones disponibles, a menudo pasando elementos restantes' },
    { nameEn: 'Social Deduction', nameEs: 'Deducción Social', descriptionEn: 'Identify hidden roles or intentions of other players', descriptionEs: 'Identifica roles ocultos o intenciones de otros jugadores' },
    { nameEn: 'Roll and Write', nameEs: 'Tirar y Escribir', descriptionEn: 'Roll dice and write results on personal sheets', descriptionEs: 'Tira dados y escribe resultados en hojas personales' },
    { nameEn: 'Legacy', nameEs: 'Legado', descriptionEn: 'Game permanently changes between sessions', descriptionEs: 'El juego cambia permanentemente entre sesiones' },
    { nameEn: 'Real-time', nameEs: 'Tiempo Real', descriptionEn: 'Play without turns, often under time pressure', descriptionEs: 'Juega sin turnos, a menudo bajo presión de tiempo' },
    { nameEn: 'Storytelling', nameEs: 'Narrativa', descriptionEn: 'Create or contribute to stories during gameplay', descriptionEs: 'Crea o contribuye a historias durante el juego' },
    { nameEn: 'Economic', nameEs: 'Económico', descriptionEn: 'Manage resources, money, and economic systems', descriptionEs: 'Gestiona recursos, dinero y sistemas económicos' },
    { nameEn: 'Tile Placement', nameEs: 'Colocación de Fichas', descriptionEn: 'Place tiles to build the game board', descriptionEs: 'Coloca fichas para construir el tablero de juego' },
    { nameEn: 'Hand Management', nameEs: 'Gestión de Mano', descriptionEn: 'Manage cards in your hand strategically', descriptionEs: 'Gestiona estratégicamente las cartas en tu mano' },
    { nameEn: 'Set Collection', nameEs: 'Colección de Conjuntos', descriptionEn: 'Collect sets of matching items', descriptionEs: 'Recolecta conjuntos de elementos coincidentes' },
    { nameEn: 'Auction/Bidding', nameEs: 'Subasta/Pujas', descriptionEn: 'Bid on items or actions', descriptionEs: 'Puja por elementos o acciones' },
    { nameEn: 'Route Building', nameEs: 'Construcción de Rutas', descriptionEn: 'Build routes or connections between locations', descriptionEs: 'Construye rutas o conexiones entre ubicaciones' },
  ];

  for (const mechanic of mechanics) {
    await prisma.mechanic.upsert({
      where: { nameEn: mechanic.nameEn },
      update: {},
      create: mechanic,
    });
  }

  // Create some sample games
  console.log('🎮 Creating sample games...');
  
  // Sample game 1: Catan
  const catan = await prisma.game.upsert({
    where: { bggId: 13 },
    update: {},
    create: {
      bggId: 13,
      nameEn: 'Catan',
      nameEs: 'Catan',
      yearRelease: 1995,
      creator: 'Klaus Teuber',
      publisher: 'Catan Studio',
      minPlayers: 3,
      maxPlayers: 4,
      durationMinutes: 90,
      complexityRating: 2.3,
      imageUrl: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      thumbnailUrl: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      ranking: 1,
      averageRating: 7.1,
      numVotes: 100000,
      // Legacy fields
      name: 'Catan',
      year: 1995,
      minPlayTime: 90,
      maxPlayTime: 90,
      image: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      expansions: 0,
      category: 'ranked',
      userRating: 0,
      userVotes: 0,
    },
  });

  // Add Catan to categories
  const strategyCategory = await prisma.category.findUnique({ where: { nameEn: 'Strategy' } });
  const familyCategory = await prisma.category.findUnique({ where: { nameEn: 'Family' } });
  const eurogameCategory = await prisma.category.findUnique({ where: { nameEn: 'Eurogame' } });
  
  if (strategyCategory) {
    await prisma.gameCategory.create({
      data: { gameId: catan.id, categoryId: strategyCategory.id }
    });
  }
  
  if (familyCategory) {
    await prisma.gameCategory.create({
      data: { gameId: catan.id, categoryId: familyCategory.id }
    });
  }
  
  if (eurogameCategory) {
    await prisma.gameCategory.create({
      data: { gameId: catan.id, categoryId: eurogameCategory.id }
    });
  }

  // Add Catan mechanics
  const areaControlMechanic = await prisma.mechanic.findUnique({ where: { nameEn: 'Area Control' } });
  const draftingMechanic = await prisma.mechanic.findUnique({ where: { nameEn: 'Drafting' } });
  const handManagementMechanic = await prisma.mechanic.findUnique({ where: { nameEn: 'Hand Management' } });
  
  if (areaControlMechanic) {
    await prisma.gameMechanic.create({
      data: { gameId: catan.id, mechanicId: areaControlMechanic.id }
    });
  }
  
  if (draftingMechanic) {
    await prisma.gameMechanic.create({
      data: { gameId: catan.id, mechanicId: draftingMechanic.id }
    });
  }
  
  if (handManagementMechanic) {
    await prisma.gameMechanic.create({
      data: { gameId: catan.id, mechanicId: handManagementMechanic.id }
    });
  }

  // Add Catan descriptions
  await prisma.gameDescription.upsert({
    where: { gameId_language: { gameId: catan.id, language: 'en' } },
    update: {},
    create: {
      gameId: catan.id,
      language: 'en',
      shortDescription: 'Build settlements, trade resources, and expand your territory in this classic strategy game.',
      fullDescription: 'Catan is a multiplayer board game where players assume the roles of settlers, each attempting to build and develop holdings while trading and acquiring resources. Players gain victory points as their settlements grow.',
    },
  });

  await prisma.gameDescription.upsert({
    where: { gameId_language: { gameId: catan.id, language: 'es' } },
    update: {},
    create: {
      gameId: catan.id,
      language: 'es',
      shortDescription: 'Construye asentamientos, comercia recursos y expande tu territorio en este clásico juego de estrategia.',
      fullDescription: 'Catan es un juego de mesa multijugador donde los jugadores asumen el papel de colonos, cada uno intentando construir y desarrollar propiedades mientras comercia y adquiere recursos. Los jugadores ganan puntos de victoria a medida que crecen sus asentamientos.',
    },
  });

  // Add Catan rules
  await prisma.gameRule.upsert({
    where: { gameId_language: { gameId: catan.id, language: 'en' } },
    update: {},
    create: {
      gameId: catan.id,
      language: 'en',
      rulesText: `SETUP:
1. Place the hexagonal terrain tiles randomly to form the game board
2. Place number tokens on each terrain tile (except the desert)
3. Each player chooses a color and receives 5 settlements, 4 cities, and 15 roads
4. Place 2 settlements and 2 roads on the board

GAMEPLAY:
1. Roll 2 dice to determine which terrain produces resources
2. Players with settlements adjacent to producing terrain receive resources
3. Trade resources with other players or the bank
4. Build new settlements, cities, or roads
5. Play development cards

VICTORY:
First player to reach 10 victory points wins. Points are earned by:
- Settlements (1 point each)
- Cities (2 points each)
- Longest road (2 points)
- Largest army (2 points)
- Victory point development cards`,
      rulesHtml: `<h3>SETUP:</h3>
<ol>
<li>Place the hexagonal terrain tiles randomly to form the game board</li>
<li>Place number tokens on each terrain tile (except the desert)</li>
<li>Each player chooses a color and receives 5 settlements, 4 cities, and 15 roads</li>
<li>Place 2 settlements and 2 roads on the board</li>
</ol>

<h3>GAMEPLAY:</h3>
<ol>
<li>Roll 2 dice to determine which terrain produces resources</li>
<li>Players with settlements adjacent to producing terrain receive resources</li>
<li>Trade resources with other players or the bank</li>
<li>Build new settlements, cities, or roads</li>
<li>Play development cards</li>
</ol>

<h3>VICTORY:</h3>
<p>First player to reach 10 victory points wins. Points are earned by:</p>
<ul>
<li>Settlements (1 point each)</li>
<li>Cities (2 points each)</li>
<li>Longest road (2 points)</li>
<li>Largest army (2 points)</li>
<li>Victory point development cards</li>
</ul>`,
      setupInstructions: 'Place hexagonal terrain tiles randomly, add number tokens, and each player places 2 settlements and 2 roads.',
      victoryConditions: 'Reach 10 victory points through settlements, cities, longest road, largest army, and development cards.',
    },
  });

  await prisma.gameRule.upsert({
    where: { gameId_language: { gameId: catan.id, language: 'es' } },
    update: {},
    create: {
      gameId: catan.id,
      language: 'es',
      rulesText: `CONFIGURACIÓN:
1. Coloca las fichas de terreno hexagonales aleatoriamente para formar el tablero
2. Coloca las fichas de números en cada terreno (excepto el desierto)
3. Cada jugador elige un color y recibe 5 asentamientos, 4 ciudades y 15 carreteras
4. Coloca 2 asentamientos y 2 carreteras en el tablero

JUEGO:
1. Tira 2 dados para determinar qué terreno produce recursos
2. Los jugadores con asentamientos adyacentes al terreno productor reciben recursos
3. Comercia recursos con otros jugadores o el banco
4. Construye nuevos asentamientos, ciudades o carreteras
5. Juega cartas de desarrollo

VICTORIA:
El primer jugador en alcanzar 10 puntos de victoria gana. Los puntos se ganan por:
- Asentamientos (1 punto cada uno)
- Ciudades (2 puntos cada una)
- Carretera más larga (2 puntos)
- Ejército más grande (2 puntos)
- Cartas de desarrollo de puntos de victoria`,
      rulesHtml: `<h3>CONFIGURACIÓN:</h3>
<ol>
<li>Coloca las fichas de terreno hexagonales aleatoriamente para formar el tablero</li>
<li>Coloca las fichas de números en cada terreno (excepto el desierto)</li>
<li>Cada jugador elige un color y recibe 5 asentamientos, 4 ciudades y 15 carreteras</li>
<li>Coloca 2 asentamientos y 2 carreteras en el tablero</li>
</ol>

<h3>JUEGO:</h3>
<ol>
<li>Tira 2 dados para determinar qué terreno produce recursos</li>
<li>Los jugadores con asentamientos adyacentes al terreno productor reciben recursos</li>
<li>Comercia recursos con otros jugadores o el banco</li>
<li>Construye nuevos asentamientos, ciudades o carreteras</li>
<li>Juega cartas de desarrollo</li>
</ol>

<h3>VICTORIA:</h3>
<p>El primer jugador en alcanzar 10 puntos de victoria gana. Los puntos se ganan por:</p>
<ul>
<li>Asentamientos (1 punto cada uno)</li>
<li>Ciudades (2 puntos cada una)</li>
<li>Carretera más larga (2 puntos)</li>
<li>Ejército más grande (2 puntos)</li>
<li>Cartas de desarrollo de puntos de victoria</li>
</ul>`,
      setupInstructions: 'Coloca las fichas de terreno hexagonales aleatoriamente, añade las fichas de números, y cada jugador coloca 2 asentamientos y 2 carreteras.',
      victoryConditions: 'Alcanza 10 puntos de victoria a través de asentamientos, ciudades, carretera más larga, ejército más grande y cartas de desarrollo.',
    },
  });

  // Sample game 2: Exploding Kittens
  const explodingKittens = await prisma.game.upsert({
    where: { bggId: 172225 },
    update: {},
    create: {
      bggId: 172225,
      nameEn: 'Exploding Kittens',
      nameEs: 'Gatos Explosivos',
      yearRelease: 2015,
      creator: 'Elan Lee, Matthew Inman, Shane Small',
      publisher: 'The Oatmeal',
      minPlayers: 2,
      maxPlayers: 5,
      durationMinutes: 15,
      complexityRating: 1.2,
      imageUrl: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      thumbnailUrl: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      ranking: 150,
      averageRating: 6.2,
      numVotes: 50000,
      // Legacy fields
      name: 'Exploding Kittens',
      year: 2015,
      minPlayTime: 15,
      maxPlayTime: 15,
      image: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      expansions: 0,
      category: 'ranked',
      userRating: 0,
      userVotes: 0,
    },
  });

  // Add Exploding Kittens to categories
  const cardGameCategory = await prisma.category.findUnique({ where: { nameEn: 'Card Game' } });
  const partyCategory = await prisma.category.findUnique({ where: { nameEn: 'Party' } });
  const familyCategory2 = await prisma.category.findUnique({ where: { nameEn: 'Family' } });
  
  if (cardGameCategory) {
    await prisma.gameCategory.create({
      data: { gameId: explodingKittens.id, categoryId: cardGameCategory.id }
    });
  }
  
  if (partyCategory) {
    await prisma.gameCategory.create({
      data: { gameId: explodingKittens.id, categoryId: partyCategory.id }
    });
  }
  
  if (familyCategory2) {
    await prisma.gameCategory.create({
      data: { gameId: explodingKittens.id, categoryId: familyCategory2.id }
    });
  }

  // Add Exploding Kittens mechanics
  const handManagementMechanic2 = await prisma.mechanic.findUnique({ where: { nameEn: 'Hand Management' } });
  const socialDeductionMechanic = await prisma.mechanic.findUnique({ where: { nameEn: 'Social Deduction' } });
  
  if (handManagementMechanic2) {
    await prisma.gameMechanic.create({
      data: { gameId: explodingKittens.id, mechanicId: handManagementMechanic2.id }
    });
  }
  
  if (socialDeductionMechanic) {
    await prisma.gameMechanic.create({
      data: { gameId: explodingKittens.id, mechanicId: socialDeductionMechanic.id }
    });
  }

  // Add Exploding Kittens descriptions
  await prisma.gameDescription.upsert({
    where: { gameId_language: { gameId: explodingKittens.id, language: 'en' } },
    update: {},
    create: {
      gameId: explodingKittens.id,
      language: 'en',
      shortDescription: 'A card game for people who are into kittens and explosions.',
      fullDescription: 'Exploding Kittens is a highly-strategic, kitty-powered version of Russian Roulette. Players take turns drawing cards until someone draws an exploding kitten and loses the game.',
    },
  });

  await prisma.gameDescription.upsert({
    where: { gameId_language: { gameId: explodingKittens.id, language: 'es' } },
    update: {},
    create: {
      gameId: explodingKittens.id,
      language: 'es',
      shortDescription: 'Un juego de cartas para personas que les gustan los gatitos y las explosiones.',
      fullDescription: 'Gatos Explosivos es una versión altamente estratégica y alimentada por gatitos de la Ruleta Rusa. Los jugadores se turnan para robar cartas hasta que alguien robe un gato explosivo y pierda el juego.',
    },
  });

  // Add Exploding Kittens rules
  await prisma.gameRule.upsert({
    where: { gameId_language: { gameId: explodingKittens.id, language: 'en' } },
    update: {},
    create: {
      gameId: explodingKittens.id,
      language: 'en',
      rulesText: `SETUP:
1. Remove the exploding kitten cards from the deck
2. Deal 7 cards to each player
3. Place the exploding kitten cards back in the deck
4. Shuffle the deck

GAMEPLAY:
1. On your turn, play any action cards you want
2. Draw a card from the deck
3. If you draw an exploding kitten, you lose (unless you have a defuse card)
4. Use defuse cards to avoid exploding kittens

VICTORY:
Be the last player remaining. All other players must have drawn an exploding kitten and lost.`,
      rulesHtml: `<h3>SETUP:</h3>
<ol>
<li>Remove the exploding kitten cards from the deck</li>
<li>Deal 7 cards to each player</li>
<li>Place the exploding kitten cards back in the deck</li>
<li>Shuffle the deck</li>
</ol>

<h3>GAMEPLAY:</h3>
<ol>
<li>On your turn, play any action cards you want</li>
<li>Draw a card from the deck</li>
<li>If you draw an exploding kitten, you lose (unless you have a defuse card)</li>
<li>Use defuse cards to avoid exploding kittens</li>
</ol>

<h3>VICTORY:</h3>
<p>Be the last player remaining. All other players must have drawn an exploding kitten and lost.</p>`,
      setupInstructions: 'Remove exploding kitten cards, deal 7 cards to each player, then shuffle exploding kittens back into the deck.',
      victoryConditions: 'Be the last player remaining by avoiding exploding kittens.',
    },
  });

  await prisma.gameRule.upsert({
    where: { gameId_language: { gameId: explodingKittens.id, language: 'es' } },
    update: {},
    create: {
      gameId: explodingKittens.id,
      language: 'es',
      rulesText: `CONFIGURACIÓN:
1. Retira las cartas de gatos explosivos del mazo
2. Reparte 7 cartas a cada jugador
3. Coloca las cartas de gatos explosivos de vuelta en el mazo
4. Baraja el mazo

JUEGO:
1. En tu turno, juega las cartas de acción que quieras
2. Roba una carta del mazo
3. Si robas un gato explosivo, pierdes (a menos que tengas una carta de desactivación)
4. Usa cartas de desactivación para evitar gatos explosivos

VICTORIA:
Sé el último jugador que quede. Todos los demás jugadores deben haber robado un gato explosivo y perdido.`,
      rulesHtml: `<h3>CONFIGURACIÓN:</h3>
<ol>
<li>Retira las cartas de gatos explosivos del mazo</li>
<li>Reparte 7 cartas a cada jugador</li>
<li>Coloca las cartas de gatos explosivos de vuelta en el mazo</li>
<li>Baraja el mazo</li>
</ol>

<h3>JUEGO:</h3>
<ol>
<li>En tu turno, juega las cartas de acción que quieras</li>
<li>Roba una carta del mazo</li>
<li>Si robas un gato explosivo, pierdes (a menos que tengas una carta de desactivación)</li>
<li>Usa cartas de desactivación para evitar gatos explosivos</li>
</ol>

<h3>VICTORIA:</h3>
<p>Sé el último jugador que quede. Todos los demás jugadores deben haber robado un gato explosivo y perdido.</p>`,
      setupInstructions: 'Retira las cartas de gatos explosivos, reparte 7 cartas a cada jugador, luego baraja los gatos explosivos de vuelta en el mazo.',
      victoryConditions: 'Sé el último jugador que quede evitando gatos explosivos.',
    },
  });

  // Add expansion for Exploding Kittens
  const implodingKittens = await prisma.expansion.upsert({
    where: { bggId: 172225 },
    update: {},
    create: {
      baseGameId: explodingKittens.id,
      expansionNameEn: 'Imploding Kittens',
      expansionNameEs: 'Gatos Implosivos',
      yearRelease: 2016,
      descriptionEn: 'The first expansion pack for Exploding Kittens, adding new cards and mechanics.',
      descriptionEs: 'El primer paquete de expansión para Gatos Explosivos, añadiendo nuevas cartas y mecánicas.',
      imageUrl: 'https://cf.geekdo-images.com/micro/img/Pic347475_t.jpg',
      bggId: 172225,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Created ${categories.length} categories`);
  console.log(`⚙️ Created ${mechanics.length} mechanics`);
  console.log(`🎮 Created 2 sample games with full data`);
  console.log(`📚 Created 1 expansion`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
