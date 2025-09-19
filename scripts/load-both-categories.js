const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Lista de los verdaderos top 50 juegos según BGG rankings (2024)
const topRankedGames = [
  { bggId: 224517, name: "Brass: Birmingham", expectedRank: 1 },
  { bggId: 342942, name: "Ark Nova", expectedRank: 2 },
  { bggId: 167791, name: "Terraforming Mars", expectedRank: 3 },
  { bggId: 237182, name: "Root", expectedRank: 4 },
  { bggId: 233078, name: "Twilight Imperium: Fourth Edition", expectedRank: 5 },
  { bggId: 316554, name: "Dune: Imperium", expectedRank: 6 },
  { bggId: 291457, name: "Gloomhaven: Jaws of the Lion", expectedRank: 7 },
  { bggId: 162886, name: "Spirit Island", expectedRank: 8 },
  { bggId: 266192, name: "Wingspan", expectedRank: 9 },
  { bggId: 31260, name: "Agricola", expectedRank: 10 },
  { bggId: 9209, name: "Ticket to Ride", expectedRank: 11 },
  { bggId: 13, name: "CATAN", expectedRank: 12 },
  { bggId: 822, name: "Carcassonne", expectedRank: 13 },
  { bggId: 30549, name: "Pandemic", expectedRank: 14 },
  { bggId: 180263, name: "Blood Rage", expectedRank: 15 },
  { bggId: 167355, name: "Nemesis", expectedRank: 16 },
  { bggId: 177736, name: "A Feast for Odin", expectedRank: 17 },
  { bggId: 312484, name: "Lost Ruins of Arnak", expectedRank: 18 },
  { bggId: 199792, name: "Everdell", expectedRank: 19 },
  { bggId: 295947, name: "Cascadia", expectedRank: 20 },
  { bggId: 366013, name: "Heat: Pedal to the Metal", expectedRank: 21 },
  { bggId: 367220, name: "Sea Salt & Paper", expectedRank: 22 },
  { bggId: 373106, name: "Sky Team", expectedRank: 23 },
  { bggId: 332772, name: "Revive", expectedRank: 24 },
  { bggId: 371942, name: "The White Castle", expectedRank: 25 },
  { bggId: 244521, name: "Quacks", expectedRank: 26 },
  { bggId: 414317, name: "Harmonies", expectedRank: 27 },
  { bggId: 367966, name: "Endeavor: Deep Sea", expectedRank: 28 },
  { bggId: 391163, name: "Forest Shuffle", expectedRank: 29 },
  { bggId: 338960, name: "Slay the Spire: The Board Game", expectedRank: 30 },
  { bggId: 429863, name: "Covenant", expectedRank: 31 },
  { bggId: 421006, name: "The Lord of the Rings: Duel for Middle-earth", expectedRank: 32 },
  { bggId: 397598, name: "Dune: Imperium – Uprising", expectedRank: 33 },
  { bggId: 418059, name: "SETI: Search for Extraterrestrial Intelligence", expectedRank: 34 },
  { bggId: 413246, name: "Bomb Busters", expectedRank: 35 },
  { bggId: 432520, name: "Karnak", expectedRank: 36 },
  { bggId: 445673, name: "Lightning Train", expectedRank: 37 },
  { bggId: 451214, name: "Thebai", expectedRank: 38 },
  { bggId: 447243, name: "Duel for Cardia", expectedRank: 39 },
  { bggId: 381248, name: "Nemesis: Retaliation", expectedRank: 40 },
  { bggId: 428635, name: "Ruins", expectedRank: 41 },
  { bggId: 444481, name: "Star Wars: Battle of Hoth", expectedRank: 42 },
  { bggId: 420033, name: "Vantage", expectedRank: 43 },
  { bggId: 411894, name: "Kinfire Council", expectedRank: 44 },
  { bggId: 450782, name: "Codenames: Back to Hogwarts", expectedRank: 45 },
  { bggId: 450923, name: "The Danes", expectedRank: 46 },
  { bggId: 420087, name: "Flip 7", expectedRank: 47 },
  { bggId: 249746, name: "Nanty Narking", expectedRank: 48 },
  { bggId: 342900, name: "Earthborne Rangers", expectedRank: 49 },
  { bggId: 359871, name: "Arcs", expectedRank: 50 }
];

async function getHotGames() {
  try {
    console.log('🔥 Obteniendo juegos populares (Hot Games) de BGG...');
    
    const response = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame', {
      timeout: 10000,
      headers: {
        'User-Agent': 'KingDice/1.0'
      }
    });
    
    const data = await parser.parseStringPromise(response.data);
    const items = data.items?.item;
    
    if (!items) {
      console.error('❌ No se encontraron juegos en la respuesta');
      return [];
    }
    
    const games = Array.isArray(items) ? items : [items];
    console.log(`✅ Obtenidos ${games.length} juegos populares de BGG`);
    
    return games.map((item, index) => ({
      bggId: parseInt(item.id),
      name: item.name?.value || item.name,
      year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
      ranking: index + 1, // Ranking basado en la posición en la lista hot
      source: 'hot'
    }));
  } catch (error) {
    console.error('❌ Error obteniendo juegos populares:', error.message);
    return [];
  }
}

async function getGameDetails(bggId, category = 'ranked') {
  try {
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'KingDice/1.0'
      }
    });
    
    const data = await parser.parseStringPromise(response.data);
    const item = data.items?.item;
    
    if (!item) return null;
    
    // Extraer el nombre principal (primary)
    let gameName = 'Unknown Game';
    if (item.name) {
      if (Array.isArray(item.name)) {
        const primaryName = item.name.find(n => n.type === 'primary');
        gameName = primaryName ? primaryName.value : item.name[0]?.value || 'Unknown Game';
      } else if (item.name.value) {
        gameName = item.name.value;
      } else if (typeof item.name === 'string') {
        gameName = item.name;
      }
    }

    // Obtener el ranking real de BGG
    let realRanking = null;
    if (item.statistics?.ratings?.ranks?.rank) {
      const boardgameRank = Array.isArray(item.statistics.ratings.ranks.rank) 
        ? item.statistics.ratings.ranks.rank.find(r => r.name === 'boardgame')
        : item.statistics.ratings.ranks.rank;
      
      if (boardgameRank && boardgameRank.value) {
        realRanking = parseInt(boardgameRank.value);
      }
    }

    return {
      bggId: parseInt(item.id),
      name: gameName,
      year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
      minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
      maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
      minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
      maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
      image: item.image,
      ranking: realRanking,
      averageRating: item.statistics?.ratings?.average?.value ? 
                    parseFloat(item.statistics.ratings.average.value) : null,
      numVotes: item.statistics?.ratings?.usersrated?.value ? 
                parseInt(item.statistics.ratings.usersrated.value) : null,
      userRating: 0,
      userVotes: 0,
      expansions: 0,
      category: category
    };
  } catch (error) {
    console.error(`❌ Error obteniendo detalles para BGG ID ${bggId}:`, error.message);
    return null;
  }
}

async function loadBothCategories() {
  console.log('🎯 Cargando AMBAS CATEGORÍAS de juegos...');
  console.log('📊 Hot Games + Top Ranked Games');
  
  // PASO 1: Cargar Hot Games
  console.log('\n🔥 PASO 1: Cargando Hot Games...');
  const hotGames = await getHotGames();
  
  if (hotGames.length === 0) {
    console.log('❌ No se pudieron obtener hot games');
  } else {
    console.log(`📋 Lista de hot games obtenida:`);
    hotGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (BGG ID: ${game.bggId})`);
    });
    
    // Cargar detalles de hot games
    for (let i = 0; i < hotGames.length; i++) {
      const hotGame = hotGames[i];
      console.log(`\n🔄 [${i + 1}/${hotGames.length}] Hot Game: ${hotGame.name} (BGG ID: ${hotGame.bggId})`);
      
      const gameDetails = await getGameDetails(hotGame.bggId, 'hot');
      
      if (gameDetails) {
        try {
          // Usar el ranking de hot games si no hay ranking real
          if (!gameDetails.ranking) {
            gameDetails.ranking = hotGame.ranking;
          }
          
          await prisma.game.upsert({
            where: { bggId: gameDetails.bggId },
            update: gameDetails,
            create: gameDetails
          });
          
          console.log(`✅ Guardado Hot Game: ${gameDetails.name} (Ranking: ${gameDetails.ranking})`);
        } catch (error) {
          console.error(`❌ Error guardando ${gameDetails.name}:`, error.message);
        }
      }
      
      // Delay para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // PASO 2: Cargar Top Ranked Games
  console.log('\n🏆 PASO 2: Cargando Top Ranked Games...');
  
  for (let i = 0; i < topRankedGames.length; i++) {
    const game = topRankedGames[i];
    console.log(`\n🔄 [${i + 1}/${topRankedGames.length}] Top Ranked: ${game.name} (BGG ID: ${game.bggId})`);
    
    const gameDetails = await getGameDetails(game.bggId, 'ranked');
    
    if (gameDetails) {
      try {
        // Usar el ranking esperado si no hay ranking real
        if (!gameDetails.ranking) {
          gameDetails.ranking = game.expectedRank;
        }
        
        await prisma.game.upsert({
          where: { bggId: gameDetails.bggId },
          update: gameDetails,
          create: gameDetails
        });
        
        console.log(`✅ Guardado Top Ranked: ${gameDetails.name} (Ranking BGG: ${gameDetails.ranking})`);
      } catch (error) {
        console.error(`❌ Error guardando ${gameDetails.name}:`, error.message);
      }
    }
    
    // Delay para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // PASO 3: Mostrar resumen
  console.log('\n📊 RESUMEN FINAL:');
  
  const hotGamesCount = await prisma.game.count({ where: { category: 'hot' } });
  const rankedGamesCount = await prisma.game.count({ where: { category: 'ranked' } });
  
  console.log(`🔥 Hot Games cargados: ${hotGamesCount}`);
  console.log(`🏆 Top Ranked Games cargados: ${rankedGamesCount}`);
  console.log(`📈 Total de juegos en la base de datos: ${hotGamesCount + rankedGamesCount}`);
  
  console.log('\n🎉 ¡Carga completada! Ahora tienes ambas categorías:');
  console.log('   • Hot Games: Juegos que están de moda actualmente');
  console.log('   • Top Ranked: Los mejores juegos históricamente');
  
  await prisma.$disconnect();
}

loadBothCategories().catch(console.error); 