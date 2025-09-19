import fs from 'fs';
import path from 'path';

export interface Tag {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

const dataDir = path.join(process.cwd(), 'data');
const tagsFile = path.join(dataDir, 'tags.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize tags file if it doesn't exist
if (!fs.existsSync(tagsFile)) {
  const initialTags = {
    tags: [
      { id: 'dice-throne', name: 'dice-throne', count: 0, createdAt: new Date().toISOString() },
      { id: 'board-game', name: 'board-game', count: 0, createdAt: new Date().toISOString() },
      { id: 'collection', name: 'collection', count: 0, createdAt: new Date().toISOString() },
      { id: 'setup', name: 'setup', count: 0, createdAt: new Date().toISOString() },
      { id: 'custom', name: 'custom', count: 0, createdAt: new Date().toISOString() },
      { id: 'art', name: 'art', count: 0, createdAt: new Date().toISOString() },
      { id: 'dice', name: 'dice', count: 0, createdAt: new Date().toISOString() },
      { id: 'gaming', name: 'gaming', count: 0, createdAt: new Date().toISOString() }
    ]
  };
  fs.writeFileSync(tagsFile, JSON.stringify(initialTags, null, 2));
}

export function getAllTags(): Tag[] {
  try {
    const data = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
    return data.tags || [];
  } catch (error) {
    console.error('Error reading tags:', error);
    return [];
  }
}

export function createTag(name: string): Tag {
  const tags = getAllTags();
  const existingTag = tags.find(tag => tag.name.toLowerCase() === name.toLowerCase());
  
  if (existingTag) {
    return existingTag;
  }
  
  const newTag: Tag = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name.toLowerCase().trim(),
    count: 0,
    createdAt: new Date().toISOString()
  };
  
  tags.push(newTag);
  
  try {
    fs.writeFileSync(tagsFile, JSON.stringify({ tags }, null, 2));
    return newTag;
  } catch (error) {
    console.error('Error saving tag:', error);
    throw error;
  }
}

export function incrementTagCount(tagNames: string[]): void {
  const tags = getAllTags();
  let updated = false;
  
  tagNames.forEach(tagName => {
    const tag = tags.find(t => t.name === tagName.toLowerCase().trim());
    if (tag) {
      tag.count++;
      updated = true;
    }
  });
  
  if (updated) {
    try {
      fs.writeFileSync(tagsFile, JSON.stringify({ tags }, null, 2));
    } catch (error) {
      console.error('Error updating tag counts:', error);
    }
  }
}

export function decrementTagCount(tagNames: string[]): void {
  const tags = getAllTags();
  let updated = false;
  
  tagNames.forEach(tagName => {
    const tag = tags.find(t => t.name === tagName.toLowerCase().trim());
    if (tag && tag.count > 0) {
      tag.count--;
      updated = true;
    }
  });
  
  if (updated) {
    try {
      fs.writeFileSync(tagsFile, JSON.stringify({ tags }, null, 2));
    } catch (error) {
      console.error('Error updating tag counts:', error);
    }
  }
}

export function getPopularTags(limit: number = 20): Tag[] {
  const tags = getAllTags();
  return tags
    .filter(tag => tag.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
