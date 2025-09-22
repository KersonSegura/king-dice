// Test Redis connection locally
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: 'https://definite-sponge-8315.upstash.io',
  token: 'ASB7AAImcDI0NmYzNDQyOGJiYTI0ZmUxYjhjNjJmNzRlYmQ3ZjU2MHAyODMxNQ',
});

async function testRedis() {
  try {
    console.log('🧪 Testing Redis connection...');
    
    // Test basic set/get
    await redis.set('test:connection', 'Hello from King Dice!');
    const value = await redis.get('test:connection');
    console.log('✅ Redis connection successful!');
    console.log('📝 Test value:', value);
    
    // Test with JSON data
    const testData = {
      games: [
        { id: 1, name: 'Test Game 1' },
        { id: 2, name: 'Test Game 2' }
      ],
      timestamp: new Date().toISOString()
    };
    
    await redis.set('test:json', JSON.stringify(testData));
    const jsonValue = await redis.get('test:json');
    const parsedData = JSON.parse(jsonValue);
    console.log('✅ JSON data test successful!');
    console.log('📝 Parsed data:', parsedData);
    
    // Clean up test data
    await redis.del('test:connection');
    await redis.del('test:json');
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
}

testRedis();
