import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { canUserAccessAsset, getAssetLevelRequirement } from '@/lib/dice-asset-levels';

type TabKey =
  | 'background'
  | 'dice'
  | 'pattern'
  | 'accessories'
  | 'hat'
  | 'item'
  | 'companion'
  | 'title';

interface Asset { 
  id: string; 
  name: string; 
  src: string; 
  locked: boolean;
  requiredLevel?: number;
  levelName?: string;
  description?: string;
}

const CATEGORY_TO_DIR: Record<TabKey, string> = {
  background: 'Backgrounds',
  dice: 'Dice',
  pattern: 'Patterns',
  accessories: 'Accessories',
  hat: 'Crowns & Hats',
  item: 'Items',
  companion: 'Companions',
  title: 'Titles'
};

function toTitleCase(input: string): string {
  return input
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function listSvgsInDir(absDir: string, webDirSegment: string, userLevel: number): Asset[] {
  const assets: Asset[] = [];
  const specialAssets: Asset[] = [];
  
  if (!fs.existsSync(absDir)) return assets;
  const files = fs.readdirSync(absDir, { withFileTypes: true });
  
  for (const d of files) {
    if (d.isFile() && d.name.toLowerCase().endsWith('.svg')) {
      const filename = d.name;
      const name = toTitleCase(filename.replace(/\.svg$/i, ''));
      const encodedDir = encodeURIComponent(webDirSegment);
      const encodedFile = encodeURIComponent(filename);
      const src = `/dice/${encodedDir}/${encodedFile}`;
      
      // Check if asset is locked
      // Map directory names to category keys used in dice-asset-levels.ts
      const categoryKeyMap: Record<string, string> = {
        'Backgrounds': 'backgrounds',
        'Dice': 'dice',
        'Patterns': 'patterns',
        'Accessories': 'accessories',
        'Crowns & Hats': 'Crowns & Hats',
        'Items': 'items',
        'Companions': 'companions'
      };
      const categoryKey = categoryKeyMap[webDirSegment] || webDirSegment.toLowerCase();
      const assetKey = filename.replace(/\.svg$/i, ''); // Use filename without extension for lookup
      const levelRequirement = getAssetLevelRequirement(categoryKey, assetKey);
      

      
      // Special items (level 0) are always locked unless user has special access
      const isLocked = levelRequirement ? 
        (levelRequirement.level === 0 ? true : userLevel < levelRequirement.level) : 
        false;
      
      const asset = { 
        id: `${webDirSegment}-${filename}`, 
        name, 
        src,
        locked: isLocked,
        requiredLevel: levelRequirement?.level,
        levelName: levelRequirement?.levelName,
        description: levelRequirement?.description
      };
      

      
      // Separate special items (level 0) from regular items
      if (levelRequirement?.level === 0) {
        specialAssets.push(asset);
      } else {
        assets.push(asset);
      }
    }
  }
  
  // Return regular assets first, then special assets at the end
  return [...assets, ...specialAssets];
}

function listSvgsForCategory(category: TabKey, userLevel: number): Asset[] {
  try {
    // Special handling for titles - they're not SVG files
    if (category === 'title') {
      return generateTitleAssets(userLevel);
    }
    
    const subdir = CATEGORY_TO_DIR[category];
    const absDir = path.join(process.cwd(), 'public', 'dice', subdir);
    return listSvgsInDir(absDir, subdir, userLevel);
  } catch (e) {
    return [];
  }
}

function generateTitleAssets(userLevel: number): Asset[] {
  const titles = [
    'Commoner', 'Squire', 'Knight', 'Champion', 'Baron', 'Baroness', 
    'Lord', 'Lady', 'Archmage', 'Duke', 'Duchess', 'Prince', 'Princess', 'King', 'Queen'
  ];
  
  const assets: Asset[] = [];
  const specialAssets: Asset[] = [];
  
  for (const title of titles) {
    const levelRequirement = getAssetLevelRequirement('titles', title);
    const isLocked = levelRequirement ? !canUserAccessAsset(userLevel, 'titles', title) : false;
    
    const asset = {
      id: `title-${title}`,
      name: title,
      src: `/dice/Titles/${title}.svg`, // We'll create placeholder SVG files
      locked: isLocked,
      requiredLevel: levelRequirement?.level,
      levelName: levelRequirement?.levelName,
      description: levelRequirement?.description
    };
    
    // Separate special items (level 0) from regular items
    if (levelRequirement?.level === 0) {
      specialAssets.push(asset);
    } else {
      assets.push(asset);
    }
  }
  
  // Return regular assets first, then special assets at the end
  return [...assets, ...specialAssets];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userLevel = parseInt(searchParams.get('userLevel') || '1');
    
    const categories: TabKey[] = ['background', 'dice', 'pattern', 'accessories', 'hat', 'item', 'companion', 'title'];
    const payload: Record<TabKey, Asset[]> = {
      background: [], dice: [], pattern: [], accessories: [], hat: [], item: [], companion: [], title: []
    };

    for (const cat of categories) {
      const allAssets = listSvgsForCategory(cat, userLevel);
      payload[cat] = allAssets;
    }

    return NextResponse.json({ 
      assets: payload,
      userLevel,
      message: `Showing assets available for level ${userLevel}`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list dice assets' }, { status: 500 });
  }
}
