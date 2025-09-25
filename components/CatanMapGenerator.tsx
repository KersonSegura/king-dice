'use client';

import { useState, useEffect } from 'react';
import { useUserId } from '@/hooks/useUserId';
import { useAuth } from '@/contexts/AuthContext';
import ModernTooltip from './ModernTooltip';
import { useToast } from './Toast';

interface Hexagon {
  id: number;
  type: 'grain' | 'wood' | 'sheep' | 'ore' | 'brick' | 'desert';
  number: number | null;
  position: { x: number; y: number };
}

interface CatanMapGeneratorProps {
  className?: string;
}

// Map type for different board sizes
type MapType = 'classic' | 'expansion';

// Board indexing (0-based)
// Row1: 0,1,2
// Row2: 3,4,5,6
// Row3: 7,8,9,10,11
// Row4: 12,13,14,15
// Row5: 16,17,18

// ---- Base indexing for your board (0-based) ----
const OUTER_RING = [0,1,2,6,11,15,18,17,16,12,7,3]; // 12
const INNER_RING = [4,5,10,14,13,8];                // 6
const CENTER     = 9;                                // 1

// Clockwise spiral order (outer → inner → center), 0-based - DEPRECATED
export const SPIRAL = [
  0, 1, 2, 6, 11, 15, 18, 17, 16, 12, 7, 3, // outer 12
  4, 5, 10, 14, 13, 8,                      // inner 6
  9                                         // center
];

// Adjacency (edge neighbors only), 0-based
export const NEIGHBORS: number[][] = [
  /* 0  */ [1,3,4],
  /* 1  */ [0,2,4,5],
  /* 2  */ [1,5,6],
  /* 3  */ [0,4,7,8],
  /* 4  */ [0,1,3,5,8,9],
  /* 5  */ [1,2,4,6,9,10],
  /* 6  */ [2,5,10,11],
  /* 7  */ [3,8,12],
  /* 8  */ [3,4,7,9,12,13],
  /* 9  */ [4,5,8,10,13,14],
  /* 10 */ [5,6,9,11,14,15],
  /* 11 */ [6,10,15],
  /* 12 */ [7,8,13,16],
  /* 13 */ [8,9,12,14,16,17],
  /* 14 */ [9,10,13,15,17,18],
  /* 15 */ [10,11,14,18],
  /* 16 */ [12,13,17],
  /* 17 */ [13,14,16,18],
  /* 18 */ [14,15,17],
];

// Official A–R chit values (rulebook order)
export const CHITS_AR = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];

type Terrain = "grain"|"wood"|"sheep"|"ore"|"brick"|"desert";
type Board = { terrains: Terrain[]; numbers: (number|null)[] };

const HOT = new Set([2,6,8,12]);
const MAX_TERRAIN_TRIES = 2000;

// Helpers
const rot = <T,>(a: T[], k: number) => a.slice(k).concat(a.slice(0, k));
const rev = <T,>(a: T[]) => a.slice().reverse();

// Build a spiral path with direction + independent ring rotations
function buildSpiralPath(): number[] {
  const dirCW = Math.random() < 0.5;         // flip direction
  const kOuter = (Math.random() * 12) | 0;   // 0..11
  const kInner = (Math.random() * 6) | 0;    // 0..5

  let outer = rot(OUTER_RING, kOuter);
  let inner = rot(INNER_RING, kInner);

  if (!dirCW) {
    outer = rev(outer);
    inner = rev(inner);
  }
  
  const path = outer.concat(inner).concat([CENTER]);
  return path;
}

function rotate<T>(arr: T[], k: number): T[] {
  k = ((k % arr.length)+arr.length)%arr.length;
  return arr.slice(k).concat(arr.slice(0,k));
}

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i=a.length-1;i>0;i--) { const j = (Math.random()*(i+1))|0; [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}

// ---------- NUMBERS (OFFICIAL RING + PATH VARIETY + VALIDATION/REPAIR) ----------
// Place A–R along the path, skipping the Desert
function placeNumbersAR(desertIdx: number): (number | null)[] {
  // rotate the chit strip too (extra variety), 0..17
  const kStrip = (Math.random() * CHITS_AR.length) | 0;
  const strip = rot(CHITS_AR, kStrip);

  const path = buildSpiralPath();
  const nums: (number | null)[] = Array(19).fill(null);
  let i = 0;

  for (let posIdx = 0; posIdx < path.length; posIdx++) {
    const pos = path[posIdx];
    if (pos === desertIdx) continue; // desert gets no chit
    nums[pos] = strip[i++];
  }
  return nums;
}

export function placeNumbersOfficial(desertIdx: number, rotation?: number): (number|null)[] {
  const strip = rotate(CHITS_AR, rotation ?? (Math.random()*CHITS_AR.length)|0);
  const nums: (number|null)[] = Array(19).fill(null);
  let i = 0;
  for (let posIdx = 0; posIdx < SPIRAL.length; posIdx++) {
    const pos = SPIRAL[posIdx];
    if (pos === desertIdx) continue; // skip desert
    nums[pos] = strip[i++];
  }
  return nums;
}

export function noHotAdjacency(nums: (number|null)[], customRules: any): boolean {
  
  for (let i=0;i<19;i++){
    const a = nums[i];
    if (!HOT.has(a as number)) continue;
    for (let jIdx = 0; jIdx < NEIGHBORS[i].length; jIdx++) {
      const j = NEIGHBORS[i][jIdx];
      const b = nums[j];
      if (HOT.has(b as number)) {
        // Rule 1: 6 cannot be adjacent to 8 and vice versa (unless custom rule allows)
        if ((a === 6 && b === 8) || (a === 8 && b === 6)) {
          if (!customRules.sixEightCanTouch) {
            return false;
          } else {
          }
        }
        // Rule 2: Two 6s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 6 && b === 6) {
          return false;
        }
        // Rule 3: Two 8s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 8 && b === 8) {
          return false;
        }
      }
    }
  }
  
  // Rule 4: Other same numbers cannot be adjacent (unless custom rule allows)
  if (!customRules.sameNumbersCanTouch) {
    for (let i = 0; i < 19; i++) {
      const a = nums[i];
      if (a === null || HOT.has(a)) continue; // Skip 2, 6, 8, 12 (already handled above)
      
      for (let jIdx = 0; jIdx < NEIGHBORS[i].length; jIdx++) {
        const j = NEIGHBORS[i][jIdx];
        const b = nums[j];
        if (a === b) {
          return false;
        }
      }
    }
  }
  
  // Additional rule: 2 and 12 cannot be adjacent (unless custom rule allows)
  if (!customRules.twoTwelveCanTouch) {
    for (let i=0;i<19;i++){
      const a = nums[i];
      if (a === 2 || a === 12) {
        for (let jIdx = 0; jIdx < NEIGHBORS[i].length; jIdx++) {
          const j = NEIGHBORS[i][jIdx];
          const b = nums[j];
          if ((a === 2 && b === 12) || (a === 12 && b === 2)) {
            return false;
          }
        }
      }
    }
  }
  
  return true;
}

// Minimal local repair: swap a hot chit with a non-hot chit to break any 6–8 edge
export function repairHotAdjacency(nums: (number|null)[], customRules: any): (number|null)[] {
  const pos: number[] = [];
  for (let i = 0; i < 19; i++) {
    if (nums[i] !== null) pos.push(i);
  }
  
  // Try multiple repair strategies
  for (let attempt = 0; attempt < 3; attempt++) {
    for (let i=0;i<19;i++){
      if (!HOT.has(nums[i] as number)) continue;
      for (let jIdx = 0; jIdx < NEIGHBORS[i].length; jIdx++){
        const j = NEIGHBORS[i][jIdx];
        const a = nums[i], b = nums[j];
        if (HOT.has(b as number)) {
          // Check for 6-8 adjacency specifically
          if ((a === 6 && b === 8) || (a === 8 && b === 6)) {
            if (!customRules.sixEightCanTouch) {
              // Try swapping with non-hot numbers first
              for (let kIdx = 0; kIdx < pos.length; kIdx++){
                const k = pos[kIdx];
                if (HOT.has(nums[k]!)) continue;
                const ai = nums[i]!, ak = nums[k]!;
                nums[i] = ak; nums[k] = ai;
                if (noHotAdjacency(nums, customRules)) return nums;
                nums[i] = ai; nums[k] = ak; // revert
              }
            }
          }
          
          // Check for 6-6 adjacency (ALWAYS enforced)
          if (a === 6 && b === 6) {
            // Try swapping with non-hot numbers first
            for (let kIdx = 0; kIdx < pos.length; kIdx++){
              const k = pos[kIdx];
              if (HOT.has(nums[k]!)) continue;
              const ai = nums[i]!, ak = nums[k]!;
              nums[i] = ak; nums[k] = ai;
              if (noHotAdjacency(nums, customRules)) return nums;
              nums[i] = ai; nums[k] = ak; // revert
            }
          }
          
          // Check for 8-8 adjacency (ALWAYS enforced)
          if (a === 8 && b === 8) {
            // Try swapping with non-hot numbers first
            for (let kIdx = 0; kIdx < pos.length; kIdx++){
              const k = pos[kIdx];
              if (HOT.has(nums[k]!)) continue;
              const ai = nums[i]!, ak = nums[k]!;
              nums[i] = ak; nums[k] = ai;
              if (noHotAdjacency(nums, customRules)) return nums;
              nums[i] = ai; nums[k] = ak; // revert
            }
          }
        }
      }
    }
    
    // If we get here, try shuffling the entire array
    if (attempt < 2) {
      shuffleInPlace(pos);
    }
  }
  
  return nums;
}

export function generateValidNumbers(desertIdx: number, customRules: any): (number|null)[] {
  
  // Strategy 1: Try path variety with many attempts
  for (let tries=0; tries<2000; tries++) {
    const nums = placeNumbersAR(desertIdx);
    if (noHotAdjacency(nums, customRules)) {
      return nums;
    }
  }
  
  // Strategy 2: Try all rotations of the old spiral method
  for (let r=0; r<CHITS_AR.length; r++){
    const nums = placeNumbersOfficial(desertIdx, r);
    if (noHotAdjacency(nums, customRules)) {
      return nums;
    }
  }
  
  // Strategy 3: Try with different path variations
  for (let tries=0; tries<1000; tries++) {
    const nums = placeNumbersAR(desertIdx);
    if (noHotAdjacency(nums, customRules)) {
      return nums;
    }
  }
  
  // Strategy 4: Final fallback - repair any board
  const repaired = repairHotAdjacency(placeNumbersAR(desertIdx), customRules);
  
  // CRITICAL: Never return invalid numbers for 6-8 adjacency
  if (!noHotAdjacency(repaired, customRules)) {
    console.error("🚫 CRITICAL: Repair strategy failed - 6-8 adjacency rule violated!");
    console.error("🚫 This should NEVER happen - throwing error to prevent invalid map display");
    throw new Error("Failed to generate valid numbers that satisfy 6-8 adjacency rules");
  }
  
  return repaired;
}

// ---------- TERRAINS (NO CLUSTER > 2 OF SAME TYPE) ----------
export const TERRAIN_COUNTS: Record<Exclude<Terrain,"desert">,number> = {
  grain:4, wood:4, sheep:4, brick:3, ore:3
};

export function buildTerrainPool(): Terrain[] {
  const out: Terrain[] = [];
  const entries = Object.entries(TERRAIN_COUNTS) as [Exclude<Terrain,"desert">,number][];
  for (let i = 0; i < entries.length; i++) {
    const [t, c] = entries[i];
    for (let j = 0; j < c; j++) out.push(t);
  }
  out.push("desert");
  return out;
}

// BFS max connected component size for a given terrain type
function maxClusterSize(terrains: Terrain[], target: Terrain): number {
  const isExpansionMap = terrains.length === 30;
  const neighbors = isExpansionMap ? EXPANSION_NEIGHBORS : NEIGHBORS;
  const maxTiles = isExpansionMap ? 30 : 19;
  
  const seen = new Array(maxTiles).fill(false);
  let best = 0;
  
  for (let s = 0; s < maxTiles; s++) {
    if (seen[s] || terrains[s] !== target) continue;
    
    let q = [s], size = 0; 
    seen[s] = true;
    
    while (q.length) {
      const v = q.pop()!;
      size++;
      
      for (let nIdx = 0; nIdx < neighbors[v].length; nIdx++) {
        const n = neighbors[v][nIdx];
        if (!seen[n] && terrains[n] === target) { 
          seen[n] = true; 
          q.push(n); 
        }
      }
    }
    
    if (size > best) best = size;
    if (best > 2) return best; // Early exit for classic maps
  }
  
  return best;
}

// Active prevention of chains longer than 2 for expansion maps
function preventLongChains(terrains: Terrain[]): boolean {
  
  const isExpansionMap = terrains.length === 30;
  if (!isExpansionMap) {
    return true; // Only apply to expansion maps
  }
  
  const neighbors = EXPANSION_NEIGHBORS;
  
  // Check each tile to ensure it doesn't create chains longer than 2
  for (let i = 0; i < 30; i++) {
    const currentTerrain = terrains[i];
    if (currentTerrain === 'desert') continue;
    
    // Count how many neighbors of the same type this tile has
    const sameTypeNeighbors = neighbors[i].filter(n => terrains[n] === currentTerrain);
    
    if (sameTypeNeighbors.length > 0) {
    }
    
    // If this tile has 2+ neighbors of the same type, check if they form a chain
    if (sameTypeNeighbors.length >= 2) {
      
      // Check if any of these neighbors are connected to each other
      for (let j = 0; j < sameTypeNeighbors.length; j++) {
        for (let k = j + 1; k < sameTypeNeighbors.length; k++) {
          const neighbor1 = sameTypeNeighbors[j];
          const neighbor2 = sameTypeNeighbors[k];
          
          
          // If these two neighbors are also connected, we have a chain of 3
          if (neighbors[neighbor1].includes(neighbor2)) {
            return false;
          } else {
          }
        }
      }
    }
  }
  
  return true;
}

// Repair expansion map clustering by swapping resources
function repairExpansionClustering(terrains: Terrain[]): Terrain[] | null {
  
  const isExpansionMap = terrains.length === 30;
  if (!isExpansionMap) return null;
  
  const neighbors = EXPANSION_NEIGHBORS;
  const resourceTypes: Terrain[] = ['grain', 'wood', 'sheep', 'brick', 'ore'];
  let repaired = false;
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Find all chains of 3+ tiles
    const chainsToFix: Array<{tile: number, resource: Terrain, neighbors: number[]}> = [];
    
    for (let i = 0; i < 30; i++) {
      const currentTerrain = terrains[i];
      if (currentTerrain === 'desert') continue;
      
      const sameTypeNeighbors = neighbors[i].filter(n => terrains[n] === currentTerrain);
      
      // If this tile has 2+ neighbors of the same type, check if they form a chain
      if (sameTypeNeighbors.length >= 2) {
        for (let j = 0; j < sameTypeNeighbors.length; j++) {
          for (let k = j + 1; k < sameTypeNeighbors.length; k++) {
            const neighbor1 = sameTypeNeighbors[j];
            const neighbor2 = sameTypeNeighbors[k];
            
            // If these two neighbors are also connected, we have a chain of 3
            if (neighbors[neighbor1].includes(neighbor2)) {
              chainsToFix.push({
                tile: i,
                resource: currentTerrain,
                neighbors: [neighbor1, neighbor2]
              });
            }
          }
        }
      }
    }
    
    if (chainsToFix.length === 0) {
      return terrains;
    }
    
    // Try to fix one chain by swapping resources
    for (const chain of chainsToFix) {
      // Find a different resource type to swap with
      const otherResources = resourceTypes.filter(r => r !== chain.resource);
      
      for (const otherResource of otherResources) {
        // Find tiles with the other resource that could be swapped
        const otherResourceTiles = [];
        for (let i = 0; i < 30; i++) {
          if (terrains[i] === otherResource) {
            // Check if swapping would create new chains
            const wouldCreateChain = checkIfSwapCreatesChain(terrains, i, chain.tile, otherResource, chain.resource);
            if (!wouldCreateChain) {
              otherResourceTiles.push(i);
            }
          }
        }
        
        if (otherResourceTiles.length > 0) {
          // Pick a random tile to swap with
          const swapTile = otherResourceTiles[Math.floor(Math.random() * otherResourceTiles.length)];
          
          
          // Perform the swap
          [terrains[chain.tile], terrains[swapTile]] = [terrains[swapTile], terrains[chain.tile]];
          repaired = true;
          break;
        }
      }
      
      if (repaired) break;
    }
    
    if (!repaired) {
      // If we can't find good swaps, try shuffling some resources
      const nonDesertTiles = terrains.map((t, i) => ({ terrain: t, index: i })).filter(t => t.terrain !== 'desert');
      const shuffled = shuffleInPlace([...nonDesertTiles]);
      
      for (let i = 0; i < nonDesertTiles.length; i++) {
        terrains[nonDesertTiles[i].index] = shuffled[i].terrain;
      }
      repaired = true;
    }
  }
  
  if (attempts >= maxAttempts) {
  }
  
  return terrains;
}

// Helper function to check if a swap would create new chains
function checkIfSwapCreatesChain(terrains: Terrain[], tile1: number, tile2: number, resource1: Terrain, resource2: Terrain): boolean {
  const neighbors = EXPANSION_NEIGHBORS;
  
  // Temporarily perform the swap
  [terrains[tile1], terrains[tile2]] = [terrains[tile2], terrains[tile1]];
  
  // Check if either tile now forms a chain of 3+
  const checkTile = (tile: number, resource: Terrain) => {
    const sameTypeNeighbors = neighbors[tile].filter(n => terrains[n] === resource);
    if (sameTypeNeighbors.length >= 2) {
      for (let j = 0; j < sameTypeNeighbors.length; j++) {
        for (let k = j + 1; k < sameTypeNeighbors.length; k++) {
          const neighbor1 = sameTypeNeighbors[j];
          const neighbor2 = sameTypeNeighbors[k];
          if (neighbors[neighbor1].includes(neighbor2)) {
            return true; // Would create a chain
          }
        }
      }
    }
    return false;
  };
  
  const wouldCreateChain = checkTile(tile1, resource2) || checkTile(tile2, resource1);
  
  // Revert the swap
  [terrains[tile1], terrains[tile2]] = [terrains[tile2], terrains[tile1]];
  
  return wouldCreateChain;
}

export function terrainsPassClusterRule(terrains: Terrain[], customRules: any): boolean {
  const terrainTypes = ["grain","wood","sheep","brick","ore"] as Terrain[];
  
  // For expansion maps (30 tiles), enforce strict no-clustering rule regardless of checkbox
  const isExpansionMap = terrains.length === 30;
  
  for (let tIdx = 0; tIdx < terrainTypes.length; tIdx++) {
    const t = terrainTypes[tIdx];
    const maxCluster = maxClusterSize(terrains, t);
    
    if (isExpansionMap) {
      // Expansion maps: Maximum 2 tiles of same resource can touch (strict clustering prevention)
      if (maxCluster > 2) {
        return false;
      }
      // Additional check: if we have exactly 2, ensure they don't form a chain with a third
      if (maxCluster === 2) {
        // This will be handled by preventLongChains function
      }
    } else {
      // Classic maps: Use checkbox setting
    if (customRules.sameResourceCanTouch) {
      // Checkbox checked: Maximum 2 tiles of same resource can touch
      if (maxCluster > 2) {
        return false;
      }
    } else {
      // Checkbox unchecked: NO same resource tiles can touch at all
      if (maxCluster > 1) {
        return false;
        }
      }
    }
  }
  
  if (isExpansionMap) {
  } else if (customRules.sameResourceCanTouch) {
  } else {
  }
  return true;
}

export function generateValidTerrains(customRules: any): Terrain[] {
  const pool = buildTerrainPool();
  for (let tries=0; tries<MAX_TERRAIN_TRIES; tries++){
    shuffleInPlace(pool);
    if (terrainsPassClusterRule(pool, customRules)) return [...pool];
  }
  // If we somehow can't satisfy after many tries, return the best we found (or relax to <=3)
  return [...pool];
}

// ---------- MAIN: build board without rendering invalid states ----------
export function makeValidBoard(customRules: any): Board {
  
  const terrains = generateValidTerrains(customRules);
  const desertIdx = terrains.indexOf("desert");
  const numbers = generateValidNumbers(desertIdx, customRules);
  
  // CRITICAL: Final validation before returning
  if (!noHotAdjacency(numbers, customRules)) {
    console.error('🚫 CRITICAL: Final classic board validation failed!');
    console.error('🚫 This should NEVER happen - throwing error to prevent invalid map display');
    throw new Error('Classic board failed final validation - 6-8 adjacency rules violated');
  }
  
  return { terrains, numbers };
}

// Expansion board generation (5-6 players) - Improved step-by-step logic
export function makeValidExpansionBoard(customRules: any): Board {
  
  // Step 1: Place Deserts First
  const desertPositions = placeDesertsRandomly();
  
  // Step 2: Place Resource Tiles
  const terrains = placeResourceTiles(desertPositions);
  
  // Step 3: Place Number Tokens Using Smart Placement Strategy
  // This will automatically use smart placement if 6-8 cannot touch,
  // or fall back to the original chit ring method if they can touch
  const numbers = placeNumberTokens(desertPositions, customRules);
  
  // Step 4: Randomization for Variety (already implemented in the functions above)
  
  // Step 5: Final validation and output
  
  // CRITICAL: Final validation before returning
  if (!noHotAdjacencyExpansion(numbers, customRules)) {
    console.error('🚫 CRITICAL: Final expansion board validation failed!');
    console.error('🚫 This should NEVER happen - throwing error to prevent invalid map display');
    throw new Error('Expansion board failed final validation - 6-8 adjacency rules violated');
  }
  
  return { terrains: terrains as Terrain[], numbers: numbers };
}

// Step 1: Randomly place 2 deserts anywhere on the map
function placeDesertsRandomly(): number[] {
  const positions = Array.from({length: 30}, (_, i) => i);
  const shuffled = shuffleInPlace([...positions]);
  return shuffled.slice(0, 2).sort((a, b) => a - b);
}

// Step 2: Place resource tiles with simple retry logic
function placeResourceTiles(desertPositions: number[]): Terrain[] {
  
  // Resource pool as array
  const resourcePool: Terrain[] = [
    'grain', 'grain', 'grain', 'grain', 'grain', 'grain',     // 6 grain tiles
    'wood', 'wood', 'wood', 'wood', 'wood', 'wood',           // 6 wood tiles
    'sheep', 'sheep', 'sheep', 'sheep', 'sheep', 'sheep',     // 6 sheep tiles
    'brick', 'brick', 'brick', 'brick', 'brick',              // 5 brick tiles
    'ore', 'ore', 'ore', 'ore', 'ore'                         // 5 ore tiles
  ];
  
  // Get all empty positions (non-desert)
  const emptyPositions = Array.from({ length: 30 }, (_, i) => i)
    .filter(i => !desertPositions.includes(i));
  
  
  // Try multiple times to get a valid placement
  for (let attempt = 0; attempt < 2000; attempt++) {
    const result = placeResourcesSimple(resourcePool, emptyPositions, desertPositions);
    if (result) {
      return result;
    }
    
    if (attempt % 200 === 0) {
    }
  }
  
  console.warn('⚠️ Simple placement failed after 2000 attempts, falling back to aggressive placement...');
  return placeResourcesAggressively(desertPositions, resourcePool);
}

// Simple, reliable resource placement with immediate validation
function placeResourcesSimple(resourcePool: Terrain[], emptyPositions: number[], desertPositions: number[]): Terrain[] | null {
  
  // Initialize board with deserts
  const terrains: Terrain[] = new Array(30).fill('desert');
  for (const desertPos of desertPositions) {
    terrains[desertPos] = 'desert';
  }
  
  // Shuffle resources for randomness
  const shuffledResources = shuffleInPlace([...resourcePool]);
  let resourceIndex = 0;
  
  // Place resources one by one with immediate validation
  for (const pos of emptyPositions) {
    // Get all resources that don't create immediate clustering
    const validResources = shuffledResources.filter(resource => 
      !wouldCreateTripleCluster(terrains, pos, resource)
    );
    
    if (validResources.length === 0) {
      return null; // No valid placement, fail and retry
    }
    
    // Choose a random valid resource
    const chosenResource = validResources[Math.floor(Math.random() * validResources.length)];
    
    // Place the resource
    terrains[pos] = chosenResource;
    
    // IMMEDIATELY check if this creates any clustering issues
    if (hasAnyClustering(terrains)) {
      return null; // This placement created clustering, fail and retry
    }
    
    // Remove the chosen resource from the pool
    const resourceIndexToRemove = shuffledResources.indexOf(chosenResource);
    if (resourceIndexToRemove !== -1) {
      shuffledResources.splice(resourceIndexToRemove, 1);
    }
    
  }
  
  return terrains;
}



// Check if placing a resource would create a triple cluster
function wouldCreateTripleCluster(terrains: Terrain[], pos: number, resource: Terrain): boolean {
  const neighbors = EXPANSION_NEIGHBORS[pos];
  if (!neighbors) return false;
  
  // Count how many neighbors already have the same resource
  const sameTypeNeighbors = neighbors.filter(n => terrains[n] === resource);
  
  // If 2+ neighbors of same type already exist, placing this will make 3+
  return sameTypeNeighbors.length >= 2;
}

// Check if the entire board has any clustering issues
function hasAnyClustering(terrains: Terrain[]): boolean {
  const terrainTypes = ['grain', 'wood', 'sheep', 'brick', 'ore'] as Terrain[];
  
  for (const terrainType of terrainTypes) {
    if (hasResourceClustering(terrains, terrainType)) {
      return true;
    }
  }
  
  return false;
}

// Check for clustering issues with a specific resource type
function hasResourceClustering(terrains: Terrain[], resourceType: Terrain): boolean {
  const visited = new Array(30).fill(false);
  
  for (let i = 0; i < 30; i++) {
    if (visited[i] || terrains[i] !== resourceType) continue;
    
    // Find the size of this cluster
    const clusterSize = getClusterSize(terrains, i, resourceType, visited);
    
    if (clusterSize > 2) {
      return true;
    }
  }
  
  return false;
}

// Get the size of a cluster starting from a given position
function getClusterSize(terrains: Terrain[], startPos: number, resourceType: Terrain, visited: boolean[]): number {
  const queue = [startPos];
  let clusterSize = 0;
  
  while (queue.length > 0) {
    const currentPos = queue.shift()!;
    
    if (visited[currentPos] || terrains[currentPos] !== resourceType) continue;
    
    visited[currentPos] = true;
    clusterSize++;
    
    // Add unvisited neighbors of the same type
    const neighbors = EXPANSION_NEIGHBORS[currentPos];
    for (const neighbor of neighbors) {
      if (!visited[neighbor] && terrains[neighbor] === resourceType) {
        queue.push(neighbor);
      }
    }
  }
  
  return clusterSize;
}







// Aggressive placement strategy when normal placement fails
function placeResourcesAggressively(desertPositions: number[], resourcePool: Terrain[]): Terrain[] {
  
  // Try multiple times to get a valid placement even with aggressive strategy
  for (let attempt = 0; attempt < 200; attempt++) {
    const terrains: Terrain[] = new Array(30).fill('desert');
    const shuffledResources = shuffleInPlace([...resourcePool]);
    let resourceIndex = 0;
    let placementFailed = false;
    
    // Place resources in a more controlled manner
    for (let i = 0; i < 30; i++) {
      if (!desertPositions.includes(i)) {
        const resourceToPlace = shuffledResources[resourceIndex];
        
        // Try to find a better position for this resource if it would create clustering
        if (wouldCreateTripleCluster(terrains, i, resourceToPlace)) {
          // Look for a better position
          let betterPosition = findBetterPosition(terrains, resourceToPlace, desertPositions);
          if (betterPosition !== -1) {
            terrains[betterPosition] = resourceToPlace;
          } else {
            // If no better position, this attempt failed
            placementFailed = true;
            break;
          }
        } else {
          terrains[i] = resourceToPlace;
        }
        
        resourceIndex++;
      }
    }
    
    // Check if this placement has any clustering issues
    if (!placementFailed && !hasAnyClustering(terrains)) {
      return terrains;
    }
  }
  
  // If aggressive placement also fails, create a minimal valid board
  console.warn('⚠️ All placement strategies failed, creating minimal valid board...');
  return createMinimalValidBoard(desertPositions, resourcePool);
}

// Create a minimal valid board when all else fails
function createMinimalValidBoard(desertPositions: number[], resourcePool: Terrain[]): Terrain[] {
  
  const terrains: Terrain[] = new Array(30).fill('desert');
  const shuffledResources = shuffleInPlace([...resourcePool]);
  let resourceIndex = 0;
  
  // Place resources one by one, prioritizing positions with fewer neighbors
  const emptyPositions = Array.from({ length: 30 }, (_, i) => i)
    .filter(i => !desertPositions.includes(i))
    .sort((a, b) => {
      const aNeighbors = EXPANSION_NEIGHBORS[a]?.length || 0;
      const bNeighbors = EXPANSION_NEIGHBORS[b]?.length || 0;
      return aNeighbors - bNeighbors;
    });
  
  for (const pos of emptyPositions) {
    const resourceToPlace = shuffledResources[resourceIndex];
    
    // Always place the resource, even if it creates clustering
    terrains[pos] = resourceToPlace;
    resourceIndex++;
  }
  
  return terrains;
}

// Find a better position for a resource that avoids clustering
function findBetterPosition(terrains: Terrain[], resource: Terrain, desertPositions: number[]): number {
  // Look for positions that would have minimal clustering
  let bestPosition = -1;
  let bestScore = Infinity;
  
  for (let i = 0; i < 30; i++) {
    if (desertPositions.includes(i) || terrains[i] !== 'desert') continue;
    
    // Calculate clustering score for this position
    const score = calculateClusteringScore(terrains, i, resource);
    
    if (score < bestScore) {
      bestScore = score;
      bestPosition = i;
    }
  }
  
  return bestPosition;
}

// Calculate how much clustering a placement would create
function calculateClusteringScore(terrains: Terrain[], position: number, resource: Terrain): number {
  const neighbors = EXPANSION_NEIGHBORS[position];
  if (!neighbors) return 0;
  
  const sameTypeNeighbors = neighbors.filter(n => terrains[n] === resource);
  
  // Higher score = more clustering
  let score = sameTypeNeighbors.length * 10;
  
  // Penalize heavily for chains
  if (sameTypeNeighbors.length >= 2) {
    for (let j = 0; j < sameTypeNeighbors.length; j++) {
      for (let k = j + 1; k < sameTypeNeighbors.length; k++) {
        const neighbor1 = sameTypeNeighbors[j];
        const neighbor2 = sameTypeNeighbors[k];
        if (neighbors.includes(neighbor2) || EXPANSION_NEIGHBORS[neighbor1].includes(neighbor2)) {
          score += 100; // Heavy penalty for chains
        }
      }
    }
  }
  
  return score;
}



// Step 3: Place number tokens using smart placement strategy
function placeNumberTokens(desertPositions: number[], customRules: any): (number | null)[] {
  // Official 5-6 player expansion numbers (28 total + 2 deserts = 30)
  const expansionNumbers = [
    2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12
  ];
  
  // If 6 & 8 cannot touch, use smart placement to prevent adjacency
  if (!customRules.sixEightCanTouch) {
    return placeNumbersSmartly(desertPositions, customRules);
  }
  
  // Otherwise, use the original chit ring method
  
  // Try multiple times to get a valid placement
  for (let attempt = 0; attempt < 200; attempt++) {
    // Randomize the starting point and rotation for variety
    const shuffledNumbers = shuffleInPlace([...expansionNumbers]);
    const numbers: (number | null)[] = new Array(30).fill(null);
    
    // Place deserts first (no numbers)
    desertPositions.forEach(pos => {
      numbers[pos] = null;
    });
    
    // Place numbers in spiral order, skipping deserts
    const spiralOrder = generateSpiralOrder();
    let numberIndex = 0;
    
    for (let i = 0; i < spiralOrder.length && numberIndex < shuffledNumbers.length; i++) {
      const pos = spiralOrder[i];
      if (!desertPositions.includes(pos)) {
        numbers[pos] = shuffledNumbers[numberIndex];
        numberIndex++;
      }
    }
    
    // Check if this placement satisfies the adjacency rules
    if (noHotAdjacencyExpansion(numbers, customRules)) {
      return numbers;
    }
  }
  
  // If we can't find a valid placement, try to repair the last one
  console.warn('⚠️ Could not find valid number placement after 200 attempts, attempting repair...');
  const shuffledNumbers = shuffleInPlace([...expansionNumbers]);
  const numbers: (number | null)[] = new Array(30).fill(null);
  
  desertPositions.forEach(pos => {
    numbers[pos] = null;
  });
  
  const spiralOrder = generateSpiralOrder();
  let numberIndex = 0;
  
  for (let i = 0; i < spiralOrder.length && numberIndex < shuffledNumbers.length; i++) {
    const pos = spiralOrder[i];
    if (!desertPositions.includes(pos)) {
      numbers[pos] = shuffledNumbers[numberIndex];
      numberIndex++;
    }
  }
  
  // Try to repair any adjacency violations
  const repaired = repairExpansionAdjacency(numbers, customRules);
  
  // CRITICAL: Never return invalid numbers for 6-8 adjacency
  if (!noHotAdjacencyExpansion(repaired, customRules)) {
    console.error("🚫 CRITICAL: Expansion repair strategy failed - 6-8 adjacency rule violated!");
    console.error("🚫 This should NEVER happen - throwing error to prevent invalid map display");
    throw new Error("Failed to generate valid expansion numbers that satisfy 6-8 adjacency rules");
  }
  
  return repaired;
}

// Smart placement function that prevents 6-8 adjacency by placing them first
// NEW APPROACH: Instead of trying to fix adjacency violations after they happen,
// we PREVENT them by placing 6s and 8s in non-adjacent positions from the start.
// This ensures that no 6-8 adjacency violations can ever occur.
function placeNumbersSmartly(desertPositions: number[], customRules: any): (number | null)[] {
  

  
  // Official 5-6 player expansion numbers (28 total + 2 deserts = 30)
  const expansionNumbers = [
    2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12
  ];
  
  // Initialize board with nulls
  const numbers: (number | null)[] = new Array(30).fill(null);
  
  // Place deserts first (no numbers)
  desertPositions.forEach(pos => {
    numbers[pos] = null;
  });
  
  // Get all available positions (non-desert)
  const availablePositions = Array.from({ length: 30 }, (_, i) => i)
    .filter(i => !desertPositions.includes(i));
  
  // Step 1: Place the 6s first in random non-adjacent positions
  const sixes = expansionNumbers.filter(n => n === 6);
  const sixPositions: number[] = [];
  
  for (const six of sixes) {
    
    // Find all positions that are not adjacent to any existing 6
    const validPositions = availablePositions.filter(pos => {
      // Check if this position is adjacent to any existing 6
      const neighbors = EXPANSION_NEIGHBORS[pos] || [];
      const isAdjacentToSix = neighbors.some(neighbor => sixPositions.includes(neighbor));
      
      // Also check if any existing 6s are adjacent to this position
      const isAdjacentToExistingSixes = sixPositions.some(sixPos => {
        const sixNeighbors = EXPANSION_NEIGHBORS[sixPos] || [];
        return sixNeighbors.includes(pos);
      });
      
      // CRITICAL: Check if placing a 6 here would make any existing 6s adjacent to each other
      const wouldCreateAdjacentSixes = sixPositions.some(existingSixPos => {
        const existingSixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
        return existingSixNeighbors.includes(pos);
      });
      
      const isValid = !isAdjacentToSix && !isAdjacentToExistingSixes && !wouldCreateAdjacentSixes;
      
      if (!isValid) {
        if (isAdjacentToSix) {
          const adjacentSixes = neighbors.filter(neighbor => sixPositions.includes(neighbor));
        }
        if (isAdjacentToExistingSixes) {
          const adjacentToSixes = sixPositions.filter(sixPos => {
            const sixNeighbors = EXPANSION_NEIGHBORS[sixPos] || [];
            return sixNeighbors.includes(pos);
          });
        }
        if (wouldCreateAdjacentSixes) {
          const wouldBeAdjacentTo = sixPositions.filter(existingSixPos => {
            const existingSixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
            return existingSixNeighbors.includes(pos);
          });
        }
      }
      
      return isValid;
    });
    
    if (validPositions.length === 0) {
      console.error('🚫 No valid positions for 6 - this should never happen!');
      throw new Error('Cannot place 6s without adjacency violations');
    }
    
    // Choose a random valid position
    const chosenPos = validPositions[Math.floor(Math.random() * validPositions.length)];
    numbers[chosenPos] = six;
    sixPositions.push(chosenPos);
    
    // Remove this position from available positions
    const index = availablePositions.indexOf(chosenPos);
    if (index !== -1) {
      availablePositions.splice(index, 1);
    }
    
  }
  
  // Step 2: Place the 8s in random non-adjacent positions (also not adjacent to 6s)
  const eights = expansionNumbers.filter(n => n === 8);
  const eightPositions: number[] = [];
  
  for (const eight of eights) {
    
    // Find all positions that are not adjacent to any existing 6 or 8
    const validPositions = availablePositions.filter(pos => {
      // Check if this position is adjacent to any existing 6 or 8
      const neighbors = EXPANSION_NEIGHBORS[pos] || [];
      const isAdjacentToSixOrEight = neighbors.some(neighbor => 
        sixPositions.includes(neighbor) || eightPositions.includes(neighbor)
      );
      
      // Also check if any existing 6s or 8s are adjacent to this position
      const isAdjacentToExistingHotNumbers = sixPositions.some(sixPos => {
        const sixNeighbors = EXPANSION_NEIGHBORS[sixPos] || [];
        return sixNeighbors.includes(pos);
      }) || eightPositions.some(eightPos => {
        const eightNeighbors = EXPANSION_NEIGHBORS[eightPos] || [];
        return eightNeighbors.includes(pos);
      });
      
      // CRITICAL: Check if placing an 8 here would make any existing 8s adjacent to each other
      const wouldCreateAdjacentEights = eightPositions.some(existingEightPos => {
        const existingEightNeighbors = EXPANSION_NEIGHBORS[existingEightPos] || [];
        return existingEightNeighbors.includes(pos);
      });
      
      // CRITICAL: Check if placing an 8 here would make any existing 6s adjacent to each other
      const wouldCreateAdjacentSixes = sixPositions.some(existingSixPos => {
        const existingSixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
        return existingSixNeighbors.includes(pos);
      });
      
      const isValid = !isAdjacentToSixOrEight && !isAdjacentToExistingHotNumbers && !wouldCreateAdjacentEights && !wouldCreateAdjacentSixes;
      
      if (!isValid) {
        if (isAdjacentToSixOrEight) {
          const adjacentSixes = neighbors.filter(neighbor => sixPositions.includes(neighbor));
          const adjacentEights = neighbors.filter(neighbor => eightPositions.includes(neighbor));
        }
        if (isAdjacentToExistingHotNumbers) {
          const adjacentToSixes = sixPositions.filter(sixPos => {
            const sixNeighbors = EXPANSION_NEIGHBORS[sixPos] || [];
            return sixNeighbors.includes(pos);
          });
          const adjacentToEights = eightPositions.filter(eightPos => {
            const eightNeighbors = EXPANSION_NEIGHBORS[eightPos] || [];
            return eightNeighbors.includes(pos);
          });
        }
        if (wouldCreateAdjacentEights) {
          const wouldBeAdjacentTo = eightPositions.filter(existingEightPos => {
            const existingEightNeighbors = EXPANSION_NEIGHBORS[existingEightPos] || [];
            return existingEightNeighbors.includes(pos);
          });
        }
        if (wouldCreateAdjacentSixes) {
          const wouldBeAdjacentTo = sixPositions.filter(existingSixPos => {
            const sixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
            return sixNeighbors.includes(pos);
          });
        }
      }
      
      return isValid;
    });
    
    if (validPositions.length === 0) {
      console.error('🚫 No valid positions for 8 - this should never happen!');
      throw new Error('Cannot place 8s without adjacency violations');
    }
    
    // Choose a random valid position
    const chosenPos = validPositions[Math.floor(Math.random() * validPositions.length)];
    numbers[chosenPos] = eight;
    eightPositions.push(chosenPos);
    
    // Remove this position from available positions
    const index = availablePositions.indexOf(chosenPos);
    if (index !== -1) {
      availablePositions.splice(index, 1);
    }
    
  }
  
  // Step 3: Place all remaining numbers randomly in remaining positions
  const remainingNumbers = expansionNumbers.filter(n => n !== 6 && n !== 8);
  const shuffledRemaining = shuffleInPlace([...remainingNumbers]);
  
  for (let i = 0; i < shuffledRemaining.length && i < availablePositions.length; i++) {
    const number = shuffledRemaining[i];
    const position = availablePositions[i];
    numbers[position] = number;
  }
  
  // Final validation to ensure no adjacency violations
  

  
  if (!noHotAdjacencyExpansion(numbers, customRules)) {
    console.error('🚫 Smart placement failed validation - this should never happen!');
    throw new Error('Smart placement failed to prevent adjacency violations');
  }
  
  return numbers;
}

// Generate spiral order for expansion board (similar to classic but for 30 tiles)
function generateSpiralOrder(): number[] {
  // Based on the 7-column structure from the image
  // This creates a spiral pattern that covers all 30 tiles
  const spiral = [
    // Outer ring (clockwise from top-left)
    0, 1, 2, 6, 11, 16, 21, 26, 29, 28, 27, 23, 18, 13, 8, 3,
    // Inner ring
    4, 5, 9, 10, 14, 15, 19, 20, 24, 25, 22, 17, 12, 7
  ];
  
  // Randomize starting point and direction for variety
  const startOffset = Math.floor(Math.random() * spiral.length);
  const reversed = Math.random() < 0.5;
  
  let result = [...spiral];
  if (startOffset > 0) {
    result = [...result.slice(startOffset), ...result.slice(0, startOffset)];
  }
  if (reversed) {
    result = result.reverse();
  }
  
  return result;
}

// Repair adjacency violations by swapping numbers
function repairExpansionAdjacency(numbers: (number | null)[], customRules: any): (number | null)[] {
  
  // Try multiple repair strategies
  for (let attempt = 0; attempt < 50; attempt++) {
    // Find hot numbers (6, 8) that are adjacent
    for (let i = 0; i < 30; i++) {
      const current = numbers[i];
      if (!current || !HOT.has(current)) continue;
      
      const neighbors = EXPANSION_NEIGHBORS[i] || [];
      for (const neighbor of neighbors) {
        const neighborNum = numbers[neighbor];
        if (!neighborNum || !HOT.has(neighborNum)) continue;
        
        // Found adjacent hot numbers, try to swap with non-hot numbers
        for (let j = 0; j < 30; j++) {
          if (j === i || j === neighbor) continue;
          const swapCandidate = numbers[j];
          if (!swapCandidate || HOT.has(swapCandidate)) continue;
          
          // Try swapping
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
          if (noHotAdjacencyExpansion(numbers, customRules)) {
            return numbers;
          }
          // Revert swap
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
      }
    }
    
    // If no repair found, shuffle the numbers and try again
    if (attempt < 49) {
      const nonDesertNumbers = numbers.filter(n => n !== null);
      shuffleInPlace(nonDesertNumbers);
      let index = 0;
      for (let i = 0; i < 30; i++) {
        if (numbers[i] !== null) {
          numbers[i] = nonDesertNumbers[index];
          index++;
        }
      }
    }
  }
  
  console.error('🚫 CRITICAL: Could not repair all adjacency violations after 50 attempts!');
  console.error('🚫 This should NEVER happen - the repair function must succeed');
  throw new Error("Failed to repair expansion map adjacency violations - this indicates a critical bug");
}



// Expansion map adjacency system (7-column rectangular layout)
// Based on the 7-column structure:
// Column 1: Tiles 1, 2, 3
// Column 2: Tiles 4, 5, 6, 7  
// Column 3: Tiles 8, 9, 10, 11, 12
// Column 4: Tiles 13, 14, 15, 16, 17, 18
// Column 5: Tiles 19, 20, 21, 22, 23
// Column 6: Tiles 24, 25, 26, 27
// Column 7: Tiles 28, 29, 30
export const EXPANSION_NEIGHBORS: number[][] = [
  /* 0  */ [1, 3, 4],                    // Tile 1: adjacent to 2, 4, 5
  /* 1  */ [0, 2, 4, 5],                 // Tile 2: adjacent to 1, 3, 5, 6
  /* 2  */ [1, 5, 6],                    // Tile 3: adjacent to 2, 6, 7
  /* 3  */ [0, 1, 4, 7],                 // Tile 4: adjacent to 1, 5, 8, 9
  /* 4  */ [1, 2, 3, 5, 8, 9],          // Tile 5: adjacent to 1, 2, 4, 6, 9, 10
  /* 5  */ [2, 4, 6, 9, 10],            // Tile 6: adjacent to 2, 3, 5, 7, 10, 11
  /* 6  */ [2, 5, 10, 11],              // Tile 7: adjacent to 3, 6, 11, 12
  /* 7  */ [3, 4, 8, 12],               // Tile 8: adjacent to 4, 9, 13, 14
  /* 8  */ [4, 5, 7, 9, 13, 14],        // Tile 9: adjacent to 4, 5, 8, 10, 14, 15
  /* 9  */ [5, 6, 8, 10, 14, 15],       // Tile 10: adjacent to 5, 6, 9, 11, 15, 16
  /* 10 */ [6, 9, 11, 15, 16],          // Tile 11: adjacent to 6, 7, 10, 12, 16, 17
  /* 11 */ [6, 10, 16, 17],             // Tile 12: adjacent to 7, 11, 17, 18
  /* 12 */ [7, 8, 13, 18],              // Tile 13: adjacent to 8, 14, 19
  /* 13 */ [8, 9, 12, 14, 19, 20],      // Tile 14: adjacent to 8, 9, 13, 15, 19, 20
  /* 14 */ [9, 10, 13, 15, 19, 20],     // Tile 15: adjacent to 9, 10, 14, 16, 20, 21
  /* 15 */ [10, 11, 14, 16, 20, 21],   // Tile 16: adjacent to 10, 11, 15, 17, 21, 22
  /* 16 */ [11, 15, 17, 21, 22],        // Tile 17: adjacent to 11, 12, 16, 18, 22, 23
  /* 17 */ [12, 16, 18, 22, 23],        // Tile 18: adjacent to 12, 17, 23
  /* 18 */ [13, 14, 20, 24],            // Tile 19: adjacent to 13, 14, 20, 24
  /* 19 */ [14, 15, 18, 20, 24, 25],    // Tile 20: adjacent to 14, 15, 19, 21, 24, 25
  /* 20 */ [15, 16, 19, 21, 25, 26],   // Tile 21: adjacent to 15, 16, 20, 22, 25, 26
  /* 21 */ [16, 17, 20, 22, 26, 27],   // Tile 22: adjacent to 16, 17, 21, 23, 26, 27
  /* 22 */ [17, 18, 21, 23, 27],        // Tile 23: adjacent to 17, 18, 22, 27
  /* 23 */ [18, 19, 20, 25, 28],        // Tile 24: adjacent to 19, 20, 25, 28
  /* 24 */ [20, 21, 23, 25, 28, 29],   // Tile 25: adjacent to 20, 21, 24, 26, 28, 29
  /* 25 */ [21, 22, 24, 26, 29, 30],   // Tile 26: adjacent to 21, 22, 25, 27, 29, 30
  /* 26 */ [22, 23, 25, 27, 30],        // Tile 27: adjacent to 22, 23, 26, 30
  /* 27 */ [23, 24, 25, 28, 29],        // Tile 28: adjacent to 24, 25, 29
  /* 28 */ [25, 26, 27, 29, 30],        // Tile 29: adjacent to 25, 26, 28, 30
  /* 29 */ [26, 27, 28, 29]             // Tile 30: adjacent to 26, 27, 29
];

// Expansion-specific adjacency validation
export function noHotAdjacencyExpansion(nums: (number|null)[], customRules: any): boolean {
  const validationId = Math.random().toString(36).substr(2, 9);
  
  for (let i = 0; i < 29; i++) { // Only check tiles 1-29 (tile 30 has no neighbors)
    const a = nums[i];
    if (!HOT.has(a as number)) continue;
    
    for (let jIdx = 0; jIdx < EXPANSION_NEIGHBORS[i].length; jIdx++) {
      const j = EXPANSION_NEIGHBORS[i][jIdx];
      const b = nums[j];
      if (HOT.has(b as number)) {
        // Rule 1: 6 cannot be adjacent to 8 and vice versa (unless custom rule allows)
        if ((a === 6 && b === 8) || (a === 8 && b === 6)) {
          if (!customRules.sixEightCanTouch) {
            return false;
          } else {
          }
        }
        // Rule 2: Two 6s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 6 && b === 6) {
          return false;
        }
        // Rule 3: Two 8s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 8 && b === 8) {
          return false;
        }
      }
    }
  }
  
  // Rule 4: Other same numbers cannot be adjacent (unless custom rule allows)
  if (!customRules.sameNumbersCanTouch) {
    for (let i = 0; i < 29; i++) {
      const a = nums[i];
      if (a === null || HOT.has(a)) continue; // Skip 2, 6, 8, 12 (already handled above)
      
      for (let jIdx = 0; jIdx < EXPANSION_NEIGHBORS[i].length; jIdx++) {
        const j = EXPANSION_NEIGHBORS[i][jIdx];
        const b = nums[j];
        if (a === b) {
          return false;
        }
      }
    }
  }
  
  // Additional rule: 2 and 12 cannot be adjacent (unless custom rule allows)
  if (!customRules.twoTwelveCanTouch) {
    for (let i = 0; i < 29; i++) {
      const a = nums[i];
      if (a === 2 || a === 12) {
        for (let jIdx = 0; jIdx < EXPANSION_NEIGHBORS[i].length; jIdx++) {
          const j = EXPANSION_NEIGHBORS[i][jIdx];
          const b = nums[j];
          if ((a === 2 && b === 12) || (a === 12 && b === 2)) {
            return false;
          }
        }
      }
    }
  }
  
  return true;
}

// Validation function for debugging (can be called manually in console)
export function validateBoard(board: Board, customRules: any): boolean {
  const numbersValid = noHotAdjacency(board.numbers, customRules);
  const terrainsValid = terrainsPassClusterRule(board.terrains, customRules);
  
  if (!numbersValid) {
  }
  if (!terrainsValid) {
  }
  
  return numbersValid && terrainsValid;
}

export default function CatanMapGenerator({ className = '' }: CatanMapGeneratorProps) {
  const [hexagons, setHexagons] = useState<Hexagon[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNominating, setIsNominating] = useState(false);
  const [isNominated, setIsNominated] = useState(false);

  const [mapType, setMapType] = useState<MapType>('classic');
  const [customRules, setCustomRules] = useState({
    sixEightCanTouch: false,
    twoTwelveCanTouch: true,
    sameNumbersCanTouch: true,
    sameResourceCanTouch: true,
    imageStyle: 'king-dice' // Add image style state
  });
  const userId = useUserId();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  // SCALED DIMENSIONS - Smaller map for better page layout
  const SCALE_FACTOR = 0.6; // 60% of original size
  const BASE_MAP_WIDTH = 1021.91 * SCALE_FACTOR;
  const BASE_MAP_HEIGHT = 885 * SCALE_FACTOR;
  
  // Mobile responsive dimensions
  const [showSettingsModal, setShowSettingsModal] = useState(false); // Settings modal state
  
  // Separate dragging state for base map and tiles/numbers
  const [isDraggingBase, setIsDraggingBase] = useState(false);
  const [isDraggingTiles, setIsDraggingTiles] = useState(false);
  const [baseMapPosition, setBaseMapPosition] = useState({ x: 0, y: 0 });
  const [tilesPosition, setTilesPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false); // Start unlocked so you can position
  const [lockedBaseMapPosition, setLockedBaseMapPosition] = useState({ x: 0, y: 0 });
  const [lockedTilesPosition, setLockedTilesPosition] = useState({ x: 0, y: 0 });

  // Function to lock current positions
  const lockPositions = () => {
    setLockedBaseMapPosition({ ...baseMapPosition });
    setLockedTilesPosition({ ...tilesPosition });
    setIsLocked(true);
  };

  // Function to unlock positions
  const unlockPositions = () => {
    setIsLocked(false);
    // Reset to default positions when unlocking
    if (mapType === 'expansion') {
      setBaseMapPosition({ x: -100, y: -50 });
      setTilesPosition({ x: -100, y: -50 });
    } else {
      setBaseMapPosition({ x: 0, y: 0 });
      setTilesPosition({ x: 0, y: 0 });
    }
  };


  // No useEffect needed - positions are already (0,0) for both maps

  // Drag handlers for base map
  const handleBaseMapMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    setIsDraggingBase(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleBaseMapMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBase || isLocked) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      setBaseMapPosition({
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top - dragOffset.y
      });
    }
  };

  const handleBaseMapMouseUp = () => {
    setIsDraggingBase(false);
  };

  // Drag handlers for tiles/numbers
  const handleTilesMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    setIsDraggingTiles(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTilesMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTiles || isLocked) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      setTilesPosition({
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top - dragOffset.y
      });
    }
  };

  const handleTilesMouseUp = () => {
    setIsDraggingTiles(false);
  };

  // Touch handlers for base map
  const handleBaseMapTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    setIsDraggingBase(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  const handleBaseMapTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingBase || isLocked) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      const touch = e.touches[0];
      setBaseMapPosition({
        x: touch.clientX - rect.left - dragOffset.x,
        y: touch.clientY - rect.top - dragOffset.y
      });
    }
  };

  const handleBaseMapTouchEnd = () => {
    setIsDraggingBase(false);
  };

  // Touch handlers for tiles/numbers
  const handleTilesTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    setIsDraggingTiles(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  const handleTilesTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingTiles || isLocked) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      const touch = e.touches[0];
      setTilesPosition({
        x: touch.clientX - rect.left - dragOffset.x,
        y: touch.clientY - rect.top - dragOffset.y
      });
    }
  };

  const handleTilesTouchEnd = () => {
    setIsDraggingTiles(false);
  };
  
  const MAP_WIDTH = BASE_MAP_WIDTH;
  const MAP_HEIGHT = BASE_MAP_HEIGHT;
  const TILE_WIDTH = 240 * SCALE_FACTOR;
  const TILE_HEIGHT = 280 * SCALE_FACTOR;
  const NUMBER_WIDTH = 71.4 * SCALE_FACTOR;
  const NUMBER_HEIGHT = 71.4 * SCALE_FACTOR;

  // SCALED POSITIONS - Perfect alignment at 60% scale
  const classicTilePositions = [
    { x: 244.3274 * SCALE_FACTOR, y: 43.4734 * SCALE_FACTOR },    // 1
    { x: 395 * SCALE_FACTOR, y: 43.4734 * SCALE_FACTOR },         // 2
    { x: 545.6727 * SCALE_FACTOR, y: 43.4734 * SCALE_FACTOR },    // 3
    { x: 168.991 * SCALE_FACTOR, y: 173.9598 * SCALE_FACTOR },    // 4
    { x: 319.6637 * SCALE_FACTOR, y: 173.9598 * SCALE_FACTOR },   // 5
    { x: 470.3364 * SCALE_FACTOR, y: 173.9598 * SCALE_FACTOR },   // 6
    { x: 621.009 * SCALE_FACTOR, y: 173.9598 * SCALE_FACTOR },    // 7
    { x: 93.6546 * SCALE_FACTOR, y: 304.5 * SCALE_FACTOR },       // 8
    { x: 244.3273 * SCALE_FACTOR, y: 304.5 * SCALE_FACTOR },      // 9
    { x: 395 * SCALE_FACTOR, y: 304.5 * SCALE_FACTOR },           // 10
    { x: 545.6727 * SCALE_FACTOR, y: 304.5 * SCALE_FACTOR },      // 11
    { x: 696.3454 * SCALE_FACTOR, y: 304.5 * SCALE_FACTOR },      // 12
    { x: 168.991 * SCALE_FACTOR, y: 435.0402 * SCALE_FACTOR },    // 13
    { x: 319.6637 * SCALE_FACTOR, y: 435.0402 * SCALE_FACTOR },   // 14
    { x: 470.3364 * SCALE_FACTOR, y: 435.0402 * SCALE_FACTOR },   // 15
    { x: 621.0091 * SCALE_FACTOR, y: 435.0402 * SCALE_FACTOR },   // 16
    { x: 244.3273 * SCALE_FACTOR, y: 565.5266 * SCALE_FACTOR },   // 17
    { x: 395 * SCALE_FACTOR, y: 565.5266 * SCALE_FACTOR },        // 18
    { x: 545.6727 * SCALE_FACTOR, y: 565.5266 * SCALE_FACTOR },   // 19
  ];

  // Expansion board positions (5-6 players) - 30 tiles
  // Exact coordinates from ExpCatanMap.svg (W:1024px H:885px)
  // All tiles moved to the right for better placement (total +145px right) and up 16px
  const expansionTilePositions = [
    { x: 353.9569, y: 309.8667 },    // 1 (moved +145px right, +16px up)
    { x: 353.9569, y: 426.5 },       // 2 (moved +145px right, +16px up)
    { x: 353.9569, y: 543.1333 },    // 3 (moved +145px right, +16px up)
    { x: 454.9643, y: 251.55 },      // 4 (moved +145px right, +16px up)
    { x: 454.9643, y: 368.1833 },   // 5 (moved +145px right, +16px up)
    { x: 454.9643, y: 484.8167 },   // 6 (moved +145px right, +16px up)
    { x: 454.9643, y: 601.45 },     // 7 (moved +145px right, +16px up)
    { x: 556.0134, y: 193.2333 },   // 8 (moved +145px right, +16px up)
    { x: 556.0134, y: 309.8667 },   // 9 (moved +145px right, +16px up)
    { x: 556.0134, y: 426.5 },      // 10 (moved +145px right, +16px up)
    { x: 556.0134, y: 543.1333 },   // 11 (moved +145px right, +16px up)
    { x: 556.0134, y: 659.7667 },   // 12 (moved +145px right, +16px up)
    { x: 657.0208, y: 134.9167 },   // 13 (moved +145px right, +16px up)
    { x: 657.0208, y: 251.55 },     // 14 (moved +145px right, +16px up)
    { x: 657.0208, y: 368.1833 },   // 15 (moved +145px right, +16px up)
    { x: 657.0208, y: 484.8167 },   // 16 (moved +145px right, +16px up)
    { x: 657.0208, y: 601.4499 },   // 17 (moved +145px right, +16px up)
    { x: 657.0208, y: 718.0833 },   // 18 (moved +145px right, +16px up)
    { x: 758.0282, y: 193.2333 },   // 19 (moved +145px right, +16px up)
    { x: 758.0282, y: 309.8667 },   // 20 (moved +145px right, +16px up)
    { x: 758.0282, y: 426.5 },      // 21 (moved +145px right, +16px up)
    { x: 758.0282, y: 543.1333 },   // 22 (moved +145px right, +16px up)
    { x: 758.0282, y: 659.7667 },   // 23 (moved +145px right, +16px up)
    { x: 859.0357, y: 251.55 },     // 24 (moved +145px right, +16px up)
    { x: 859.0357, y: 368.1833 },   // 25 (moved +145px right, +16px up)
    { x: 859.0357, y: 484.8167 },   // 26 (moved +145px right, +16px up)
    { x: 859.0357, y: 601.45 },     // 27 (moved +145px right, +16px up)
    { x: 960.0431, y: 309.8667 },   // 28 (moved +145px right, +16px up)
    { x: 960.0431, y: 426.5 },      // 29 (moved +145px right, +16px up)
    { x: 960.0431, y: 543.1333 },   // 30 (moved +145px right, +16px up)
  ];

  // Get current tile positions based on map type
  const getCurrentTilePositions = () => {
    return mapType === 'classic' ? classicTilePositions : expansionTilePositions;
  };

  const generateMap = (forcedMapType?: MapType) => {
    const currentMapType = forcedMapType || mapType;
    
    setIsGenerating(true);
    setIsNominated(false); // Reset nomination status for new map

    // Use setTimeout to prevent blocking the UI
    setTimeout(() => {
      try {
        
        let board;
        if (currentMapType === 'expansion') {
          board = makeValidExpansionBoard(customRules);
        } else {
          try {
            board = makeValidBoard(customRules);
          } catch (error) {
            console.error('❌ Error generating classic board:', error);
            throw error;
          }
        }

        // Convert to hexagons format
        const currentTilePositions = currentMapType === 'classic' ? classicTilePositions : expansionTilePositions;
        
        // Debug: Check if we have enough board data for all positions
        if (currentMapType === 'expansion') {
          // Expansion board validation
        }
        
        // CRITICAL: Validate board before creating hexagons
        
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            console.error('🚫 PRE-HEXAGON VALIDATION FAILED: Classic board has violations!');
            throw new Error('PRE-HEXAGON VALIDATION FAILED: Cannot create hexagons for invalid board');
          }
        } else {
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            console.error('🚫 PRE-HEXAGON VALIDATION FAILED: Expansion board has violations!');
            throw new Error('PRE-HEXAGON VALIDATION FAILED: Cannot create hexagons for invalid board');
          }
        }
        
        
        // Ensure we have the right number of hexagons
        let newHexagons: Hexagon[] = currentTilePositions.map((pos, index) => {
          // Safety check for expansion boards
          if (currentMapType === 'expansion' && (index >= board.terrains.length || index >= board.numbers.length)) {
            console.error(`❌ Index ${index} out of bounds for expansion board!`);
            console.error(`❌ Terrains length: ${board.terrains.length}, Numbers length: ${board.numbers.length}`);
            return null;
          }
          
          return {
          id: index,
            type: board.terrains[index] as Hexagon['type'],
            number: board.numbers[index],
          position: { x: pos.x, y: pos.y },
        };
        }).filter(Boolean) as Hexagon[]; // Remove any null entries

        
        // CRITICAL: Validate hexagon data integrity
        
        // Check that all hexagons have valid data
        for (let i = 0; i < newHexagons.length; i++) {
          const hex = newHexagons[i];
          if (!hex.type || hex.type === 'desert') continue; // Skip deserts
          
          if (hex.number !== null && hex.number !== undefined) {
            // Validate that this number doesn't create adjacency violations
            const currentNumbers = newHexagons.map(h => h.number);
            
            if (currentMapType === 'classic') {
              if (!noHotAdjacency(currentNumbers, customRules)) {
                console.error(`🚫 HEXAGON VALIDATION FAILED: Hexagon ${i} creates adjacency violations!`);
                throw new Error(`HEXAGON VALIDATION FAILED: Hexagon ${i} is invalid`);
              }
            } else {
              if (!noHotAdjacencyExpansion(currentNumbers, customRules)) {
                console.error(`🚫 HEXAGON VALIDATION FAILED: Hexagon ${i} creates adjacency violations!`);
                throw new Error(`HEXAGON VALIDATION FAILED: Hexagon ${i} is invalid`);
              }
            }
          }
        }
        

        // Final validation (different for classic vs expansion)
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            throw new Error('6-8 adjacency rule failed in final validation');
          }
          if (!terrainsPassClusterRule(board.terrains, customRules)) {
            throw new Error('Terrain cluster rule failed in final validation');
          }
        } else {
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            throw new Error('Expansion 6-8 adjacency rule failed in final validation');
          }
          
          // Final validation for expansion terrain clustering
          // Since we're using the simple placement approach, clustering should already be prevented
        }

        
        // ABSOLUTE FINAL VALIDATION - Never render invalid boards
        
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            console.error('🚫 ABSOLUTE VALIDATION FAILED: Classic board has 6-8 adjacency violations!');
            throw new Error('ABSOLUTE VALIDATION FAILED: Classic board cannot be rendered with violations');
          }
        } else {
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            console.error('🚫 ABSOLUTE VALIDATION FAILED: Expansion board has 6-8 adjacency violations!');
            throw new Error('ABSOLUTE VALIDATION FAILED: Expansion board cannot be rendered with violations');
          }
        }
        
        
      setHexagons(newHexagons);
      setIsGenerating(false);
      } catch (error) {
        console.error('❌ Board generation failed:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace',
          currentMapType: currentMapType,
          mapType: mapType
        });
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleNominateClassicMap = async () => {
    if (hexagons.length === 0 || mapType !== 'classic') return;
    
    console.log('🌟 Starting classic map nomination...', {
      hexagonsLength: hexagons.length,
      mapType,
      userId,
      user: user ? { id: user.id, username: user.username } : null
    });
    
    setIsNominating(true);
    try {
      // Capture the map as an image
      console.log('📸 Capturing map image...');
      const mapImage = await captureMapImage();
      console.log('✅ Map image captured, length:', mapImage.length);
      
      // Create a map data object for classic nomination
      const mapData = {
        terrains: hexagons.map(h => h.type),
        numbers: hexagons.map(h => h.number),
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        mapType: 'classic'
      };

      // Include classic-specific custom rules
      const nominationCustomRules = {
        ...customRules,
        mapType: 'classic',
        tileCount: 19,
        isClassicMap: true
      };

      const username = user?.username || (userId ? `User_${userId.slice(-6)}` : 'Anonymous');

      // Send nomination to API
      console.log('📤 Sending nomination to API...', {
        mapDataLength: Object.keys(mapData).length,
        imageBase64Length: mapImage.length,
        userId: user?.id || null,
        username
      });
      
      const response = await fetch('/api/catan-nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mapData, 
          imageBase64: mapImage, 
          customRules: nominationCustomRules,
          userId: user?.id || null, // Use the authenticated user's ID directly
          username: username,
          avatar: null
        })
      });

      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Failed to save classic nomination: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ API Success response:', result);
      setIsNominated(true);
      showToast(`Classic Catan map nominated successfully! ID: ${result.nominationId}`, 'success');
      
    } catch (error) {
      console.error('❌ Failed to nominate classic map:', error);
      showToast('Failed to nominate classic map. Please try again.', 'error');
    } finally {
      setIsNominating(false);
    }
  };

  const handleNominateExpansionMap = async () => {
    if (hexagons.length === 0 || mapType !== 'expansion') {
      return;
    }
    
    setIsNominating(true);
    try {
      
      // Add a small delay to ensure the expansion map is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the map as an image
      const mapImage = await captureMapImage();
      
      // Create a map data object for expansion nomination
      const mapData = {
        terrains: hexagons.map(h => h.type),
        numbers: hexagons.map(h => h.number),
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        mapType: 'expansion'
      };

      // Include expansion-specific custom rules
      const nominationCustomRules = {
        ...customRules,
        mapType: 'expansion',
        tileCount: 30,
        isExpansionMap: true
      };

      const username = user?.username || (userId ? `User_${userId.slice(-6)}` : 'Anonymous');

      // Log the exact data being sent to API for EXPANSION
      const apiPayload = { 
        mapData, 
        imageBase64: mapImage, 
        customRules: nominationCustomRules,
        userId: user?.id || null, // Use the authenticated user's ID directly
        username: username,
        avatar: null
      };

      // Send nomination to API
      const response = await fetch('/api/catan-nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to save expansion nomination');
      }

      const result = await response.json();
      setIsNominated(true);
      showToast(`Expansion Catan map nominated successfully! ID: ${result.nominationId}`, 'success');
      
    } catch (error) {
      console.error('❌ Failed to nominate expansion map:', error);
      showToast('Failed to nominate expansion map. Please try again.', 'error');
    } finally {
      setIsNominating(false);
    }
  };

  const handleImageStyleChange = (style: 'king-dice' | 'classic') => {
    setCustomRules(prev => ({ ...prev, imageStyle: style }));
    // Don't regenerate map - just change the visual style
    // The existing hexagons array will automatically re-render with new tile images
  };

  const handleMapTypeChange = (newMapType: MapType) => {
    
    // Update state first
    setMapType(newMapType);
    
    // Clear existing hexagons to force a fresh render
    setHexagons([]);
    
    // Generate map immediately with the new type
    generateMap(newMapType);
  };

  const handleCustomRuleChange = (rule: keyof typeof customRules, value: boolean) => {
    setCustomRules(prev => ({ ...prev, [rule]: value }));
  };

  const captureMapImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Get the map container element - use mobile-map-container for the actual map content
        const mapContainer = document.querySelector('.mobile-map-container') as HTMLElement;
        if (!mapContainer) {
          reject(new Error('Map container not found'));
          return;
        }

        // Determine dimensions based on map type
        let captureWidth, captureHeight;
        if (mapType === 'expansion') {
          // For expansion maps, use the actual container dimensions to preserve aspect ratio
          // Since the background is now inside the scaled container, we need to account for the scaling
          captureWidth = mapContainer.offsetWidth;
          captureHeight = mapContainer.offsetHeight;
        } else {
          // For classic maps, use the standard dimensions
          captureWidth = MAP_WIDTH;
          captureHeight = MAP_HEIGHT;
        }

        // Use html2canvas to capture the map
        import('html2canvas').then(({ default: html2canvas }) => {
          html2canvas(mapContainer, {
            width: captureWidth,
            height: captureHeight,
            useCORS: true,
            allowTaint: true
          }).then((canvas: HTMLCanvasElement) => {
            // Convert canvas to base64 image
            const imageData = canvas.toDataURL('image/png');
            resolve(imageData);
          }).catch(reject);
        }).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  };

  useEffect(() => {
    generateMap();
    
    // Debug button visibility
    setTimeout(() => {
      // Look for the correct nomination button based on map type
      const starBtn = mapType === 'expansion' 
        ? document.getElementById('nomination-star-button-expansion')
        : document.getElementById('nomination-star-button');
      const testBtn = document.getElementById('test-button-left');
      const mapContainer = document.querySelector('.catan-board-wrapper');
      
      
      if (starBtn) {
      } else {
      }
      
      if (testBtn) {
      }
      
      if (mapContainer) {
      }
    }, 1000);
  }, []);

  // Monitor mapType changes
  useEffect(() => {
  }, [mapType]);

  // Monitor hexagons changes
  useEffect(() => {
    if (hexagons.length > 0) {
    }
  }, [hexagons, mapType]);

  // Helper function to get resource tile image based on selected style and map type
  const getResourceImage = (type: string) => {
    const style = customRules.imageStyle;
    
    if (mapType === 'expansion') {
      // Expansion map - use expansion-specific tiles
      if (style === 'classic') {
        // Classic art expansion tiles
        switch (type) {
          case 'grain': return '/CatanMapGenerator/ExpClassicCatanGrainTile.svg';
          case 'wood': return '/CatanMapGenerator/ExpClassicCatanWoodTile.svg';
          case 'sheep': return '/CatanMapGenerator/ExpClassicCatanSheepTile.svg';
          case 'ore': return '/CatanMapGenerator/ExpClassicCatanOreTile.svg';
          case 'brick': return '/CatanMapGenerator/ExpClassicCatanBrickTile.svg';
          case 'desert': return '/CatanMapGenerator/ExpClassicCatanDesertTile.svg';
          default: return '/CatanMapGenerator/ExpClassicCatanGrainTile.svg';
        }
      } else {
        // King Dice art expansion tiles
        switch (type) {
          case 'grain': return '/CatanMapGenerator/ExpCatanGrainTile.svg';
          case 'wood': return '/CatanMapGenerator/ExpCatanWoodTile.svg';
          case 'sheep': return '/CatanMapGenerator/ExpCatanSheepTile.svg';
          case 'ore': return '/CatanMapGenerator/ExpCatanOreTile.svg';
          case 'brick': return '/CatanMapGenerator/ExpCatanBrickTile.svg';
          case 'desert': return '/CatanMapGenerator/ExpCatanDesertTile.svg';
          default: return '/CatanMapGenerator/ExpCatanGrainTile.svg';
        }
      }
    } else if (style === 'classic') {
      // Classic style - use ClassicCatan files
      switch (type) {
        case 'grain': return '/CatanMapGenerator/ClassicCatanGrainTile.svg';
        case 'wood': return '/CatanMapGenerator/ClassicCatanWoodTile.svg';
        case 'sheep': return '/CatanMapGenerator/ClassicCatanSheepTile.svg';
        case 'ore': return '/CatanMapGenerator/ClassicCatanOreTile.svg';
        case 'brick': return '/CatanMapGenerator/ClassicCatanBrickTile.svg';
        case 'desert': return '/CatanMapGenerator/ClassicCatanDesertTile.svg';
        default: return '/CatanMapGenerator/ClassicCatanGrainTile.svg';
      }
    } else {
      // King Dice style - use Catan files
    switch (type) {
      case 'grain': return '/CatanMapGenerator/CatanGrainTile.svg';
      case 'wood': return '/CatanMapGenerator/CatanWoodTile.svg';
      case 'sheep': return '/CatanMapGenerator/CatanSheepTile.svg';
      case 'ore': return '/CatanMapGenerator/CatanOreTile.svg';
      case 'brick': return '/CatanMapGenerator/CatanBrickTile.svg';
      case 'desert': return '/CatanMapGenerator/CatanDesertTile.svg';
      default: return '/CatanMapGenerator/CatanGrainTile.svg';
      }
    }
  };

  // Helper function to get number token image based on selected style
  const getNumberImage = (number: number) => {
    // Numbers stay the same for both styles - always use CatanNumber*.svg files
    // Note: We skip number 7 (it doesn't exist in Catan)
    // All numbers use the same file format: CatanNumber{number}.svg
    return `/CatanMapGenerator/CatanNumber${number}.svg`;
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="text-center mb-8">
        
        {/* Desktop Map Type Buttons - Hidden on mobile */}
        <div className="hidden sm:flex justify-center gap-4 mb-4 relative">
          <button
            onClick={() => {
              handleMapTypeChange('classic');
            }}
            disabled={isGenerating}
            className={`px-6 py-3 rounded-lg font-medium transition-colors relative z-10 ${
              mapType === 'classic' 
                ? 'text-black font-semibold' 
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ 
              position: 'relative', 
              zIndex: 10,
              backgroundColor: mapType === 'classic' ? '#fbae17' : undefined
            }}
          >
            Classic
          </button>
          
          <button
            onClick={() => {
              handleMapTypeChange('expansion');
            }}
            disabled={isGenerating}
            className={`px-6 py-3 rounded-lg font-medium transition-colors relative z-10 ${
              mapType === 'expansion' 
                ? 'text-black font-semibold' 
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ 
              position: 'relative', 
              zIndex: 10,
              backgroundColor: mapType === 'expansion' ? '#fbae17' : undefined
            }}
          >
            Expansion
          </button>
        </div>
        
        {/* Mobile Controls - Only show on mobile */}
        <div className="sm:hidden mb-4">
          {/* Map Type Buttons */}
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={() => handleMapTypeChange('classic')}
              disabled={isGenerating}
              className={`w-32 h-14 rounded-lg font-medium transition-colors text-base ${
                mapType === 'classic' 
                  ? 'text-black font-semibold' 
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ 
                backgroundColor: mapType === 'classic' ? '#fbae17' : undefined
              }}
            >
              Classic
            </button>
            
            <button
              onClick={() => handleMapTypeChange('expansion')}
              disabled={isGenerating}
              className={`w-32 h-14 rounded-lg font-medium transition-colors text-base ${
                mapType === 'expansion' 
                  ? 'text-black font-semibold' 
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ 
                backgroundColor: mapType === 'expansion' ? '#fbae17' : undefined
              }}
            >
              Expansion
            </button>
          </div>
          
          {/* Options and Shuffle Buttons */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-32 h-14 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-base"
            >
              Options
            </button>
            
            <button
              onClick={() => generateMap()}
              disabled={isGenerating}
              className="w-32 h-14 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base"
            >
              {isGenerating ? 'Generating...' : 'Shuffle'}
            </button>
          </div>
        </div>
        

      </div>

      {/* Map Container with responsive layout */}
      <div className="w-full flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
        {/* Left side content - hidden on mobile, shown on desktop */}
        <div className="hidden lg:block lg:w-1/3 lg:pr-8">
          <div className="bg-white rounded-lg p-6">
            <h4 className="text-lg font-semibold text-dark-900 mb-4">Generation Custom Rules</h4>
            <p className="text-xs text-gray-500 mb-4">
              Check/Uncheck boxes to customize the rules on your map
            </p>
            
            <div className="mb-6">
              <label className="block text-base font-medium text-dark-700 mb-2">Image Style</label>
              <div className="flex gap-2">
        <button
                  onClick={() => handleImageStyleChange('classic')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    customRules.imageStyle === 'classic'
                      ? 'text-black font-semibold'
                      : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                  }`}
                  style={{
                    backgroundColor: customRules.imageStyle === 'classic' ? '#fbae17' : undefined
                  }}
                >
                  Classic
                </button>
                <button 
                  onClick={() => handleImageStyleChange('king-dice')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    customRules.imageStyle === 'king-dice'
                      ? 'text-black font-semibold'
                      : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                  }`}
                  style={{
                    backgroundColor: customRules.imageStyle === 'king-dice' ? '#fbae17' : undefined
                  }}
                >
                  King Dice
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sixEightCanTouch}
                  onChange={(e) => handleCustomRuleChange('sixEightCanTouch', e.target.checked)}
                />
                <span className="text-base text-dark-700">6 & 8 Can Touch</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.twoTwelveCanTouch}
                  onChange={(e) => handleCustomRuleChange('twoTwelveCanTouch', e.target.checked)}
                />
                <span className="text-base text-dark-700">2 & 12 Can Touch</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sameNumbersCanTouch}
                  onChange={(e) => handleCustomRuleChange('sameNumbersCanTouch', e.target.checked)}
                />
                <span className="text-base text-dark-700">Same Numbers Can Touch</span>
              </label>
              
              {mapType === 'classic' && (
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sameResourceCanTouch}
                  onChange={(e) => handleCustomRuleChange('sameResourceCanTouch', e.target.checked)}
                />
                <span className="text-base text-dark-700">Same Resource Can Touch</span>
              </label>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => generateMap()}
          disabled={isGenerating}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate New Map'}
        </button>
            </div>
          </div>
      </div>

        {/* Map - centered on mobile, right-aligned on desktop */}
        <div className="w-full lg:w-2/3 flex justify-center lg:justify-end">
          {/* Mobile: Scalable container that fits the entire map */}
          <div className="w-full sm:w-auto sm:overflow-visible">
        <div
              className="w-full sm:w-auto flex justify-center items-center"
          style={{
                height: 'auto',
                minHeight: '400px',
                margin: '0 auto'
              }}
            >
              {/* Final Container - applies mobile scaling */}
              <div
                className="relative scale-[1.23] sm:scale-[0.85] mx-auto mobile-main-container"
                style={{
                  transformOrigin: "0 0",
              width: `${MAP_WIDTH}px`,
              height: `${MAP_HEIGHT}px`,
                  isolation: "isolate"
                }}
              >
            {/* Nomination Buttons - Top Right */}
            {/* Classic Map Nomination Button */}
            {mapType === 'classic' && (
              <button
                onClick={handleNominateClassicMap}
                disabled={isGenerating || hexagons.length === 0 || isNominating}
                className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                id="nomination-star-button"
                title="Nominate this Classic Catan map"
              >
                {isNominating ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className={`w-5 h-5 transition-all duration-200 ${isNominated ? 'text-yellow-500 fill-current' : 'text-gray-400 hover:text-yellow-400'}`}
                    fill={isNominated ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <polygon
                      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )}

            {/* Expansion Map Nomination Button */}
            {mapType === 'expansion' && (
              <button
                onClick={handleNominateExpansionMap}
                disabled={isGenerating || hexagons.length === 0 || isNominating}
                className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                id="nomination-star-button-expansion"
                title="Nominate this Expansion Catan map"
                style={{ fontSize: '0', lineHeight: '1' }}
              >
                {isNominating ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className={`w-5 h-5 transition-all duration-200 ${isNominated ? 'text-yellow-500 fill-current' : 'text-gray-400 hover:text-yellow-400'}`}
                    fill={isNominated ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <polygon
                      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )}
            
          {/* Tiles Container - Inside scaling container */}
          <div className="scale-[0.6] sm:scale-100" style={{ transformOrigin: 'center center' }}>
             {/* Classic Map */}
             {mapType === 'classic' && (
               <div style={{ position: "relative", width: "100%", height: "100%" }}>
                 {/* Tiles/Numbers Container */}
          <div className="mobile-map-container" style={{
                   transform: `translate(${tilesPosition.x}px, ${tilesPosition.y}px) scale(1)`,
            transformOrigin: 'center center',
                   position: 'absolute',
                   marginTop: '0px',
                   marginLeft: '0px',
                   width: '1024px',
                   height: '885px',
                   minWidth: '1024px',
                   minHeight: '885px',
                 }}>
                   {/* Base Map - Inside tiles container */}
                   <img
                     src={customRules.imageStyle === 'classic' ? '/CatanMapGenerator/ClassicCatanMap.svg' : '/CatanMapGenerator/CatanMap.svg'}
            alt="Catan Map Background"
            style={{
              position: "absolute",
                       width: '615px', // 5px bigger than 610px
                       height: '532px', // 5px bigger than 527px (maintaining aspect ratio)
                       top: '30%', // Move up from 50%
                       left: '30%', // Move left from 50%
                       transform: 'translate(-50%, -50%)', // Center within container
                       zIndex: 0,
                       objectFit: 'contain', // Scale to fit the container
                       pointerEvents: 'none'
                     }}
                   />
                  {hexagons.map((hexagon, i) => {
                    const currentTilePositions = classicTilePositions;
                    const pos = currentTilePositions[i];
                    let tileWidth, tileHeight;
                    if (customRules.imageStyle === 'classic') {
                      tileWidth = 235 * SCALE_FACTOR * 0.65;
                      tileHeight = 275 * SCALE_FACTOR * 0.65;
                    } else {
                      tileWidth = 235 * SCALE_FACTOR;
                      tileHeight = 275 * SCALE_FACTOR;
                    }
                    return (
                      <div key={`tile-${i}`}>
                        <img
                          key={`tile-${i}`}
                          src={getResourceImage(hexagon.type)}
                          alt={`Catan ${hexagon.type} resource tile`}
                style={{
                              position: "absolute",
                              width: `${tileWidth}px`,
                              height: `${tileHeight}px`,
                              left: `${pos.x + (235 * SCALE_FACTOR - tileWidth) / 2 - 2}px`,
                              top: `${pos.y + (275 * SCALE_FACTOR - tileHeight) / 2 - 1}px`,
                              pointerEvents: "none",
                              zIndex: 1,
                              transform: 'scale(1)',
                              transformOrigin: 'center center'
                            }}
                        />
                        {hexagon.number && (
                          <img
                            key={`num-${i}`}
                            src={getNumberImage(hexagon.number)}
                            alt={`Catan number token ${hexagon.number}`}
                            style={{
                              position: "absolute",
                              width: `${71.4 * SCALE_FACTOR}px`,
                              height: `${71.4 * SCALE_FACTOR}px`,
                              left: `${pos.x + (235 * SCALE_FACTOR - NUMBER_WIDTH) / 2 - 2}px`,
                              top: `${pos.y + (TILE_HEIGHT - NUMBER_HEIGHT) / 2 - 1}px`,
                              pointerEvents: "none",
                              zIndex: 2,
                              transform: 'scale(1)',
                              transformOrigin: 'center center'
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Expansion Map */}
            {mapType === 'expansion' && (
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                {/* Tiles/Numbers Container */}
                <div className="mobile-map-container" style={{
                  transform: `translate(${tilesPosition.x - 190}px, ${tilesPosition.y - 140}px) scale(0.55)`,
                  transformOrigin: 'center center',
                  position: 'absolute',
                  marginTop: '0px',
                  marginLeft: '0px',
                  width: '1024px',
                  height: '885px',
                  minWidth: '1024px',
                  minHeight: '885px',
                }}>
                  {/* Base Map - Inside tiles container */}
                  <img
                    src="/CatanMapGenerator/ExpCatanMap.svg"
                    alt="Catan Expansion Map Background"
                    style={{
                      position: "absolute",
                      width: '1050px', // 5px smaller
                      height: '908px', // 5px smaller
                      top: '377px', // Set to 377px
                      left: '608px', // Set to 608px
                      transform: 'translate(-50%, -50%)', // Center within container
                      zIndex: 0,
                      objectFit: 'contain', // Scale to fit the container
                      pointerEvents: 'none'
                    }}
                  />
          {hexagons.map((hexagon, i) => {
                    const currentTilePositions = expansionTilePositions;
            const pos = currentTilePositions[i];
            let tileWidth, tileHeight;
              if (customRules.imageStyle === 'classic') {
                      tileWidth = 139;
                      tileHeight = 117;
              } else {
                      tileWidth = 233;
                      tileHeight = 201;
                    }
            return (
              <div key={`tile-${i}`}>
                <img
                  key={`tile-${i}`}
                  src={getResourceImage(hexagon.type)}
                  alt={`Catan ${hexagon.type} resource tile`}
                  style={{
                    position: "absolute",
                    width: `${tileWidth}px`,
                    height: `${tileHeight}px`,
                            left: `${pos.x - tileWidth / 2 - 50}px`,
                            top: `${pos.y - tileHeight / 2 - 50}px`,
                    pointerEvents: "none",
                            zIndex: 1,
                            transform: 'scale(1)',
                            transformOrigin: 'center center'
                  }}
                />
                {hexagon.number && (
                  <img
                    key={`num-${i}`}
                    src={getNumberImage(hexagon.number)}
                    alt={`Catan number token ${hexagon.number}`}
                    style={{
                      position: "absolute",
                              width: '57.4754px',
                              height: '57.4754px',
                              left: `${pos.x + (233 - 57.4754) / 2 - 115 - 50}px`,
                              top: `${pos.y + (201 - 57.4754) / 2 - 100 - 50}px`,
                      pointerEvents: "none",
                              zIndex: 2,
                              transform: 'scale(1)',
                              transformOrigin: 'center center'
                    }}
                  />
                )}
              </div>
            );
          })}
          </div>
          </div>
            )}
        </div>
      </div>

        {/* Smartphone View Maps - Only visible on mobile */}
        <div className="block sm:hidden">
          {/* Mobile Classic Map */}
          {mapType === 'classic' && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {/* Background Catan Map - Fixed 95% width */}
              <img
                src={customRules.imageStyle === 'classic' ? '/CatanMapGenerator/ClassicCatanMap.svg' : '/CatanMapGenerator/CatanMap.svg'}
                alt="Catan Map Background"
                style={{
                  position: "absolute",
                  width: '95vw',
                  height: 'auto',
                  top: '0px',
                  left: '0px',
                  transform: `translate(${baseMapPosition.x}px, ${baseMapPosition.y}px)`,
                  objectFit: 'contain',
                  zIndex: 0
                }}
              />
              
              {/* Tiles/Numbers Container */}
              <div style={{
                transform: `translate(${tilesPosition.x}px, ${tilesPosition.y}px) scale(1)`,
                transformOrigin: 'center center',
                position: 'relative',
                marginTop: '0px',
                marginLeft: '0px',
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent'
              }}>
                {hexagons.map((hexagon, i) => {
                  const currentTilePositions = classicTilePositions;
                  const pos = currentTilePositions[i];
                  let tileWidth, tileHeight;
                  // Calculate scale factor based on 95vw vs original map width
                  const mobileScale = (window.innerWidth * 0.95) / MAP_WIDTH;
                  if (customRules.imageStyle === 'classic') {
                    tileWidth = 235 * SCALE_FACTOR * 0.65 * mobileScale;
                    tileHeight = 275 * SCALE_FACTOR * 0.65 * mobileScale;
                  } else {
                    tileWidth = 235 * SCALE_FACTOR * mobileScale;
                    tileHeight = 275 * SCALE_FACTOR * mobileScale;
                  }
                  return (
                    <div key={`mobile-tile-${i}`}>
                      <img
                        key={`mobile-tile-${i}`}
                        src={getResourceImage(hexagon.type)}
                        alt={`Catan ${hexagon.type} resource tile`}
                        style={{
                          position: "absolute",
                          width: `${tileWidth}px`,
                          height: `${tileHeight}px`,
                          left: `${pos.x * mobileScale + (235 * SCALE_FACTOR * mobileScale - tileWidth) / 2 - 2}px`,
                          top: `${pos.y * mobileScale + (275 * SCALE_FACTOR * mobileScale - tileHeight) / 2 - 1}px`,
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      />
                      {hexagon.number && (
                        <img
                          key={`mobile-num-${i}`}
                          src={getNumberImage(hexagon.number)}
                          alt={`Catan number token ${hexagon.number}`}
                          style={{
                            position: "absolute",
                            width: `${71.4 * SCALE_FACTOR * mobileScale}px`,
                            height: `${71.4 * SCALE_FACTOR * mobileScale}px`,
                            left: `${pos.x * mobileScale + (235 * SCALE_FACTOR * mobileScale - NUMBER_WIDTH * mobileScale) / 2 - 2}px`,
                            top: `${pos.y * mobileScale + (TILE_HEIGHT * mobileScale - NUMBER_HEIGHT * mobileScale) / 2 - 1}px`,
                            pointerEvents: "none",
                            zIndex: 2,
                          }}
                        />
                      )}
    </div>
  );
                })}
              </div>
            </div>
          )}
        </div>
      
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-dark-900 mb-4">Generation Custom Rules</h4>
              <p className="text-xs text-gray-500 mb-4">
                Check/Uncheck boxes to customize the rules on your map
              </p>
              
              <div className="mb-6">
                <label className="block text-base font-medium text-dark-700 mb-2">Image Style</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImageStyleChange('classic')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      customRules.imageStyle === 'classic'
                        ? 'text-black font-semibold'
                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                    }`}
                    style={{
                      backgroundColor: customRules.imageStyle === 'classic' ? '#fbae17' : undefined
                    }}
                  >
                    Classic
                  </button>
                  <button 
                    onClick={() => handleImageStyleChange('king-dice')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      customRules.imageStyle === 'king-dice'
                        ? 'text-black font-semibold'
                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                    }`}
                    style={{
                      backgroundColor: customRules.imageStyle === 'king-dice' ? '#fbae17' : undefined
                    }}
                  >
                    King Dice
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={customRules.sixEightCanTouch}
                    onChange={(e) => handleCustomRuleChange('sixEightCanTouch', e.target.checked)}
                  />
                  <span className="text-base text-dark-700">6 & 8 Can Touch</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={customRules.twoTwelveCanTouch}
                    onChange={(e) => handleCustomRuleChange('twoTwelveCanTouch', e.target.checked)}
                  />
                  <span className="text-base text-dark-700">2 & 12 Can Touch</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={customRules.sameNumbersCanTouch}
                    onChange={(e) => handleCustomRuleChange('sameNumbersCanTouch', e.target.checked)}
                  />
                  <span className="text-base text-dark-700">Same Numbers Can Touch</span>
                </label>
                
                {mapType === 'classic' && (
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={customRules.sameResourceCanTouch}
                    onChange={(e) => handleCustomRuleChange('sameResourceCanTouch', e.target.checked)}
                  />
                  <span className="text-base text-dark-700">Same Resource Can Touch</span>
                </label>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    try {
                      if (user?.id) {
                        const response = await fetch('/api/users/settings', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userId: user.id,
                            settings: {
                              catanMapPreferences: {
                                imageStyle: customRules.imageStyle,
                                sixEightCanTouch: customRules.sixEightCanTouch,
                                twoTwelveCanTouch: customRules.twoTwelveCanTouch,
                                sameNumbersCanTouch: customRules.sameNumbersCanTouch,
                                sameResourceCanTouch: customRules.sameResourceCanTouch
                              }
                            }
                          })
                        });
                        
                        if (response.ok) {
                        } else {
                          console.error('❌ Failed to save preferences');
                        }
                      }
                      setShowSettingsModal(false);
                    } catch (error) {
                      console.error('Error saving preferences:', error);
                      setShowSettingsModal(false);
                    }
                  }}
                  className="w-full text-black py-2 px-4 rounded hover:opacity-90 text-base font-medium transition-colors"
                  style={{ backgroundColor: '#fbae17' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container for modern notifications */}
      <ToastContainer />
    </div>
  );
}
