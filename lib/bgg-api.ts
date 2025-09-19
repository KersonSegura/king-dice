import axios from 'axios';

export interface BGGGame {
  id: string;
  name: string;
  yearpublished?: string;
  image?: string;
  thumbnail?: string;
  description?: string;
  minplayers?: string;
  maxplayers?: string;
  playingtime?: string;
  minplaytime?: string;
  maxplaytime?: string;
  minage?: string;
  rating?: {
    value: string;
    usersrated: string;
    average: string;
    bayesaverage: string;
  };
  statistics?: {
    ratings: {
      ranks: Array<{
        type: string;
        id: string;
        name: string;
        friendlyname: string;
        value: string;
        bayesaverage: string;
      }>;
    };
  };
  categories?: string[];
  mechanics?: string[];
  designers?: string[];
  publishers?: string[];
}

export interface BGGSearchResult {
  id: string;
  name: string;
  yearpublished?: string;
  type: string;
}

export interface BGGRules {
  id: string;
  title: string;
  content: string;
  language: string;
  format: string;
  url?: string;
}

export interface BGGHotGame {
  id: string;
  name: string;
  thumbnail?: string;
  rank: number;
  yearpublished?: string;
}

export interface BGGCollectionItem {
  id: string;
  name: string;
  thumbnail?: string;
  yearpublished?: string;
  rating?: string;
  own: boolean;
  forTrade: boolean;
  want: boolean;
  wantToPlay: boolean;
  preordered: boolean;
  wishlist: boolean;
  numPlays: number;
}

export interface BGGSearchFilters {
  query: string;
  type?: string; // boardgame, boardgameexpansion, etc.
  exact?: boolean;
}

export interface BGGThingFilters {
  id: string;
  stats?: boolean;
  comments?: boolean;
  marketplace?: boolean;
  videos?: boolean;
  versions?: boolean;
}

class BGGAPI {
  private baseURL = 'https://boardgamegeek.com/xmlapi2';

  // ===== SEARCH FUNCTIONALITY =====
  async searchGames(query: string, filters?: Partial<BGGSearchFilters>): Promise<BGGSearchResult[]> {
    try {
      const params: any = {
        query: query,
        type: filters?.type || 'boardgame',
        exact: filters?.exact ? 1 : 0
      };

      const response = await axios.get(`${this.baseURL}/search`, { params });

      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const items = xmlDoc.getElementsByTagName('item');

      const results: BGGSearchResult[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = item.getAttribute('id') || '';
        const nameElement = item.getElementsByTagName('name')[0];
        const yearElement = item.getElementsByTagName('yearpublished')[0];
        const type = item.getAttribute('type') || '';

        if (nameElement) {
          results.push({
            id,
            name: nameElement.getAttribute('value') || '',
            yearpublished: yearElement?.getAttribute('value') || undefined,
            type
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching games:', error);
      return [];
    }
  }

  // ===== HOT GAMES =====
  async getHotGames(type: string = 'boardgame'): Promise<BGGHotGame[]> {
    try {
      const response = await axios.get(`${this.baseURL}/hot`, {
        params: { type }
      });

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const items = xmlDoc.getElementsByTagName('item');

      const results: BGGHotGame[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = item.getAttribute('id') || '';
        const nameElement = item.getElementsByTagName('name')[0];
        const thumbnailElement = item.getElementsByTagName('thumbnail')[0];
        const yearElement = item.getElementsByTagName('yearpublished')[0];
        const rankElement = item.getElementsByTagName('rank')[0];

        if (nameElement) {
          results.push({
            id,
            name: nameElement.getAttribute('value') || '',
            thumbnail: thumbnailElement?.getAttribute('value') || undefined,
            yearpublished: yearElement?.getAttribute('value') || undefined,
            rank: parseInt(rankElement?.getAttribute('value') || '0')
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting hot games:', error);
      return [];
    }
  }

  // ===== GAME DETAILS =====
  async getGameDetails(id: string, filters?: Partial<BGGThingFilters>): Promise<BGGGame | null> {
    try {
      const params: any = {
        id: id,
        stats: filters?.stats ? 1 : 0,
        comments: filters?.comments ? 1 : 0,
        marketplace: filters?.marketplace ? 1 : 0,
        videos: filters?.videos ? 1 : 0,
        versions: filters?.versions ? 1 : 0
      };

      const response = await axios.get(`${this.baseURL}/thing`, { params });

      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const item = xmlDoc.getElementsByTagName('item')[0];

      if (!item) return null;

      const game: BGGGame = {
        id: item.getAttribute('id') || '',
        name: this.getTextContent(item, 'name[@type="primary"]') || 
              this.getTextContent(item, 'name') || '',
        yearpublished: this.getAttribute(item, 'yearpublished', 'value'),
        image: this.getTextContent(item, 'image'),
        thumbnail: this.getTextContent(item, 'thumbnail'),
        description: this.getTextContent(item, 'description'),
        minplayers: this.getAttribute(item, 'minplayers', 'value'),
        maxplayers: this.getAttribute(item, 'maxplayers', 'value'),
        playingtime: this.getAttribute(item, 'playingtime', 'value'),
        minplaytime: this.getAttribute(item, 'minplaytime', 'value'),
        maxplaytime: this.getAttribute(item, 'maxplaytime', 'value'),
        minage: this.getAttribute(item, 'minage', 'value'),
      };

      // Get categories and mechanics
      game.categories = this.getLinkValues(item, 'link[@type="boardgamecategory"]');
      game.mechanics = this.getLinkValues(item, 'link[@type="boardgamemechanic"]');
      game.designers = this.getLinkValues(item, 'link[@type="boardgamedesigner"]');
      game.publishers = this.getLinkValues(item, 'link[@type="boardgamepublisher"]');

      // Get rating information
      const statistics = item.getElementsByTagName('statistics')[0];
      if (statistics) {
        const ratings = statistics.getElementsByTagName('ratings')[0];
        if (ratings) {
          game.rating = {
            value: this.getAttribute(ratings, 'average', 'value'),
            usersrated: this.getAttribute(ratings, 'usersrated', 'value'),
            average: this.getAttribute(ratings, 'average', 'value'),
            bayesaverage: this.getAttribute(ratings, 'bayesaverage', 'value'),
          };

          // Get ranking information
          const ranks = ratings.getElementsByTagName('ranks')[0];
          if (ranks) {
            const rankItems = ranks.getElementsByTagName('rank');
            const rankingData: Array<{
              type: string;
              id: string;
              name: string;
              friendlyname: string;
              value: string;
              bayesaverage: string;
            }> = [];

            for (let i = 0; i < rankItems.length; i++) {
              const rank = rankItems[i];
              rankingData.push({
                type: rank.getAttribute('type') || '',
                id: rank.getAttribute('id') || '',
                name: rank.getAttribute('name') || '',
                friendlyname: rank.getAttribute('friendlyname') || '',
                value: rank.getAttribute('value') || '',
                bayesaverage: rank.getAttribute('bayesaverage') || ''
              });
            }

            game.statistics = {
              ratings: {
                ranks: rankingData
              }
            };
          }
        }
      }

      return game;
    } catch (error) {
      console.error('Error getting game details:', error);
      return null;
    }
  }

  // ===== MULTIPLE GAMES =====
  async getMultipleGames(ids: string[], filters?: Partial<BGGThingFilters>): Promise<BGGGame[]> {
    try {
      const params: any = {
        id: ids.join(','),
        stats: filters?.stats ? 1 : 0,
        comments: filters?.comments ? 1 : 0,
        marketplace: filters?.marketplace ? 1 : 0,
        videos: filters?.videos ? 1 : 0,
        versions: filters?.versions ? 1 : 0
      };

      const response = await axios.get(`${this.baseURL}/thing`, { params });

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const items = xmlDoc.getElementsByTagName('item');

      const games: BGGGame[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const game = await this.parseGameFromXML(item);
        if (game) games.push(game);
      }

      return games;
    } catch (error) {
      console.error('Error getting multiple games:', error);
      return [];
    }
  }

  // ===== COLLECTION =====
  async getUserCollection(username: string): Promise<BGGCollectionItem[]> {
    try {
      const response = await axios.get(`${this.baseURL}/collection`, {
        params: {
          username: username,
          own: 1,
          want: 1,
          wishlist: 1,
          preordered: 1,
          wanttoplay: 1,
          wanttobuy: 1,
          rated: 1,
          played: 1,
          comment: 1,
          trade: 1,
          stats: 1
        }
      });

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const items = xmlDoc.getElementsByTagName('item');

      const collection: BGGCollectionItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = item.getAttribute('objectid') || '';
        const nameElement = item.getElementsByTagName('name')[0];
        const thumbnailElement = item.getElementsByTagName('thumbnail')[0];
        const yearElement = item.getElementsByTagName('yearpublished')[0];
        const ratingElement = item.getElementsByTagName('rating')[0];
        const statusElement = item.getElementsByTagName('status')[0];
        const numPlaysElement = item.getElementsByTagName('numplays')[0];

        if (nameElement) {
          const status = statusElement || item;
          collection.push({
            id,
            name: nameElement.getAttribute('value') || '',
            thumbnail: thumbnailElement?.getAttribute('value') || undefined,
            yearpublished: yearElement?.getAttribute('value') || undefined,
            rating: ratingElement?.getAttribute('value') || undefined,
            own: status.getAttribute('own') === '1',
            forTrade: status.getAttribute('fortrade') === '1',
            want: status.getAttribute('want') === '1',
            wantToPlay: status.getAttribute('wanttoplay') === '1',
            preordered: status.getAttribute('preordered') === '1',
            wishlist: status.getAttribute('wishlist') === '1',
            numPlays: parseInt(numPlaysElement?.getAttribute('value') || '0')
          });
        }
      }

      return collection;
    } catch (error) {
      console.error('Error getting user collection:', error);
      return [];
    }
  }

  // ===== RULES (Mock data for now) =====
  async getRulesInSpanish(gameId: string): Promise<BGGRules[]> {
    // This would typically connect to a database or external service
    // For now, we'll return mock data
    return [
      {
        id: '1',
        title: 'Official Exploding Kittens Rules',
        content: 'The complete rules of the Exploding Kittens game in English...',
        language: 'en',
        format: 'pdf',
        url: '/rules/exploding-kittens-en.pdf'
      },
      {
        id: '2',
        title: 'Quick Guide to Exploding Kittens',
        content: 'A quick guide to start playing...',
        language: 'en',
        format: 'html'
      }
    ];
  }

  // ===== HELPER METHODS =====
  private async parseGameFromXML(item: Element): Promise<BGGGame | null> {
    const game: BGGGame = {
      id: item.getAttribute('id') || '',
      name: this.getTextContent(item, 'name[@type="primary"]') || 
            this.getTextContent(item, 'name') || '',
      yearpublished: this.getAttribute(item, 'yearpublished', 'value'),
      image: this.getTextContent(item, 'image'),
      thumbnail: this.getTextContent(item, 'thumbnail'),
      description: this.getTextContent(item, 'description'),
      minplayers: this.getAttribute(item, 'minplayers', 'value'),
      maxplayers: this.getAttribute(item, 'maxplayers', 'value'),
      playingtime: this.getAttribute(item, 'playingtime', 'value'),
      minplaytime: this.getAttribute(item, 'minplaytime', 'value'),
      maxplaytime: this.getAttribute(item, 'maxplaytime', 'value'),
      minage: this.getAttribute(item, 'minage', 'value'),
    };

    // Get categories and mechanics
    game.categories = this.getLinkValues(item, 'link[@type="boardgamecategory"]');
    game.mechanics = this.getLinkValues(item, 'link[@type="boardgamemechanic"]');
    game.designers = this.getLinkValues(item, 'link[@type="boardgamedesigner"]');
    game.publishers = this.getLinkValues(item, 'link[@type="boardgamepublisher"]');

    return game;
  }

  private getTextContent(element: Element, xpath: string): string {
    const result = element.querySelector(xpath);
    return result?.textContent || '';
  }

  private getAttribute(element: Element, tagName: string, attribute: string): string {
    const result = element.querySelector(tagName);
    return result?.getAttribute(attribute) || '';
  }

  private getLinkValues(element: Element, xpath: string): string[] {
    const links = element.querySelectorAll(xpath);
    const values: string[] = [];
    for (let i = 0; i < links.length; i++) {
      const value = links[i].getAttribute('value');
      if (value) values.push(value);
    }
    return values;
  }
}

export const bggAPI = new BGGAPI(); 