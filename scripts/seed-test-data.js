const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const testGames = [
  {
    bggId: 13,
    name: "Catan",
    year: 1995,
    minPlayers: 3,
    maxPlayers: 4,
    minPlayTime: 60,
    maxPlayTime: 120,
    image: "https://cf.geekdo-images.com/thumb/img/1qXzY9HsQEy8Pn8YjEfbCxipmo8=/fit-in/200x150/pic2419375.jpg",
    ranking: 1,
    averageRating: 7.1,
    numVotes: 1000,
    userRating: 0,
    userVotes: 0,
    expansions: 0
  },
  {
    bggId: 9209,
    name: "Ticket to Ride",
    year: 2004,
    minPlayers: 2,
    maxPlayers: 5,
    minPlayTime: 30,
    maxPlayTime: 60,
    image: "https://cf.geekdo-images.com/thumb/img/jV8yuNtCSs2sa9kGIEqKW9qZk4=/fit-in/200x150/pic38668.jpg",
    ranking: 2,
    averageRating: 7.4,
    numVotes: 800,
    userRating: 0,
    userVotes: 0,
    expansions: 0
  },
  {
    bggId: 30549,
    name: "Pandemic",
    year: 2008,
    minPlayers: 2,
    maxPlayers: 4,
    minPlayTime: 45,
    maxPlayTime: 60,
    image: "https://cf.geekdo-images.com/thumb/img/1qXzY9HsQEy8Pn8YjEfbCxipmo8=/fit-in/200x150/pic2419375.jpg",
    ranking: 3,
    averageRating: 7.6,
    numVotes: 600,
    userRating: 0,
    userVotes: 0,
    expansions: 0
  },
  {
    bggId: 822,
    name: "Carcassonne",
    year: 2000,
    minPlayers: 2,
    maxPlayers: 5,
    minPlayTime: 30,
    maxPlayTime: 45,
    image: "https://cf.geekdo-images.com/thumb/img/jV8yuNtCSs2sa9kGIEqKW9qZk4=/fit-in/200x150/pic38668.jpg",
    ranking: 4,
    averageRating: 7.4,
    numVotes: 500,
    userRating: 0,
    userVotes: 0,
    expansions: 0
  },
  {
    bggId: 13,
    name: "The Settlers of Catan",
    year: 1995,
    minPlayers: 3,
    maxPlayers: 4,
    minPlayTime: 60,
    maxPlayTime: 120,
    image: "https://cf.geekdo-images.com/thumb/img/1qXzY9HsQEy8Pn8YjEfbCxipmo8=/fit-in/200x150/pic2419375.jpg",
    ranking: 5,
    averageRating: 7.1,
    numVotes: 400,
    userRating: 0,
    userVotes: 0,
    expansions: 0
  }
];

async function seedTestData() {
  try {
    console.log('🌱 Sembrando datos de prueba...');
    
    for (const game of testGames) {
      await prisma.game.upsert({
        where: { bggId: game.bggId },
        update: game,
        create: game
      });
      console.log(`✅ Agregado: ${game.name}`);
    }
    
    console.log('🎉 Datos de prueba sembrados exitosamente!');
  } catch (error) {
    console.error('❌ Error sembrando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData(); 