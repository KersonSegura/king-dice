'use client';

import { useState, useEffect } from 'react';
import { useUserId } from '@/hooks/useUserId';
import { useAuth } from '@/contexts/AuthContext';
import ModernTooltip from './ModernTooltip';
import { useToast } from './Toast';
import { useTranslations } from 'next-intl';

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
  // Increase tries significantly and keep retrying until we find valid terrains
  for (let tries=0; tries<MAX_TERRAIN_TRIES * 5; tries++){
    shuffleInPlace(pool);
    if (terrainsPassClusterRule(pool, customRules)) return [...pool];
  }
  // If we still can't find valid terrains after many tries, throw error instead of returning invalid
  console.error('❌ Failed to generate valid terrains after', MAX_TERRAIN_TRIES * 5, 'attempts');
  throw new Error('Failed to generate valid terrains that satisfy clustering rules');
}

// ---------- MAIN: build board without rendering invalid states ----------
export function makeValidBoard(customRules: any): Board {
  const MAX_ATTEMPTS = 100;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let terrains = generateValidTerrains(customRules);
    
    // BRUTE FORCE: Check for cluster violations and try to repair
    console.log(`🔍 CLASSIC BOARD VALIDATION (Attempt ${attempt + 1}): Checking terrain clusters...`);
    let foundClusterViolation = false;
    
    // Check each tile for cluster violations
    for (let i = 0; i < 19; i++) {
      if (terrains[i] === 'desert') continue;
      
      const neighbors = NEIGHBORS[i] || [];
      let sameTypeCount = 0;
      for (const neighbor of neighbors) {
        if (terrains[neighbor] === terrains[i]) {
          sameTypeCount++;
        }
      }
      
      // If this tile has 2+ neighbors of same type, check if they form a chain
      if (sameTypeCount >= 2) {
        // Check if neighbors are also connected (forming a chain of 3+)
        for (let j = 0; j < neighbors.length; j++) {
          for (let k = j + 1; k < neighbors.length; k++) {
            const neighbor1 = neighbors[j];
            const neighbor2 = neighbors[k];
            if (terrains[neighbor1] === terrains[i] && terrains[neighbor2] === terrains[i]) {
              // Check if neighbor1 and neighbor2 are adjacent
              if (NEIGHBORS[neighbor1]?.includes(neighbor2)) {
                // Found a chain of 3+ - try to repair
                console.error(`❌❌❌ VIOLATION: Found cluster of ${terrains[i]} tiles at positions ${i}, ${neighbor1}, ${neighbor2}`);
                foundClusterViolation = true;
                
                // Try to repair by swapping one tile
                const repaired = repairClassicClustering(terrains, i, customRules);
                if (repaired) {
                  terrains = repaired;
                  console.log('✅ Repaired cluster violation by swapping tiles');
                  foundClusterViolation = false; // Retry validation with repaired board
                  break;
                } else {
                  // Repair failed, retry entire board
                  console.error('❌ Could not repair cluster - retrying entire board');
                  break;
                }
              }
            }
          }
          if (foundClusterViolation) break;
        }
        if (foundClusterViolation && !repairClassicClustering(terrains, i, customRules)) break;
      }
    }
    
    // Final validation using the cluster rule function
    if (!terrainsPassClusterRule(terrains, customRules) || foundClusterViolation) {
      console.warn(`⚠️ Classic board has cluster violations - retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      continue; // Retry
    }
    
    const desertIdx = terrains.indexOf("desert");
    const numbers = generateValidNumbers(desertIdx, customRules);
    
    // BRUTE FORCE: Check number adjacencies
    console.log('🔍 CLASSIC BOARD VALIDATION: Checking number adjacencies...');
    let foundAdjacencyViolation = false;
    for (let i = 0; i < 19; i++) {
      const numA = numbers[i];
      if (numA === null) continue;
      
      const neighbors = NEIGHBORS[i] || [];
      for (const neighbor of neighbors) {
        const numB = numbers[neighbor];
        if (numB === null) continue;
        
        // Check 6-6 adjacency (ALWAYS forbidden)
        if (numA === 6 && numB === 6) {
          console.error(`❌❌❌ VIOLATION: Two 6s adjacent at positions ${i} and ${neighbor}`);
          foundAdjacencyViolation = true;
        }
        
        // Check 8-8 adjacency (ALWAYS forbidden)
        if (numA === 8 && numB === 8) {
          console.error(`❌❌❌ VIOLATION: Two 8s adjacent at positions ${i} and ${neighbor}`);
          foundAdjacencyViolation = true;
        }
        
        // Check 6-8 adjacency (if rule enforced)
        if (!customRules.sixEightCanTouch) {
          if ((numA === 6 && numB === 8) || (numA === 8 && numB === 6)) {
            console.error(`❌❌❌ VIOLATION: 6-8 adjacency at positions ${i} (${numA}) and ${neighbor} (${numB})`);
            foundAdjacencyViolation = true;
          }
        }
      }
    }
    
    // CRITICAL: Final validation before returning
    if (!noHotAdjacency(numbers, customRules) || foundAdjacencyViolation) {
      console.warn(`⚠️ Classic board has adjacency violations - retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      continue; // Retry
    }
    
    console.log('✅✅✅ VALID CLASSIC BOARD FOUND!');
    return { terrains, numbers };
  }
  
  // If all attempts failed, throw error
  console.error('❌❌❌ CRITICAL: Could not generate valid classic board after ' + MAX_ATTEMPTS + ' attempts');
  throw new Error('Failed to generate valid classic board - too many violations');
}

// Repair classic map clustering by swapping tiles
function repairClassicClustering(terrains: Terrain[], violationPos: number, customRules: any): Terrain[] | null {
  const resourceTypes: Terrain[] = ['grain', 'wood', 'sheep', 'brick', 'ore'];
  const currentResource = terrains[violationPos];
  if (currentResource === 'desert') return null;
  
  // Try swapping with each other resource type
  for (const swapResource of resourceTypes) {
    if (swapResource === currentResource) continue;
    
    // Find positions with the swap resource
    for (let swapPos = 0; swapPos < 19; swapPos++) {
      if (terrains[swapPos] !== swapResource) continue;
      if (swapPos === violationPos) continue;
      
      // Try the swap
      const testTerrains = [...terrains];
      testTerrains[violationPos] = swapResource;
      testTerrains[swapPos] = currentResource;
      
      // Check if this fixes the violation
      if (terrainsPassClusterRule(testTerrains, customRules)) {
        console.log(`✅ Repair successful: Swapped position ${violationPos} (${currentResource}) with position ${swapPos} (${swapResource})`);
        return testTerrains;
      }
    }
  }
  
  return null; // Could not repair
}

// Expansion board generation (5-6 players) - Improved step-by-step logic
export function makeValidExpansionBoard(customRules: any): Board {
  
  const MAX_BOARD_GENERATION_ATTEMPTS = 200; // Significantly increased attempts for strict rule enforcement
  
  // Try multiple times to generate a valid board - NEVER return invalid board
  for (let boardAttempt = 0; boardAttempt < MAX_BOARD_GENERATION_ATTEMPTS; boardAttempt++) {
    
    // Step 1: Place Deserts First
    const desertPositions = placeDesertsRandomly();
    
    // Step 2: Place Resource Tiles with strict validation
    let terrains = placeResourceTiles(desertPositions);
    
    // STRICT: Validate terrain clustering - MUST pass or retry entire board
    if (!terrainsPassClusterRule(terrains, customRules)) {
      continue; // Retry from beginning - NO logging to avoid spam
    }
    
    // STRICT: Additional check: ensure no 3+ tiles in a line - MUST pass
    if (hasAnyClustering(terrains)) {
      continue; // Retry from beginning - NO logging to avoid spam
    }
    
    // Step 3: Place Number Tokens - ALWAYS use smart placement if 6-8 cannot touch
    // This ensures 6 & 8 are NEVER adjacent when the rule is enforced
    let numbers: (number | null)[] | null = null;
    
    // Try multiple times to place numbers correctly
    const MAX_NUMBER_PLACEMENT_ATTEMPTS = 100;
    for (let numAttempt = 0; numAttempt < MAX_NUMBER_PLACEMENT_ATTEMPTS; numAttempt++) {
      const candidateNumbers = placeNumberTokens(desertPositions, customRules);
      
      // STRICT: Validate number distribution - MUST match exactly
      if (!candidateNumbers || !validateNumberDistribution(candidateNumbers)) {
        continue; // Try again
      }
      
      // STRICT: Validate adjacency rules - MUST pass or retry
      if (!noHotAdjacencyExpansion(candidateNumbers, customRules)) {
        continue; // Try again
      }
      
      // STRICT: Additional check for 6-8 adjacency if rule is enforced
      if (!customRules.sixEightCanTouch) {
        let has6_8Adjacency = false;
        for (let i = 0; i < 30; i++) {
          if (candidateNumbers[i] === 6 || candidateNumbers[i] === 8) {
            const neighbors = EXPANSION_NEIGHBORS[i] || [];
            for (const neighbor of neighbors) {
              if ((candidateNumbers[i] === 6 && candidateNumbers[neighbor] === 8) || 
                  (candidateNumbers[i] === 8 && candidateNumbers[neighbor] === 6)) {
                has6_8Adjacency = true;
                break;
              }
            }
            if (has6_8Adjacency) break;
          }
        }
        if (has6_8Adjacency) {
          continue; // Found 6-8 adjacency, retry
        }
      }
      
      // If we get here, numbers are valid!
      numbers = candidateNumbers;
      break;
    }
    
    // If numbers are still invalid after all attempts, retry entire board
    if (!numbers || !validateNumberDistribution(numbers) || !noHotAdjacencyExpansion(numbers, customRules)) {
      continue; // Retry entire board
    }
    
    // Final strict check for 6-8 adjacency
    if (!customRules.sixEightCanTouch) {
      let has6_8Adjacency = false;
      for (let i = 0; i < 30; i++) {
        if (numbers[i] === 6 || numbers[i] === 8) {
          const neighbors = EXPANSION_NEIGHBORS[i] || [];
          for (const neighbor of neighbors) {
            if ((numbers[i] === 6 && numbers[neighbor] === 8) || 
                (numbers[i] === 8 && numbers[neighbor] === 6)) {
              has6_8Adjacency = true;
              break;
            }
          }
          if (has6_8Adjacency) break;
        }
      }
      if (has6_8Adjacency) {
        continue; // Found 6-8 adjacency, retry entire board
      }
    }
    
    // Final STRICT validation checks - ALL must pass
    const hasValidDistribution = validateNumberDistribution(numbers);
    let hasValidAdjacency = noHotAdjacencyExpansion(numbers, customRules);
    let hasValidTerrains = terrainsPassClusterRule(terrains, customRules) && !hasAnyClustering(terrains);
    
    // CRITICAL: Log validation results ALWAYS
    console.log(`🔍 EXPANSION BOARD VALIDATION (Attempt ${boardAttempt + 1}):`, {
      hasValidDistribution,
      hasValidAdjacency,
      hasValidTerrains,
      sixEightCanTouch: customRules.sixEightCanTouch
    });
    
    // BRUTE FORCE: Manual check for ALL adjacency violations - check EVERY position and EVERY neighbor
    let foundAdjacencyViolation = false;
    console.log('🔍 BRUTE FORCE CHECK: Checking ALL adjacencies...');
    for (let i = 0; i < 30; i++) {
      const numA = numbers[i];
      if (numA === null) continue;
      
      const neighbors = EXPANSION_NEIGHBORS[i] || [];
      for (const neighbor of neighbors) {
        const numB = numbers[neighbor];
        if (numB === null) continue;
        
        // Check 6-6 adjacency (ALWAYS forbidden)
        if (numA === 6 && numB === 6) {
          console.error(`❌❌❌ VIOLATION: Two 6s adjacent at positions ${i} and ${neighbor}`);
          foundAdjacencyViolation = true;
        }
        
        // Check 8-8 adjacency (ALWAYS forbidden)
        if (numA === 8 && numB === 8) {
          console.error(`❌❌❌ VIOLATION: Two 8s adjacent at positions ${i} and ${neighbor}`);
          foundAdjacencyViolation = true;
        }
        
        // Check 6-8 adjacency (if rule enforced)
        if (!customRules.sixEightCanTouch) {
          if ((numA === 6 && numB === 8) || (numA === 8 && numB === 6)) {
            // Check if this is one of the known problematic pairs
            const isProblematicPair = (i === 3 && neighbor === 8) || (i === 8 && neighbor === 3) || // Tiles 4-9
                                     (i === 7 && neighbor === 13) || (i === 13 && neighbor === 7) || // Tiles 8-14
                                     (i === 26 && neighbor === 29) || (i === 29 && neighbor === 26); // Tiles 27-30
            
            if (isProblematicPair) {
              console.error(`❌❌❌ CRITICAL VIOLATION: 6-8 adjacency at PROBLEMATIC PAIR positions ${i} (tile ${i + 1}, ${numA}) and ${neighbor} (tile ${neighbor + 1}, ${numB})`);
            } else {
              console.error(`❌❌❌ VIOLATION: 6-8 adjacency at positions ${i} (tile ${i + 1}, ${numA}) and ${neighbor} (tile ${neighbor + 1}, ${numB})`);
            }
            foundAdjacencyViolation = true;
          }
        }
        
        // Check same number adjacency (if rule enforced)
        if (!customRules.sameNumbersCanTouch && numA === numB && numA !== 6 && numA !== 8) {
          console.error(`❌❌❌ VIOLATION: Same number ${numA} adjacent at positions ${i} and ${neighbor}`);
          foundAdjacencyViolation = true;
        }
        
        // Check 2-12 adjacency (if rule enforced)
        if (!customRules.twoTwelveCanTouch) {
          if ((numA === 2 && numB === 12) || (numA === 12 && numB === 2)) {
            console.error(`❌❌❌ VIOLATION: 2-12 adjacency at positions ${i} (${numA}) and ${neighbor} (${numB})`);
            foundAdjacencyViolation = true;
          }
        }
      }
    }
    
    if (foundAdjacencyViolation) {
      console.error('❌❌❌ Board has adjacency violations - will retry');
      hasValidAdjacency = false;
      continue; // Retry
    }
    
    // BRUTE FORCE: Manual check for cluster violations - check EVERY tile and its neighbors
    console.log('🔍 BRUTE FORCE CHECK: Checking ALL terrain clusters...');
    let foundClusterViolation = false;
    const visited = new Array(30).fill(false);
    
    for (let i = 0; i < 30; i++) {
      if (visited[i] || terrains[i] === 'desert') continue;
      
      // Use a fresh visited array for this check to get accurate cluster size
      const checkVisited = new Array(30).fill(false);
      const clusterSize = getClusterSize(terrains, i, terrains[i], checkVisited);
      
      if (clusterSize > 2) {
        console.error(`❌❌❌ VIOLATION: Found cluster of ${clusterSize} ${terrains[i]} tiles starting at position ${i}`);
        
        // Log all positions in this cluster for debugging
        const clusterPositions: number[] = [];
        const clusterVisited = new Array(30).fill(false);
        const queue = [i];
        while (queue.length > 0) {
          const pos = queue.shift()!;
          if (clusterVisited[pos] || terrains[pos] !== terrains[i]) continue;
          clusterVisited[pos] = true;
          clusterPositions.push(pos);
          const neighbors = EXPANSION_NEIGHBORS[pos] || [];
          for (const neighbor of neighbors) {
            if (!clusterVisited[neighbor] && terrains[neighbor] === terrains[i]) {
              queue.push(neighbor);
            }
          }
        }
        console.error(`   Cluster positions: [${clusterPositions.join(', ')}]`);
        foundClusterViolation = true;
      }
      
      // Mark all positions in this cluster as visited
      const markVisited = new Array(30).fill(false);
      const markQueue = [i];
      while (markQueue.length > 0) {
        const pos = markQueue.shift()!;
        if (visited[pos] || terrains[pos] !== terrains[i]) continue;
        visited[pos] = true;
        const neighbors = EXPANSION_NEIGHBORS[pos] || [];
        for (const neighbor of neighbors) {
          if (!visited[neighbor] && terrains[neighbor] === terrains[i]) {
            markQueue.push(neighbor);
          }
        }
      }
    }
    
    if (foundClusterViolation) {
      console.error('❌❌❌ Board has cluster violations - will retry');
      hasValidTerrains = false;
      continue; // Retry
    }
    
    if (hasValidDistribution && hasValidAdjacency && hasValidTerrains) {
      // Perfect valid board found! Return it.
      console.log('✅✅✅ VALID EXPANSION BOARD FOUND!');
      return { terrains: terrains as Terrain[], numbers: numbers };
    } else {
      console.warn(`⚠️ Validation failed - retrying (attempt ${boardAttempt + 1}/${MAX_BOARD_GENERATION_ATTEMPTS})`);
    }
    
    // If any validation fails, retry entire board (continue loop)
  }
  
  // If we've exhausted ALL attempts, throw an error instead of returning invalid board
  console.error('❌ CRITICAL: Could not generate valid expansion board after ' + MAX_BOARD_GENERATION_ATTEMPTS + ' attempts');
  console.error('❌ This should not happen - there may be a logic error in the placement algorithms');
  
  // Last resort: Generate one more board and validate it one more time
  // If still invalid, we have a serious problem
  const desertPositions = placeDesertsRandomly();
  const terrains = placeResourceTiles(desertPositions);
  const numbers = placeNumberTokens(desertPositions, customRules);
  
  // Final check - if still invalid, we need to fix the algorithms
  if (!terrainsPassClusterRule(terrains, customRules) || hasAnyClustering(terrains) || 
      !validateNumberDistribution(numbers) || !noHotAdjacencyExpansion(numbers, customRules)) {
    throw new Error('CRITICAL: Expansion board generator cannot create valid boards. Algorithms need fixing.');
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
      // Strict validation: check for any clustering (3+ tiles in a line)
      // For expansion maps, maximum 2 tiles of same resource can touch
      if (!hasAnyClustering(result)) {
        return result;
      }
      // If clustering detected, continue trying
    }
    
    if (attempt % 200 === 0) {
    }
  }
  
  console.warn('⚠️ Simple placement failed after 2000 attempts, falling back to aggressive placement...');
  const aggressiveResult = placeResourcesAggressively(desertPositions, resourcePool);
  
  // Final validation check for aggressive placement too
  if (!hasAnyClustering(aggressiveResult)) {
    return aggressiveResult;
  }
  
  // If aggressive placement also has clustering, try one more time with minimal valid board
  console.warn('⚠️ Aggressive placement still has clustering, creating minimal valid board...');
  const minimalResult = createMinimalValidBoard(desertPositions, resourcePool);
  
  // Even minimal board should pass clustering check, but verify
  if (!hasAnyClustering(minimalResult)) {
    return minimalResult;
  }
  
  // Last resort: If even minimal board has clustering, return null to force retry
  // NEVER return invalid boards - the calling function will retry with new deserts
  console.error('❌ Could not create board without clustering after all strategies');
  return null; // Force retry with new board
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
  
  // Place resources one by one with STRICT validation at each step
  for (const pos of emptyPositions) {
    // Get all resources that don't create ANY clustering violation
    const validResources = shuffledResources.filter(resource => 
      !wouldCreateClusterViolation(terrains, pos, resource)
    );
    
    if (validResources.length === 0) {
      return null; // No valid placement, fail and retry
    }
    
    // Choose a random valid resource
    const chosenResource = validResources[Math.floor(Math.random() * validResources.length)];
    
    // Place the resource
    terrains[pos] = chosenResource;
    
    // STRICT: Immediately validate after placement - check for ANY cluster > 2
    if (hasAnyClustering(terrains)) {
      return null; // This placement created clustering, fail and retry
    }
    
    // Additional validation: ensure no cluster > 2 exists
    const visited = new Array(30).fill(false);
    for (let i = 0; i < 30; i++) {
      if (visited[i] || terrains[i] === 'desert') continue;
      const clusterSize = getClusterSize(terrains, i, terrains[i], visited);
      if (clusterSize > 2) {
        return null; // Found cluster > 2, fail immediately
      }
    }
    
    // Remove the chosen resource from the pool
    const resourceIndexToRemove = shuffledResources.indexOf(chosenResource);
    if (resourceIndexToRemove !== -1) {
      shuffledResources.splice(resourceIndexToRemove, 1);
    }
  }
  
  return terrains;
}



// Check if placing a resource would create a cluster of 3+ (STRICT VALIDATION)
function wouldCreateTripleCluster(terrains: Terrain[], pos: number, resource: Terrain): boolean {
  const neighbors = EXPANSION_NEIGHBORS[pos];
  if (!neighbors) return false;
  
  // Simulate placing the resource to check for linear chains
  const testTerrains = [...terrains];
  testTerrains[pos] = resource;
  
  // CRITICAL: Check if this would create a linear chain of 3+ tiles
  // This catches cases like: tile 9 -> tile 14 -> tile 20 all having the same resource
  if (hasLinearChain(testTerrains, resource)) {
    return true;
  }
  
  // Count how many neighbors already have the same resource
  const sameTypeNeighbors = neighbors.filter(n => terrains[n] === resource);
  
  // If 2+ neighbors of same type already exist, placing this will make 3+
  if (sameTypeNeighbors.length >= 2) {
    return true;
  }
  
  // Additional check: If there's 1 neighbor of same type, check if that neighbor
  // is part of a chain that would become 3+ when we place this tile
  if (sameTypeNeighbors.length === 1) {
    const neighborPos = sameTypeNeighbors[0];
    const neighborNeighbors = EXPANSION_NEIGHBORS[neighborPos] || [];
    // Check if that neighbor has another neighbor (besides us) of the same type
    const otherSameTypeNeighbors = neighborNeighbors.filter(n => 
      n !== pos && terrains[n] === resource
    );
    // If the neighbor already has another neighbor of the same type, placing here makes 3+
    if (otherSameTypeNeighbors.length > 0) {
      return true;
    }
  }
  
  return false;
}

// Check if placing a resource at a position would create any cluster > 2 (COMPREHENSIVE)
function wouldCreateClusterViolation(terrains: Terrain[], pos: number, resource: Terrain): boolean {
  // First check immediate triple cluster
  if (wouldCreateTripleCluster(terrains, pos, resource)) {
    return true;
  }
  
  // Simulate placing the resource
  const testTerrains = [...terrains];
  testTerrains[pos] = resource;
  
  // Check if this placement creates any cluster of 3+
  const visited = new Array(30).fill(false);
  for (let i = 0; i < 30; i++) {
    if (visited[i] || testTerrains[i] !== resource) continue;
    
    const clusterSize = getClusterSize(testTerrains, i, resource, visited);
    if (clusterSize > 2) {
      return true;
    }
  }
  
  return false;
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
  
  // CRITICAL: Also check for linear chains of 3+ tiles (e.g., tiles 9, 14, 20 in a line)
  return hasLinearChain(terrains, resourceType);
}

// Check for linear chains of 3+ tiles of the same resource
// A linear chain is when tiles form a line: A-B-C where all have the same resource
// Example: tiles 9, 14, 20 (positions 8, 13, 19) form a chain: 9->14->20
function hasLinearChain(terrains: Terrain[], resourceType: Terrain): boolean {
  const neighbors = EXPANSION_NEIGHBORS;
  const visited = new Array(30).fill(false);
  
  // Check every tile of this resource type
  for (let i = 0; i < 30; i++) {
    if (visited[i] || terrains[i] !== resourceType) continue;
    
    // Use BFS to find the longest chain starting from this tile
    const queue: Array<{pos: number, path: number[]}> = [{pos: i, path: [i]}];
    const localVisited = new Array(30).fill(false);
    localVisited[i] = true;
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentPos = current.pos;
      const currentPath = current.path;
      
      // If we've found a chain of 3+ tiles, that's a violation
      if (currentPath.length >= 3) {
        const tileNumbers = currentPath.map(p => p + 1).join(', '); // Convert to 1-indexed for display
        console.error(`❌❌❌ LINEAR CHAIN VIOLATION: Found chain of ${currentPath.length} ${resourceType} tiles at positions ${tileNumbers} (tiles ${currentPath.map(p => p + 1).join(', ')})`);
        return true;
      }
      
      // Check all neighbors of the same type
      const tileNeighbors = neighbors[currentPos] || [];
      for (const neighbor of tileNeighbors) {
        if (localVisited[neighbor] || terrains[neighbor] !== resourceType) continue;
        
        // Check if this neighbor extends the chain (not forming a triangle)
        // A triangle would be if the neighbor is already in the path (except the immediate previous tile)
        const isTriangle = currentPath.length >= 2 && neighbors[neighbor].some(n => 
          currentPath.includes(n) && n !== currentPos
        );
        
        if (!isTriangle) {
          // This extends the chain linearly
          localVisited[neighbor] = true;
          queue.push({pos: neighbor, path: [...currentPath, neighbor]});
        }
      }
    }
    
    // Mark all tiles in this cluster as visited
    for (let j = 0; j < 30; j++) {
      if (localVisited[j]) {
        visited[j] = true;
      }
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
        if (wouldCreateClusterViolation(terrains, i, resourceToPlace)) {
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
    
    // STRICT: Check if this placement has any clustering issues
    if (!placementFailed && !hasAnyClustering(terrains)) {
      // Double-check with comprehensive validation
      const visited = new Array(30).fill(false);
      let hasViolation = false;
      for (let i = 0; i < 30; i++) {
        if (visited[i] || terrains[i] === 'desert') continue;
        const clusterSize = getClusterSize(terrains, i, terrains[i], visited);
        if (clusterSize > 2) {
          hasViolation = true;
          break;
        }
      }
      if (!hasViolation) {
        return terrains; // Valid board!
      }
    }
  }
  
  // If aggressive placement also fails, return null to force retry
  // NEVER return invalid boards - the calling function will retry with new deserts
  return null;
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
  
  // Otherwise, use the original chit ring method (only if 6-8 can touch)
  // NOTE: If 6-8 cannot touch, we should have used smart placement above
  // This fallback should rarely be used
  
  // Try multiple times to get a valid placement
  for (let attempt = 0; attempt < 500; attempt++) {
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
  
  // If repair didn't fully succeed, try one more time with a completely fresh start
  if (!noHotAdjacencyExpansion(repaired, customRules)) {
    console.warn("⚠️ First repair attempt had violations, trying one more time with fresh placement...");
    // Try one more time with a completely new random placement
    const freshShuffle = shuffleInPlace([...expansionNumbers]);
    const freshNumbers: (number | null)[] = new Array(30).fill(null);
    
    desertPositions.forEach(pos => {
      freshNumbers[pos] = null;
    });
    
    const freshSpiralOrder = generateSpiralOrder();
    let freshIndex = 0;
    for (let i = 0; i < freshSpiralOrder.length && freshIndex < freshShuffle.length; i++) {
      const pos = freshSpiralOrder[i];
      if (!desertPositions.includes(pos)) {
        freshNumbers[pos] = freshShuffle[freshIndex];
        freshIndex++;
      }
    }
    
    const secondRepair = repairExpansionAdjacency(freshNumbers, customRules);
    if (noHotAdjacencyExpansion(secondRepair, customRules)) {
      return secondRepair;
    }
    
    // STRICT: Do NOT return invalid boards - return null instead
    // The calling function will retry with a new board
    console.warn("⚠️ Could not achieve perfect adjacency after multiple attempts");
    return null; // Return null to signal failure, forcing retry
  }
  
  // Validate repaired board before returning
  if (noHotAdjacencyExpansion(repaired, customRules)) {
    return repaired;
  }
  
  // If repair didn't work, return null to force retry
  return null;
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
  
  // CRITICAL: Problematic adjacency pairs that frequently cause 6-8 violations
  // These pairs are adjacent and must NEVER have 6 and 8 together
  // Position 3 = Tile 4, Position 8 = Tile 9
  // Position 7 = Tile 8, Position 13 = Tile 14
  // Position 26 = Tile 27, Position 29 = Tile 30
  const PROBLEMATIC_PAIRS: Array<[number, number]> = [
    [3, 8],   // Tile 4 (pos 3) and Tile 9 (pos 8) - frequently problematic
    [7, 13],  // Tile 8 (pos 7) and Tile 14 (pos 13) - frequently problematic
    [26, 29], // Tile 27 (pos 26) and Tile 30 (pos 29) - frequently problematic
  ];
  
  // Helper to check if a position pair is problematic
  const isProblematicPair = (pos1: number, pos2: number): boolean => {
    return PROBLEMATIC_PAIRS.some(([p1, p2]) => 
      (pos1 === p1 && pos2 === p2) || (pos1 === p2 && pos2 === p1)
    );
  };
  
  // Try multiple times to find a valid placement
  const maxAttempts = 500;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
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
      const eightPositions: number[] = []; // Track 8s - declared here to use when placing 6s
      
      for (const six of sixes) {
        // Find all positions that are not adjacent to any existing 6 or 8
        const validPositions = availablePositions.filter(pos => {
          // CRITICAL: Check problematic pairs first - if this position is part of a problematic pair
          // and the other position already has an 8, this position CANNOT have a 6
          for (const [p1, p2] of PROBLEMATIC_PAIRS) {
            if (pos === p1 && numbers[p2] === 8) {
              console.warn(`🚫 Blocking 6 at position ${pos} (tile ${pos + 1}) - problematic pair with position ${p2} (tile ${p2 + 1}) which has 8`);
              return false;
            }
            if (pos === p2 && numbers[p1] === 8) {
              console.warn(`🚫 Blocking 6 at position ${pos} (tile ${pos + 1}) - problematic pair with position ${p1} (tile ${p1 + 1}) which has 8`);
              return false;
            }
          }
          
          // CRITICAL: Check if this position is adjacent to any existing 6 (6s cannot be adjacent to each other)
          const neighbors = EXPANSION_NEIGHBORS[pos] || [];
          const isAdjacentToSix = neighbors.some(neighbor => sixPositions.includes(neighbor));
          
          // Also check if any existing 6s are adjacent to this position
          const isAdjacentToExistingSixes = sixPositions.some(sixPos => {
            const sixNeighbors = EXPANSION_NEIGHBORS[sixPos] || [];
            return sixNeighbors.includes(pos);
          });
          
          // CRITICAL: Check if this position is adjacent to any existing 8 (6s cannot be adjacent to 8s)
          const isAdjacentToEight = neighbors.some(neighbor => eightPositions.includes(neighbor));
          
          // Also check if any existing 8s are adjacent to this position
          const isAdjacentToExistingEights = eightPositions.some(eightPos => {
            const eightNeighbors = EXPANSION_NEIGHBORS[eightPos] || [];
            return eightNeighbors.includes(pos);
          });
          
          // CRITICAL: Check if placing a 6 here would make any existing 6s adjacent to each other
          const wouldCreateAdjacentSixes = sixPositions.some(existingSixPos => {
            const existingSixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
            return existingSixNeighbors.includes(pos);
          });
          
          const isValid = !isAdjacentToSix && !isAdjacentToExistingSixes && !isAdjacentToEight && !isAdjacentToExistingEights && !wouldCreateAdjacentSixes;
          
          return isValid;
        });
        
        if (validPositions.length === 0) {
          // If we can't place a 6, restart the attempt
          throw new Error('RETRY_PLACEMENT');
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
      // eightPositions already declared above
      
      for (const eight of eights) {
        // Find all positions that are not adjacent to any existing 6 or 8
        const validPositions = availablePositions.filter(pos => {
          // CRITICAL: Check problematic pairs first - if this position is part of a problematic pair
          // and the other position already has a 6, this position CANNOT have an 8
          for (const [p1, p2] of PROBLEMATIC_PAIRS) {
            if (pos === p1 && numbers[p2] === 6) {
              console.warn(`🚫 Blocking 8 at position ${pos} (tile ${pos + 1}) - problematic pair with position ${p2} (tile ${p2 + 1}) which has 6`);
              return false;
            }
            if (pos === p2 && numbers[p1] === 6) {
              console.warn(`🚫 Blocking 8 at position ${pos} (tile ${pos + 1}) - problematic pair with position ${p1} (tile ${p1 + 1}) which has 6`);
              return false;
            }
          }
          
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
          
          return isValid;
        });
        
        if (validPositions.length === 0) {
          // If we can't place an 8, restart the attempt
          throw new Error('RETRY_PLACEMENT');
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
  
      // Step 3: Place all remaining numbers with STRICT validation at each step
      const remainingNumbers = expansionNumbers.filter(n => n !== 6 && n !== 8);
      const shuffledRemaining = shuffleInPlace([...remainingNumbers]);
      
      for (let i = 0; i < shuffledRemaining.length && i < availablePositions.length; i++) {
        const number = shuffledRemaining[i];
        const position = availablePositions[i];
        
        // STRICT: Validate BEFORE placing - check if this placement would create violations
        const neighbors = EXPANSION_NEIGHBORS[position] || [];
        for (const neighbor of neighbors) {
          const neighborNum = numbers[neighbor];
          if (neighborNum === null) continue;
          
          // Check 6-8 adjacency
          if (!customRules.sixEightCanTouch) {
            if ((number === 6 && neighborNum === 8) || (number === 8 && neighborNum === 6)) {
              throw new Error('RETRY_PLACEMENT'); // Would create 6-8 adjacency
            }
          }
          
          // Check same number adjacency (if rule enforced)
          if (!customRules.sameNumbersCanTouch) {
            if (number === neighborNum && number !== 6 && number !== 8) {
              // 6-6 and 8-8 are already handled, this is for other numbers
              throw new Error('RETRY_PLACEMENT'); // Would create same number adjacency
            }
          }
          
          // Check 2-12 adjacency (if rule enforced)
          if (!customRules.twoTwelveCanTouch) {
            if ((number === 2 && neighborNum === 12) || (number === 12 && neighborNum === 2)) {
              throw new Error('RETRY_PLACEMENT'); // Would create 2-12 adjacency
            }
          }
        }
        
        // STRICT: Final check BEFORE placing - make absolutely sure it's safe
        // Re-check all neighbors one more time
        for (const neighbor of neighbors) {
          const neighborNum = numbers[neighbor];
          if (neighborNum === null) continue;
          
          // Re-check 6-8 adjacency
          if (!customRules.sixEightCanTouch) {
            if ((number === 6 && neighborNum === 8) || (number === 8 && neighborNum === 6)) {
              throw new Error('RETRY_PLACEMENT'); // Would create 6-8 adjacency
            }
          }
        }
        
        // Place the number
        numbers[position] = number;
        
        // STRICT: Validate AFTER placement - check entire board immediately
        if (!noHotAdjacencyExpansion(numbers, customRules)) {
          throw new Error('RETRY_PLACEMENT'); // Violation detected after placement
        }
        
        // Additional immediate check: verify 6-8 adjacency was not created
        if (!customRules.sixEightCanTouch) {
          const positionNeighbors = EXPANSION_NEIGHBORS[position] || [];
          for (const neighbor of positionNeighbors) {
            const neighborNum = numbers[neighbor];
            if (neighborNum === null) continue;
            if ((number === 6 && neighborNum === 8) || (number === 8 && neighborNum === 6)) {
              throw new Error('RETRY_PLACEMENT'); // Just created 6-8 adjacency!
            }
          }
        }
      }
      
      // STRICT Final validation to ensure no adjacency violations
      if (!noHotAdjacencyExpansion(numbers, customRules)) {
        // If validation fails, restart the attempt
        throw new Error('RETRY_PLACEMENT');
      }
      
      // STRICT: Final comprehensive check - validate EVERYTHING before returning
      // CRITICAL: Double-check 6-8 adjacency if rule is enforced (check ALL 6s and 8s)
      // This MUST catch any violations before returning
      if (!customRules.sixEightCanTouch) {
        // Check every position that has a 6 or 8
        for (let i = 0; i < 30; i++) {
          const num = numbers[i];
          if (num !== 6 && num !== 8) continue; // Skip positions without 6 or 8
          
          const neighbors = EXPANSION_NEIGHBORS[i] || [];
          for (const neighbor of neighbors) {
            const neighborNum = numbers[neighbor];
            if (neighborNum === null) continue; // Skip null neighbors
            
            // CRITICAL: Check for 6-8 adjacency in BOTH directions
            if ((num === 6 && neighborNum === 8) || (num === 8 && neighborNum === 6)) {
              console.error(`❌ EXPANSION BOARD ERROR: Found 6-8 adjacency at positions ${i} (${num}) and ${neighbor} (${neighborNum})`);
              throw new Error('RETRY_PLACEMENT'); // Found 6-8 adjacency violation - MUST RETRY
            }
          }
        }
      }
      
      // CRITICAL: Final validation using the comprehensive function
      // This is the ultimate check - if this passes, the board should be valid
      if (!noHotAdjacencyExpansion(numbers, customRules)) {
        console.error('❌ EXPANSION BOARD ERROR: noHotAdjacencyExpansion validation failed');
        throw new Error('RETRY_PLACEMENT'); // Final validation failed - MUST RETRY
      }
      
      // Additional check: verify distribution is correct
      if (!validateNumberDistribution(numbers)) {
        console.error('❌ EXPANSION BOARD ERROR: Number distribution is invalid');
        throw new Error('RETRY_PLACEMENT'); // Distribution is wrong - MUST RETRY
      }
      
      // CRITICAL: One final manual check for 6-8 adjacency (belt and suspenders)
      if (!customRules.sixEightCanTouch) {
        for (let i = 0; i < 30; i++) {
          if (numbers[i] === 6) {
            const neighbors = EXPANSION_NEIGHBORS[i] || [];
            for (const neighbor of neighbors) {
              if (numbers[neighbor] === 8) {
                console.error(`❌ EXPANSION BOARD CRITICAL ERROR: Manual check found 6-8 adjacency at ${i} and ${neighbor}`);
                throw new Error('RETRY_PLACEMENT');
              }
            }
          }
          if (numbers[i] === 8) {
            const neighbors = EXPANSION_NEIGHBORS[i] || [];
            for (const neighbor of neighbors) {
              if (numbers[neighbor] === 6) {
                console.error(`❌ EXPANSION BOARD CRITICAL ERROR: Manual check found 8-6 adjacency at ${i} and ${neighbor}`);
                throw new Error('RETRY_PLACEMENT');
              }
            }
          }
        }
      }
      
      // Success! All validations passed - return the valid placement
      return numbers;
      
    } catch (error) {
      // If this was a retry signal, continue to next attempt
      if (error instanceof Error && error.message === 'RETRY_PLACEMENT') {
        continue;
      }
      // Otherwise, re-throw the error
      throw error;
    }
  }
  
  // If we exhausted all attempts, return null to force retry
  // NEVER return invalid boards - the calling function will retry with a new board
  return null;
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

// Repair adjacency violations by swapping numbers - Improved algorithm
function repairExpansionAdjacency(numbers: (number | null)[], customRules: any): (number | null)[] {
  // Create a working copy
  let workingNumbers = [...numbers];
  
  // Try multiple repair strategies with increasing complexity
  const MAX_ATTEMPTS = 300;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Check if we're already valid
    if (noHotAdjacencyExpansion(workingNumbers, customRules)) {
      return workingNumbers;
    }
    
    // Strategy 1: Find and fix violations one by one with smart swaps
    const violations = findViolations(workingNumbers, customRules);
    if (violations.length === 0) {
      return workingNumbers;
    }
    
    // Sort violations by severity (hot number violations first)
    violations.sort((a, b) => {
      const aIsHot = HOT.has(a.num1) || HOT.has(a.num2);
      const bIsHot = HOT.has(b.num1) || HOT.has(b.num2);
      if (aIsHot && !bIsHot) return -1;
      if (!aIsHot && bIsHot) return 1;
      return 0;
    });
    
    let fixedAny = false;
    
    // Try to fix each violation
    for (const violation of violations) {
      // Strategy 1a: Try swapping violation.pos1 with any position
      const violationsBefore1 = findViolations(workingNumbers, customRules).length;
      if (tryFixViolation(workingNumbers, violation.pos1, violation.pos2, customRules)) {
        fixedAny = true;
        break;
      }
      const violationsAfter1 = findViolations(workingNumbers, customRules).length;
      if (violationsAfter1 < violationsBefore1) {
        fixedAny = true;
        break; // Improvement made, continue outer loop
      }
      
      // Strategy 1b: Try swapping violation.pos2 with any position
      const violationsBefore2 = findViolations(workingNumbers, customRules).length;
      if (tryFixViolation(workingNumbers, violation.pos2, violation.pos1, customRules)) {
        fixedAny = true;
        break;
      }
      const violationsAfter2 = findViolations(workingNumbers, customRules).length;
      if (violationsAfter2 < violationsBefore2) {
        fixedAny = true;
        break; // Improvement made, continue outer loop
      }
      
      // Strategy 1c: Try swapping both positions with safe positions
      if (tryFixBothPositions(workingNumbers, violation.pos1, violation.pos2, customRules)) {
        fixedAny = true;
        break;
      }
    }
    
    if (fixedAny) {
      continue; // Try again with the fixed board
    }
    
    // Strategy 2: If we haven't fixed anything in a while, try a different approach
    // Try swapping random pairs to see if it helps
    if (attempt > 100 && attempt % 20 === 0) {
      // Try a few random swaps
      for (let randomAttempt = 0; randomAttempt < 10; randomAttempt++) {
        const pos1 = Math.floor(Math.random() * 30);
        const pos2 = Math.floor(Math.random() * 30);
        if (pos1 !== pos2 && workingNumbers[pos1] && workingNumbers[pos2]) {
          const beforeViolations = findViolations(workingNumbers, customRules).length;
          [workingNumbers[pos1], workingNumbers[pos2]] = [workingNumbers[pos2], workingNumbers[pos1]];
          const afterViolations = findViolations(workingNumbers, customRules).length;
          
          if (noHotAdjacencyExpansion(workingNumbers, customRules)) {
            return workingNumbers;
          }
          
          // If it improved, keep it; otherwise revert
          if (afterViolations < beforeViolations) {
            break; // Keep this swap and continue
          } else {
            [workingNumbers[pos1], workingNumbers[pos2]] = [workingNumbers[pos2], workingNumbers[pos1]];
          }
        }
      }
    }
    
    // Strategy 3: Last resort - redistribute hot numbers only if we're really stuck
    if (attempt === 250) {
      workingNumbers = redistributeHotNumbers(workingNumbers, customRules);
      continue;
    }
  }
  
  // If we still have violations after all attempts, return the best we have
  console.warn('⚠️ Could not fully repair all adjacency violations after ' + MAX_ATTEMPTS + ' attempts, returning best attempt');
  return workingNumbers;
}

// Helper function to find all violations
function findViolations(numbers: (number | null)[], customRules: any): Array<{pos1: number, pos2: number, num1: number, num2: number}> {
  const violations: Array<{pos1: number, pos2: number, num1: number, num2: number}> = [];
  
  for (let i = 0; i < 30; i++) {
    const current = numbers[i];
    if (!current) continue;
    
    const neighbors = EXPANSION_NEIGHBORS[i] || [];
    for (const neighbor of neighbors) {
      const neighborNum = numbers[neighbor];
      if (!neighborNum) continue;
      
      // Check for 6-8 adjacency violation
      if (!customRules.sixEightCanTouch && ((current === 6 && neighborNum === 8) || (current === 8 && neighborNum === 6))) {
        violations.push({pos1: i, pos2: neighbor, num1: current, num2: neighborNum});
      }
      // Check for same hot number adjacency (6-6 or 8-8)
      if ((current === 6 && neighborNum === 6) || (current === 8 && neighborNum === 8)) {
        violations.push({pos1: i, pos2: neighbor, num1: current, num2: neighborNum});
      }
      // Check for same number adjacency (if rule is enabled)
      if (!customRules.sameNumbersCanTouch && current === neighborNum && !HOT.has(current)) {
        violations.push({pos1: i, pos2: neighbor, num1: current, num2: neighborNum});
      }
      // Check for 2-12 adjacency violation
      if (!customRules.twoTwelveCanTouch && ((current === 2 && neighborNum === 12) || (current === 12 && neighborNum === 2))) {
        violations.push({pos1: i, pos2: neighbor, num1: current, num2: neighborNum});
      }
    }
  }
  
  return violations;
}

// Helper function to try fixing a violation by swapping one position
function tryFixViolation(numbers: (number | null)[], violationPos: number, otherPos: number, customRules: any): boolean {
  const violationNum = numbers[violationPos];
  if (!violationNum) return false;
  
  // Count violations before swap
  const violationsBefore = findViolations(numbers, customRules).length;
  let bestSwap: {pos: number, violations: number} | null = null;
  
  // Try swapping with every other position
  for (let j = 0; j < 30; j++) {
    if (j === violationPos || j === otherPos) continue;
    const swapCandidate = numbers[j];
    if (!swapCandidate) continue;
    
    // Try the swap
    [numbers[violationPos], numbers[j]] = [numbers[j], numbers[violationPos]];
    
    // Check if this fixed everything
    if (noHotAdjacencyExpansion(numbers, customRules)) {
      return true; // Perfect! Keep this swap
    }
    
    // Check if it reduced violations
    const violationsAfter = findViolations(numbers, customRules).length;
    if (violationsAfter < violationsBefore) {
      // It improved! Keep track of the best improvement
      if (!bestSwap || violationsAfter < bestSwap.violations) {
        bestSwap = { pos: j, violations: violationsAfter };
      }
    }
    
    // Revert to try next swap
    [numbers[violationPos], numbers[j]] = [numbers[j], numbers[violationPos]];
  }
  
  // If we found an improvement, apply the best swap
  if (bestSwap) {
    [numbers[violationPos], numbers[bestSwap.pos]] = [numbers[bestSwap.pos], numbers[violationPos]];
    return false; // Not fully fixed, but improved
  }
  
  return false;
}

// Helper function to try fixing by swapping both positions
function tryFixBothPositions(numbers: (number | null)[], pos1: number, pos2: number, customRules: any): boolean {
  // Try swapping pos1 with a safe position, then pos2 with another safe position
  for (let j1 = 0; j1 < 30; j1++) {
    if (j1 === pos1 || j1 === pos2) continue;
    if (!numbers[j1]) continue;
    
    if (isSafeSwap(numbers, pos1, j1, customRules)) {
      [numbers[pos1], numbers[j1]] = [numbers[j1], numbers[pos1]];
      
      for (let j2 = 0; j2 < 30; j2++) {
        if (j2 === pos1 || j2 === pos2 || j2 === j1) continue;
        if (!numbers[j2]) continue;
        
        if (isSafeSwap(numbers, pos2, j2, customRules)) {
          [numbers[pos2], numbers[j2]] = [numbers[j2], numbers[pos2]];
          if (noHotAdjacencyExpansion(numbers, customRules)) {
            return true;
          }
          [numbers[pos2], numbers[j2]] = [numbers[j2], numbers[pos2]];
        }
      }
      
      [numbers[pos1], numbers[j1]] = [numbers[j1], numbers[pos1]];
    }
  }
  
  return false;
}

// Helper function to check if a swap would be safe
function isSafeSwap(numbers: (number | null)[], pos1: number, pos2: number, customRules: any): boolean {
  const num1 = numbers[pos1];
  const num2 = numbers[pos2];
  if (!num1 || !num2) return false;
  
  // Check neighbors of pos2 to see if num1 would create violations there
  const neighbors2 = EXPANSION_NEIGHBORS[pos2] || [];
  for (const neighbor of neighbors2) {
    if (neighbor === pos1) continue; // Skip the position we're swapping from
    const neighborNum = numbers[neighbor];
    if (!neighborNum) continue;
    
    if (!customRules.sixEightCanTouch && ((num1 === 6 && neighborNum === 8) || (num1 === 8 && neighborNum === 6))) return false;
    if ((num1 === 6 && neighborNum === 6) || (num1 === 8 && neighborNum === 8)) return false;
    if (!customRules.sameNumbersCanTouch && num1 === neighborNum && !HOT.has(num1)) return false;
    if (!customRules.twoTwelveCanTouch && ((num1 === 2 && neighborNum === 12) || (num1 === 12 && neighborNum === 2))) return false;
  }
  
  // Check neighbors of pos1 to see if num2 would create violations there
  const neighbors1 = EXPANSION_NEIGHBORS[pos1] || [];
  for (const neighbor of neighbors1) {
    if (neighbor === pos2) continue; // Skip the position we're swapping from
    const neighborNum = numbers[neighbor];
    if (!neighborNum) continue;
    
    if (!customRules.sixEightCanTouch && ((num2 === 6 && neighborNum === 8) || (num2 === 8 && neighborNum === 6))) return false;
    if ((num2 === 6 && neighborNum === 6) || (num2 === 8 && neighborNum === 8)) return false;
    if (!customRules.sameNumbersCanTouch && num2 === neighborNum && !HOT.has(num2)) return false;
    if (!customRules.twoTwelveCanTouch && ((num2 === 2 && neighborNum === 12) || (num2 === 12 && neighborNum === 2))) return false;
  }
  
  return true;
}

// Helper function to redistribute hot numbers
function redistributeHotNumbers(numbers: (number | null)[], customRules: any): (number | null)[] {
  const result = [...numbers];
  const hotNumbers: number[] = [];
  const hotPositions: number[] = [];
  const allPositions: number[] = [];
  
  // Collect hot numbers and all non-null positions
  for (let i = 0; i < 30; i++) {
    if (result[i] === null) continue;
    allPositions.push(i);
    if (HOT.has(result[i]!)) {
      hotNumbers.push(result[i]!);
      hotPositions.push(i);
    }
  }
  
  // Clear hot number positions first
  for (const pos of hotPositions) {
    result[pos] = null;
  }
  
  // Try to place hot numbers in non-adjacent positions
  shuffleInPlace(hotNumbers);
  const placed: boolean[] = new Array(30).fill(false);
  
  for (const hotNum of hotNumbers) {
    // Find a safe position for this hot number
    let placedHot = false;
    const candidatePositions = allPositions.filter(pos => !placed[pos] && result[pos] === null);
    
    for (let attempt = 0; attempt < 200 && candidatePositions.length > 0; attempt++) {
      const randomIndex = Math.floor(Math.random() * candidatePositions.length);
      const pos = candidatePositions[randomIndex];
      
      // Check if this position is safe for a hot number
      const neighbors = EXPANSION_NEIGHBORS[pos] || [];
      let isSafe = true;
      for (const neighbor of neighbors) {
        const neighborNum = result[neighbor];
        if (!neighborNum) continue;
        if (HOT.has(neighborNum)) {
          if (!customRules.sixEightCanTouch && ((hotNum === 6 && neighborNum === 8) || (hotNum === 8 && neighborNum === 6))) {
            isSafe = false;
            break;
          }
          if ((hotNum === 6 && neighborNum === 6) || (hotNum === 8 && neighborNum === 8)) {
            isSafe = false;
            break;
          }
        }
      }
      
      if (isSafe) {
        result[pos] = hotNum;
        placed[pos] = true;
        placedHot = true;
        // Remove from candidate list
        candidatePositions.splice(randomIndex, 1);
        break;
      } else {
        // Remove this position from candidates
        candidatePositions.splice(randomIndex, 1);
      }
    }
    
    // If we couldn't find a safe position, place it in any available position
    if (!placedHot) {
      for (const pos of allPositions) {
        if (!placed[pos] && result[pos] === null) {
          result[pos] = hotNum;
          placed[pos] = true;
          break;
        }
      }
    }
  }
  
  return result;
}

// Helper function to completely reshuffle numbers
function completeReshuffle(numbers: (number | null)[]): (number | null)[] {
  const result = [...numbers];
  const nonNullNumbers: number[] = [];
  const nonNullPositions: number[] = [];
  
  for (let i = 0; i < 30; i++) {
    if (result[i] !== null) {
      nonNullNumbers.push(result[i]!);
      nonNullPositions.push(i);
    }
  }
  
  shuffleInPlace(nonNullNumbers);
  
  for (let i = 0; i < nonNullPositions.length; i++) {
    result[nonNullPositions[i]] = nonNullNumbers[i];
  }
  
  return result;
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
  /* 25 */ [21, 22, 24, 26, 28],       // Tile 26: adjacent to 21, 22, 25, 27, 29 (fixed: removed self-ref 25, invalid 30)
  /* 26 */ [22, 23, 25, 27, 28],        // Tile 27: adjacent to 22, 23, 26, 28 (fixed: removed self-ref 26, invalid 30)
  /* 27 */ [23, 24, 25, 28],            // Tile 28: adjacent to 24, 25, 29
  /* 28 */ [25, 26, 27],                // Tile 29: adjacent to 25, 26, 28, 30 (1-indexed: tiles 26, 27, 29, 31) - fixed: removed invalid indices
  /* 29 */ [26, 27, 28]                 // Tile 30: adjacent to 26, 27, 29 (1-indexed: tiles 27, 28, 30) - fixed: correct neighbors
];

// Expansion-specific adjacency validation
export function noHotAdjacencyExpansion(nums: (number|null)[], customRules: any): boolean {
  const validationId = Math.random().toString(36).substr(2, 9);
  
  // CRITICAL FIX: Check ALL 30 tiles and ALL adjacencies, not just HOT-to-HOT
  // We must check every position that has a number, checking all its neighbors
  for (let i = 0; i < 30; i++) {
    const a = nums[i];
    if (a === null) continue; // Skip null positions, but check ALL numbers (not just HOT)
    
    const neighbors = EXPANSION_NEIGHBORS[i] || [];
    for (let jIdx = 0; jIdx < neighbors.length; jIdx++) {
      const j = neighbors[jIdx];
      const b = nums[j];
      if (b === null) continue; // Skip null neighbors
      
      // Rule 1: 6 cannot be adjacent to 8 and vice versa (unless custom rule allows)
      // CRITICAL: Check this for ANY position with 6 or 8, not just when both are in HOT
      if ((a === 6 && b === 8) || (a === 8 && b === 6)) {
        if (!customRules.sixEightCanTouch) {
          return false;
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
  
  // Rule 4: Other same numbers cannot be adjacent (unless custom rule allows)
  // This includes checking for same numbers that are NOT in HOT set
  if (!customRules.sameNumbersCanTouch) {
    for (let i = 0; i < 30; i++) {
      const a = nums[i];
      if (a === null || HOT.has(a)) continue; // Skip 2, 6, 8, 12 (already handled above)
      
      for (let jIdx = 0; jIdx < EXPANSION_NEIGHBORS[i].length; jIdx++) {
        const j = EXPANSION_NEIGHBORS[i][jIdx];
        const b = nums[j];
        if (a === b) {
          return false; // Same numbers adjacent (e.g., two 3s, two 4s, etc.)
        }
      }
    }
  }
  
  // Additional rule: 2 and 12 cannot be adjacent (unless custom rule allows)
  // Also check for same 12s adjacent (12-12)
  if (!customRules.twoTwelveCanTouch) {
    for (let i = 0; i < 30; i++) {
      const a = nums[i];
      if (a === 2 || a === 12) {
        for (let jIdx = 0; jIdx < EXPANSION_NEIGHBORS[i].length; jIdx++) {
          const j = EXPANSION_NEIGHBORS[i][jIdx];
          const b = nums[j];
          if ((a === 2 && b === 12) || (a === 12 && b === 2)) {
            return false; // 2 and 12 adjacent
          }
          // Check for two 12s adjacent
          if (a === 12 && b === 12) {
            return false; // Two 12s adjacent
          }
          // Check for two 2s adjacent
          if (a === 2 && b === 2) {
            return false; // Two 2s adjacent
          }
        }
      }
    }
  }
  
  // Also check for same 2s or 12s if sameNumbersCanTouch is false
  if (!customRules.sameNumbersCanTouch) {
    for (let i = 0; i < 30; i++) {
      const a = nums[i];
      if (a === 2 || a === 12) {
        for (let jIdx = 0; jIdx < EXPANSION_NEIGHBORS[i].length; jIdx++) {
          const j = EXPANSION_NEIGHBORS[i][jIdx];
          const b = nums[j];
          if (a === b) {
            return false; // Same numbers adjacent (2-2 or 12-12)
          }
        }
      }
    }
  }
  
  return true;
}

// Validate that number distribution matches official Catan expansion rules
function validateNumberDistribution(numbers: (number | null)[]): boolean {
  // Official 5-6 player expansion distribution (28 numbers total)
  const expectedDistribution: Record<number, number> = {
    2: 2,   // 2 appears twice
    3: 3,   // 3 appears three times
    4: 3,   // 4 appears three times
    5: 3,   // 5 appears three times
    6: 3,   // 6 appears three times
    8: 3,   // 8 appears three times
    9: 3,   // 9 appears three times
    10: 3,  // 10 appears three times
    11: 3,  // 11 appears three times
    12: 2,  // 12 appears twice
  };
  
  // Count actual distribution (excluding nulls/deserts)
  const actualDistribution: Record<number, number> = {};
  let nonNullCount = 0;
  
  for (const num of numbers) {
    if (num !== null) {
      nonNullCount++;
      actualDistribution[num] = (actualDistribution[num] || 0) + 1;
    }
  }
  
  // Check total count (should be 28)
  if (nonNullCount !== 28) {
    console.error(`❌ Invalid number count: expected 28, got ${nonNullCount}`);
    return false;
  }
  
  // Check each number's count
  for (const [num, expectedCount] of Object.entries(expectedDistribution)) {
    const numValue = parseInt(num);
    const actualCount = actualDistribution[numValue] || 0;
    if (actualCount !== expectedCount) {
      console.error(`❌ Invalid distribution for number ${num}: expected ${expectedCount}, got ${actualCount}`);
      return false;
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
  const [showScreenshotTool, setShowScreenshotTool] = useState(false);
  const [screenshotArea, setScreenshotArea] = useState({
    x: 200,
    y: 100,
    width: 615,
    height: 532
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [testScreenshot, setTestScreenshot] = useState<string | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);

  const [mapType, setMapType] = useState<MapType>('classic');
  const [customRules, setCustomRules] = useState({
    sixEightCanTouch: false,
    twoTwelveCanTouch: true,
    sameNumbersCanTouch: true,
    sameResourceCanTouch: true,
    imageStyle: 'king-dice' // Add image style state
  });
  
  // Ensure sameResourceCanTouch is always true for expansion maps (required: max 2 in line)
  useEffect(() => {
    if (mapType === 'expansion' && !customRules.sameResourceCanTouch) {
      setCustomRules(prev => ({ ...prev, sameResourceCanTouch: true }));
    }
  }, [mapType, customRules.sameResourceCanTouch]);
  
  const [isMobile, setIsMobile] = useState(false);
  const userId = useUserId();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const tCatan = useTranslations('catanMapGenerator');
  
  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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
      const MAX_RETRIES = 10; // Maximum number of retries for board generation
      let retryCount = 0;
        
      const attemptGeneration = (): void => {
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
        
        // Validate board before creating hexagons (but always proceed)
        
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            console.warn('⚠️ Classic board has violations - proceeding anyway');
          }
        } else {
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            console.warn('⚠️ Expansion board has violations - proceeding anyway');
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
                console.warn(`⚠️ Hexagon ${i} has adjacency violations - continuing anyway`);
              }
            } else {
              if (!noHotAdjacencyExpansion(currentNumbers, customRules)) {
                console.warn(`⚠️ Hexagon ${i} has adjacency violations - continuing anyway`);
              }
            }
          }
        }
        

        // CRITICAL: Final validation with detailed error reporting (different for classic vs expansion)
        if (currentMapType === 'expansion') {
          // For expansion, do comprehensive validation and log any violations
          const numbersArray = newHexagons.map(h => h.number);
          const terrainsArray = newHexagons.map(h => h.type);
          
          // Validate numbers
          if (!noHotAdjacencyExpansion(numbersArray, customRules)) {
            console.error('❌ EXPANSION BOARD VALIDATION FAILED: Number adjacency violations detected!');
            // Find and log specific violations
            for (let i = 0; i < 30; i++) {
              const a = numbersArray[i];
              if (a === null) continue;
              const neighbors = EXPANSION_NEIGHBORS[i] || [];
              for (const j of neighbors) {
                const b = numbersArray[j];
                if (b === null) continue;
                
                // Check 6-8 adjacency
                if (!customRules.sixEightCanTouch) {
                  if ((a === 6 && b === 8) || (a === 8 && b === 6)) {
                    console.error(`❌ VIOLATION FOUND: 6-8 adjacency at positions ${i} (${a}) and ${j} (${b})`);
                  }
                }
                
                // Check same number adjacency
                if (!customRules.sameNumbersCanTouch && a === b) {
                  console.error(`❌ VIOLATION FOUND: Same number ${a} adjacent at positions ${i} and ${j}`);
                }
              }
            }
            // Still continue but log the error
          }
          
          // Validate terrains
          if (hasAnyClustering(terrainsArray)) {
            console.error('❌ EXPANSION BOARD VALIDATION FAILED: Terrain clustering violations detected!');
            // Find and log specific clusters
            const visited = new Array(30).fill(false);
            for (let i = 0; i < 30; i++) {
              if (visited[i] || terrainsArray[i] === 'desert') continue;
              const clusterSize = getClusterSize(terrainsArray, i, terrainsArray[i], visited);
              if (clusterSize > 2) {
                console.error(`❌ VIOLATION FOUND: Cluster of ${clusterSize} ${terrainsArray[i]} tiles starting at position ${i}`);
              }
            }
          }
        }
        
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            console.warn('⚠️ Classic board has some adjacency violations - displaying anyway');
          }
          if (!terrainsPassClusterRule(board.terrains, customRules)) {
            console.warn('⚠️ Classic board has some terrain clustering - displaying anyway');
          }
        } else {
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            console.warn('⚠️ Expansion board has some adjacency violations - displaying anyway');
          }
          
          // Final validation for expansion terrain clustering
          // Since we're using the simple placement approach, clustering should already be prevented
        }

        
        // Final validation - Always display the map, even with violations
        
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            console.warn('⚠️ Classic board has adjacency violations - displaying map anyway');
          }
        } else {
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            console.warn('⚠️ Expansion board has adjacency violations - displaying map anyway');
          }
        }
        
        
      setHexagons(newHexagons);
      setIsGenerating(false);
      } catch (error) {
          // Check if this is a terrain validation error that we should retry
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isRetryableError = 
            errorMessage.includes('Terrain cluster rule failed') ||
            errorMessage.includes('Failed to generate valid terrains') ||
            errorMessage.includes('retrying board generation');
          
          if (isRetryableError && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`⚠️ Board generation failed (attempt ${retryCount}/${MAX_RETRIES}), retrying...`, errorMessage);
            // Retry after a short delay to avoid blocking
            setTimeout(() => {
              attemptGeneration();
            }, 50);
            return;
          }
          
          // If we've exhausted retries or it's a non-retryable error, show the error
        console.error('❌ Board generation failed:', error);
        console.error('❌ Error details:', {
            message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace',
          currentMapType: currentMapType,
            mapType: mapType,
            retryCount: retryCount
        });
          
          // Show user-friendly error message
          if (isRetryableError && retryCount >= MAX_RETRIES) {
            console.error('❌ Failed to generate valid map after', MAX_RETRIES, 'attempts. Please try again.');
          }
          
        setIsGenerating(false);
      }
      };
      
      // Start the first attempt
      attemptGeneration();
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
      const mapImage = await captureMapImage();
      
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

  // Screenshot tool handlers
  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (isDragging) {
      setScreenshotArea(prev => ({
        ...prev,
        x: Math.max(0, prev.x + deltaX),
        y: Math.max(0, prev.y + deltaY)
      }));
    } else if (isResizing) {
      setScreenshotArea(prev => ({
        ...prev,
        width: Math.max(100, prev.width + deltaX),
        height: Math.max(100, prev.height + deltaY)
      }));
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const toggleScreenshotTool = () => {
    setShowScreenshotTool(!showScreenshotTool);
  };

  const moveToMap = () => {
    // Find the map container and position the red rectangle over it
    const mapContainer = document.querySelector('.mobile-map-container') as HTMLElement;
    if (!mapContainer) {
      alert('Map container not found!');
      return;
    }
    
    const mapRect = mapContainer.getBoundingClientRect();
    console.log('🗺️ Map container position:', mapRect);
    
    // Position the red rectangle over the map area
    setScreenshotArea({
      x: mapRect.left,
      y: mapRect.top,
      width: 615, // Standard map width
      height: 532  // Standard map height
    });
  };


  const captureMapImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        
        // Find the new map container
        const mapContainer = document.getElementById('map-container') as HTMLElement;
        if (!mapContainer) {
          reject(new Error('Map container not found'));
          return;
        }

        console.log('🗺️ Map container found, capturing...');
        
        // Use html2canvas to capture the map container directly
        import('html2canvas').then(({ default: html2canvas }) => {
          html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: true,
            logging: false
          }).then((canvas: HTMLCanvasElement) => {
            // Convert directly to base64
            const imageData = canvas.toDataURL('image/png');
            resolve(imageData);
          }).catch((error) => {
            console.error('❌ html2canvas failed:', error);
            reject(error);
          });
        }).catch((error) => {
          console.error('❌ Failed to import html2canvas:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error in captureMapImage:', error);
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
    return `/CatanMapGenerator/CatanNumber${number}.svg?v=2`;
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
            {tCatan('classic')}
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
            {tCatan('expansion')}
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
              {tCatan('classic')}
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
              {tCatan('expansion')}
            </button>
          </div>
          
          {/* Options and Shuffle Buttons */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-32 h-14 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-base"
            >
              {tCatan('options')}
            </button>
            
            <button
              onClick={() => generateMap()}
              disabled={isGenerating}
              className="w-32 h-14 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base"
            >
              {isGenerating ? tCatan('generating') : tCatan('shuffle')}
            </button>
          </div>
        </div>
        

      </div>

      {/* Map Container with responsive layout */}
      <div className="w-full flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        {/* Left side content - Generation Custom Rules */}
        <div className="hidden lg:block lg:w-1/3 lg:pr-8">
          <div className="bg-white rounded-lg p-6">
            <h4 className="text-lg font-semibold text-dark-900 mb-4">{tCatan('generationCustomRules')}</h4>
            <p className="text-xs text-gray-500 mb-4">
              {tCatan('customizeRulesDescription')}
            </p>
            
            <div className="mb-6">
              <label className="block text-base font-medium text-dark-700 mb-2">{tCatan('imageStyle')}</label>
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
                  {tCatan('classic')}
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
                  {tCatan('kingDice')}
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
                <span className="text-base text-dark-700">{tCatan('sixEightCanTouch')}</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.twoTwelveCanTouch}
                  onChange={(e) => handleCustomRuleChange('twoTwelveCanTouch', e.target.checked)}
                />
                <span className="text-base text-dark-700">{tCatan('twoTwelveCanTouch')}</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sameNumbersCanTouch}
                  onChange={(e) => handleCustomRuleChange('sameNumbersCanTouch', e.target.checked)}
                />
                <span className="text-base text-dark-700">{tCatan('sameNumbersCanTouch')}</span>
              </label>
              
              {mapType === 'classic' && (
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sameResourceCanTouch}
                  disabled={mapType === 'expansion'}
                  onChange={(e) => handleCustomRuleChange('sameResourceCanTouch', e.target.checked)}
                />
                <span className={`text-base ${mapType === 'expansion' ? 'text-gray-500' : 'text-dark-700'}`}>
                  {tCatan('sameResourceCanTouch')}
                  {mapType === 'expansion' && <span className="ml-1 text-xs">(Required: Max 2 in line)</span>}
                </span>
              </label>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => generateMap()}
          disabled={isGenerating}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? tCatan('generating') : tCatan('generateNewMap')}
        </button>
            </div>
          </div>
      </div>

        {/* Map Container - Full width to use all available space */}
        {/* Map Container with mobile-specific padding */}
        <div className="bg-white rounded-lg shadow-md" style={{ padding: isMobile ? '8px' : '24px', maxWidth: isMobile ? '100%' : '950px', width: '100%', overflow: 'hidden' }}>
            {/* Map Display Area - Responsive width for all screen sizes */}
    <div className="relative overflow-hidden bg-white" id="map-container" style={{ 
      width: isMobile ? '100%' : 'min(850px, 100%)', 
      maxWidth: '100%', 
      height: isMobile ? (mapType === 'expansion' ? '358px' : '303px') : '532px' 
    }}>
                {/* Map Content Container - Centered and Contained */}
                <div className="relative w-full h-full mobile-main-container flex items-center justify-center" style={{ overflow: 'visible', transform: isMobile ? 'translateY(450px) translateX(48px)' : 'translateY(450px) translateX(0px)' }}>
            {/* Nomination Buttons - Top Right */}
            {/* Classic Map Nomination Button */}
            {mapType === 'classic' && (
              <button
                onClick={handleNominateClassicMap}
                disabled={isGenerating || hexagons.length === 0 || isNominating}
                className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                id="nomination-star-button"
                title={tCatan('nominateThisClassicMap')}
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
                title={tCatan('nominateThisExpansionMap')}
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
            
            

            
          {/* Map Content Wrapper - Centered and Contained */}
          <div className="flex items-center justify-center w-full h-full overflow-hidden">
            {/* Map Container - Responsive size */}
            <div className="relative max-w-full max-h-full" style={{ width: '615px', height: '532px', maxWidth: '100%', maxHeight: '100%' }}>
               {/* Classic Map - Hidden on mobile */}
               {mapType === 'classic' && (
               <div className="hidden sm:block" style={{ position: "relative", width: "100%", height: "100%" }}>
                 {/* Tiles/Numbers Container - Original dimensions restored */}
          <div className="mobile-map-container classic-map" style={{
                   transform: `translate(${tilesPosition.x}px, ${tilesPosition.y}px) scale(1)`,
            transformOrigin: 'center center',
            position: 'relative',
                   marginLeft: '0px',
                   width: '615px',
                   height: '532px',
                   overflow: 'visible',
                 }}>
                  {/* Base Map - Original dimensions restored */}
                  <img
                    src={customRules.imageStyle === 'classic' ? '/CatanMapGenerator/ClassicCatanMap.svg' : '/CatanMapGenerator/CatanMap.svg'}
            alt="Catan Map Background"
            loading="eager"
            style={{
              position: "absolute",
                       width: 'auto',
                       height: 'auto',
                       maxWidth: '615px',
                       maxHeight: '532px',
                       top: '50%',
                       left: '50%',
                       transform: 'translate(-50%, -50%)',
                       zIndex: 0,
                       objectFit: 'contain',
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
                          loading="eager"
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
                        loading="eager"
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
            
            {/* Expansion Map - Hidden on mobile */}
            {mapType === 'expansion' && (
              <div className="hidden sm:block" style={{ position: "relative", width: "100%", height: "100%" }}>
                {/* Tiles/Numbers Container - Original dimensions restored */}
                <div className="mobile-map-container" style={{
                  transform: `translate(0px, 0px) scale(0.6)`, // Desktop expansion map - centered at 0,0
                  transformOrigin: 'center center',
                  position: 'relative',
                  marginTop: '0px',
                  marginLeft: '0px',
                  width: '1025px', // Scale up to account for 0.6 scaling
                  height: '887px', // Scale up to account for 0.6 scaling
                  overflow: 'visible',
                }}>
                  {/* Base Map - Positioned at new center reference */}
                  <img
                    src="/CatanMapGenerator/ExpCatanMap.svg"
                    alt="Catan Expansion Map Background"
                    loading="eager"
                    style={{
                      position: "absolute",
                      width: 'auto',
                      height: 'auto',
                      maxWidth: '1025px', // Scale up to account for 0.6 scaling
                      maxHeight: '887px', // Scale up to account for 0.6 scaling
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-89%, -84%)', // Keep the perfect positioning as new center
                      zIndex: 0,
                      objectFit: 'contain',
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
                  loading="eager"
                  style={{
                    position: "absolute",
                    width: `${tileWidth}px`,
                    height: `${tileHeight}px`,
                            left: `${pos.x - tileWidth / 2 - 483}px`, // Keep the perfect positioning as new center
                            top: `${pos.y - tileHeight / 2 - 285}px`, // Keep the perfect positioning as new center
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
                        loading="eager"
                    style={{
                      position: "absolute",
                              width: '57.4754px',
                              height: '57.4754px',
                              left: `${pos.x + (233 - 57.4754) / 2 - 115 - 483}px`, // Keep the perfect positioning as new center
                              top: `${pos.y + (201 - 57.4754) / 2 - 100 - 285}px`, // Keep the perfect positioning as new center
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
            </div> {/* End Map Container */}
        </div>
      </div>

        {/* Smartphone View Maps - Only visible on mobile */}
        <div className="block sm:hidden">
          {/* Mobile Classic Map */}
          {mapType === 'classic' && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {/* Mobile Classic Map Nomination Button */}
              <button
                onClick={handleNominateClassicMap}
                disabled={isGenerating || hexagons.length === 0 || isNominating}
                className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                id="nomination-star-button-mobile"
                title={tCatan('nominateThisClassicMap')}
                style={{ zIndex: 99999, pointerEvents: 'auto' }}
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
              
              {/* Tiles/Numbers Container - Scaled down desktop version */}
              <div className="mobile-map-container classic-map" style={{
                transform: `translate(${tilesPosition.x - 134}px, ${tilesPosition.y - 164}px) scale(0.57)`,
                transformOrigin: 'center center',
                position: 'relative',
                marginTop: '-350px',
                marginLeft: '0px',
                width: '615px',
                height: '532px',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 1,
              }}>
                {/* Base Map - Inside tiles container */}
                <img
                  src={customRules.imageStyle === 'classic' ? '/CatanMapGenerator/ClassicCatanMap.svg' : '/CatanMapGenerator/CatanMap.svg'}
                  alt="Catan Map Background"
                  loading="eager"
                  style={{
                    position: "absolute",
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '615px',
                    maxHeight: '532px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 0,
                    objectFit: 'contain',
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
                    <div key={`mobile-tile-${i}`}>
                      <img
                        key={`mobile-tile-${i}`}
                        src={getResourceImage(hexagon.type)}
                        alt={`Catan ${hexagon.type} resource tile`}
                        loading="eager"
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
                          key={`mobile-num-${i}`}
                        src={getNumberImage(hexagon.number)}
                        alt={`Catan number token ${hexagon.number}`}
                        loading="eager"
                          style={{
                            position: "absolute",
                            width: `${NUMBER_WIDTH}px`,
                            height: `${NUMBER_HEIGHT}px`,
                            left: `${pos.x + (235 * SCALE_FACTOR - NUMBER_WIDTH) / 2 - 2}px`,
                            top: `${pos.y + (275 * SCALE_FACTOR - NUMBER_HEIGHT) / 2 - 1}px`,
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

      {/* Mobile Expansion Map */}
      {mapType === 'expansion' && (
        <div style={{ position: "relative", width: "100%", height: "100%", paddingBottom: "20px" }}>
          {/* Mobile Expansion Map Nomination Button */}
          <button
            onClick={handleNominateExpansionMap}
            disabled={isGenerating || hexagons.length === 0 || isNominating}
            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            id="nomination-star-button-expansion"
            title={tCatan('nominateThisExpansionMap')}
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
              
              {/* Tiles/Numbers Container - Scaled down desktop version */}
              <div className="mobile-map-container" style={{
                transform: `translate(${tilesPosition.x - 205}px, ${tilesPosition.y - 196}px) scale(0.398)`,
                transformOrigin: 'center center',
                position: 'relative',
                marginTop: '-350px',
                marginLeft: '0px',
                width: '1025px', // Scale up to account for 0.6 scaling
                height: '887px', // Scale up to account for 0.6 scaling
                overflow: 'visible',
              }}>
                {/* Base Map - Inside tiles container */}
                <img
                  src="/CatanMapGenerator/ExpCatanMap.svg"
                  alt="Catan Expansion Map Background"
                  loading="eager"
                  style={{
                    position: "absolute",
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '1025px', // Scale up to account for 0.6 scaling
                    maxHeight: '887px', // Scale up to account for 0.6 scaling
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-89%, -84%)', // Keep the perfect positioning as new center
                    zIndex: 0,
                    objectFit: 'contain',
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
                    <div key={`mobile-tile-${i}`}>
                      <img
                        key={`mobile-tile-${i}`}
                        src={getResourceImage(hexagon.type)}
                        alt={`Catan ${hexagon.type} resource tile`}
                        loading="eager"
                        style={{
                          position: "absolute",
                          width: `${tileWidth}px`,
                          height: `${tileHeight}px`,
                          left: `${pos.x - tileWidth / 2 - 483}px`, // Keep the perfect positioning as new center
                          top: `${pos.y - tileHeight / 2 - 285}px`, // Keep the perfect positioning as new center
                          pointerEvents: "none",
                          zIndex: 1,
                          transform: 'scale(1)',
                          transformOrigin: 'center center'
                        }}
                      />
                      {hexagon.number && (
                        <img
                          key={`mobile-num-${i}`}
                        src={getNumberImage(hexagon.number)}
                        alt={`Catan number token ${hexagon.number}`}
                        loading="eager"
                          style={{
                            position: "absolute",
                            width: '57.4754px',
                            height: '57.4754px',
                            left: `${pos.x + (233 - 57.4754) / 2 - 115 - 483}px`, // Keep the perfect positioning as new center
                            top: `${pos.y + (201 - 57.4754) / 2 - 100 - 285}px`, // Keep the perfect positioning as new center
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Generation Custom Rules</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div>
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
                    disabled={mapType === 'expansion'}
                    onChange={(e) => handleCustomRuleChange('sameResourceCanTouch', e.target.checked)}
                  />
                  <span className={`text-base ${mapType === 'expansion' ? 'text-gray-500' : 'text-dark-700'}`}>
                    Same Resource Can Touch
                    {mapType === 'expansion' && <span className="ml-1 text-xs">(Required: Max 2 in line)</span>}
                  </span>
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
      </div>
      </div>
    </div>
  );
}
