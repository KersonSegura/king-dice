import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;

// Cache utility functions
export class CacheService {
  private static redis = redis;

  // Set cache with TTL (Time To Live) in seconds
  static async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  // Get cache value
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value as string) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  // Delete cache
  static async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  // Check if key exists
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  // Set cache with pattern matching
  static async setPattern(pattern: string, value: any, ttl: number = 3600): Promise<void> {
    const key = `kingdice:${pattern}`;
    await this.set(key, value, ttl);
  }

  // Get cache with pattern matching
  static async getPattern<T>(pattern: string): Promise<T | null> {
    const key = `kingdice:${pattern}`;
    return await this.get<T>(key);
  }

  // Delete cache with pattern matching
  static async delPattern(pattern: string): Promise<void> {
    const key = `kingdice:${pattern}`;
    await this.del(key);
  }

  // Cache game data
  static async cacheGame(gameId: string, gameData: any, ttl: number = 7200): Promise<void> {
    await this.setPattern(`game:${gameId}`, gameData, ttl);
  }

  // Get cached game data
  static async getCachedGame(gameId: string): Promise<any | null> {
    return await this.getPattern(`game:${gameId}`);
  }

  // Cache user data
  static async cacheUser(userId: string, userData: any, ttl: number = 1800): Promise<void> {
    await this.setPattern(`user:${userId}`, userData, ttl);
  }

  // Get cached user data
  static async getCachedUser(userId: string): Promise<any | null> {
    return await this.getPattern(`user:${userId}`);
  }

  // Cache popular games
  static async cachePopularGames(category: string, games: any[], ttl: number = 1800): Promise<void> {
    await this.setPattern(`popular:${category}`, games, ttl);
  }

  // Get cached popular games
  static async getCachedPopularGames(category: string): Promise<any[] | null> {
    return await this.getPattern(`popular:${category}`);
  }

  // Cache forum posts
  static async cacheForumPosts(category: string, posts: any[], ttl: number = 900): Promise<void> {
    await this.setPattern(`forum:${category}`, posts, ttl);
  }

  // Get cached forum posts
  static async getCachedForumPosts(category: string): Promise<any[] | null> {
    return await this.getPattern(`forum:${category}`);
  }

  // Cache gallery images
  static async cacheGalleryImages(images: any[], ttl: number = 1800): Promise<void> {
    await this.setPattern('gallery:images', images, ttl);
  }

  // Get cached gallery images
  static async getCachedGalleryImages(): Promise<any[] | null> {
    return await this.getPattern('gallery:images');
  }

  // Clear all cache (use with caution)
  static async clearAll(): Promise<void> {
    try {
      const keys = await this.redis.keys('kingdice:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis clear all error:', error);
    }
  }
}
