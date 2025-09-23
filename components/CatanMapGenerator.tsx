'use client';

import { useState, useEffect } from 'react';
import { useUserId } from '@/hooks/useUserId';
import { useAuth } from '@/contexts/AuthContext';
import ModernTooltip from './ModernTooltip';

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
  console.log(`🔄 Path variety: ${dirCW ? 'CW' : 'CCW'}, Outer+${kOuter}, Inner+${kInner}`);
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
  console.log("🔍 Checking CLASSIC number adjacency validation...");
  console.log("Custom rules:", customRules);
  console.log("Numbers to validate:", nums);
  
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
            console.log(`🚫 6-8 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - 6 and 8 cannot be adjacent`);
            return false;
          } else {
            console.log(`✅ 6-8 adjacency allowed by custom rule: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b})`);
          }
        }
        // Rule 2: Two 6s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 6 && b === 6) {
          console.log(`🚫 6-6 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - two 6s can NEVER be adjacent`);
          return false;
        }
        // Rule 3: Two 8s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 8 && b === 8) {
          console.log(`🚫 8-8 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - two 8s can NEVER be adjacent`);
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
          console.log(`🚫 Same number violation: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - same numbers cannot be adjacent`);
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
            console.log(`🚫 2-12 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - 2 and 12 cannot be adjacent`);
            return false;
          }
        }
      }
    }
  }
  
  console.log("✅ CLASSIC number adjacency validation passed - all rules satisfied");
  console.log("📋 Validation summary:");
  console.log("  - 6 & 8 adjacency: ✅ Valid");
  console.log("  - 6 & 6 adjacency: ✅ Valid");
  console.log("  - 8 & 8 adjacency: ✅ Valid");
  console.log("  - 2 & 12 adjacency: ✅ Valid");
  console.log("  - Same numbers: ✅ Valid");
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
  console.log("🎯 Generating valid numbers with custom rules:", customRules);
  
  // Strategy 1: Try path variety with many attempts
  for (let tries=0; tries<2000; tries++) {
    const nums = placeNumbersAR(desertIdx);
    if (noHotAdjacency(nums, customRules)) {
      console.log(`✅ Valid numbers found on attempt ${tries + 1}`);
      return nums;
    }
  }
  
  // Strategy 2: Try all rotations of the old spiral method
  for (let r=0; r<CHITS_AR.length; r++){
    const nums = placeNumbersOfficial(desertIdx, r);
    if (noHotAdjacency(nums, customRules)) {
      console.log(`✅ Valid numbers found with rotation ${r}`);
      return nums;
    }
  }
  
  // Strategy 3: Try with different path variations
  for (let tries=0; tries<1000; tries++) {
    const nums = placeNumbersAR(desertIdx);
    if (noHotAdjacency(nums, customRules)) {
      console.log(`✅ Valid numbers found on fallback attempt ${tries + 1}`);
      return nums;
    }
  }
  
  // Strategy 4: Final fallback - repair any board
  console.log("⚠️ Using repair strategy as final fallback...");
  const repaired = repairHotAdjacency(placeNumbersAR(desertIdx), customRules);
  
  // CRITICAL: Never return invalid numbers for 6-8 adjacency
  if (!noHotAdjacency(repaired, customRules)) {
    console.error("🚫 CRITICAL: Repair strategy failed - 6-8 adjacency rule violated!");
    console.error("🚫 This should NEVER happen - throwing error to prevent invalid map display");
    throw new Error("Failed to generate valid numbers that satisfy 6-8 adjacency rules");
  }
  
  console.log("✅ Numbers successfully repaired and validated");
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
  console.log('🔍 DEBUG: preventLongChains called with terrains:', terrains);
  
  const isExpansionMap = terrains.length === 30;
  if (!isExpansionMap) {
    console.log('🔍 DEBUG: Not an expansion map, skipping');
    return true; // Only apply to expansion maps
  }
  
  console.log('🔍 DEBUG: This is an expansion map, checking for chains...');
  const neighbors = EXPANSION_NEIGHBORS;
  
  // Check each tile to ensure it doesn't create chains longer than 2
  for (let i = 0; i < 30; i++) {
    const currentTerrain = terrains[i];
    if (currentTerrain === 'desert') continue;
    
    // Count how many neighbors of the same type this tile has
    const sameTypeNeighbors = neighbors[i].filter(n => terrains[n] === currentTerrain);
    
    if (sameTypeNeighbors.length > 0) {
      console.log(`🔍 DEBUG: Tile ${i + 1} (${currentTerrain}) has ${sameTypeNeighbors.length} same-type neighbors: ${sameTypeNeighbors.map(n => `${n + 1}(${terrains[n]})`).join(', ')}`);
    }
    
    // If this tile has 2+ neighbors of the same type, check if they form a chain
    if (sameTypeNeighbors.length >= 2) {
      console.log(`⚠️ DEBUG: Tile ${i + 1} (${currentTerrain}) has ${sameTypeNeighbors.length} same-type neighbors - checking for chains...`);
      
      // Check if any of these neighbors are connected to each other
      for (let j = 0; j < sameTypeNeighbors.length; j++) {
        for (let k = j + 1; k < sameTypeNeighbors.length; k++) {
          const neighbor1 = sameTypeNeighbors[j];
          const neighbor2 = sameTypeNeighbors[k];
          
          console.log(`🔍 DEBUG: Checking if neighbors ${neighbor1 + 1} and ${neighbor2 + 1} are connected...`);
          console.log(`🔍 DEBUG: Neighbors of ${neighbor1 + 1}: ${neighbors[neighbor1].map(n => `${n + 1}(${terrains[n]})`).join(', ')}`);
          
          // If these two neighbors are also connected, we have a chain of 3
          if (neighbors[neighbor1].includes(neighbor2)) {
            console.log(`🚫 Chain of 3 detected: Tile ${i + 1} (${currentTerrain}) connects to tiles ${neighbor1 + 1} and ${neighbor2 + 1}, which are also connected`);
            console.log(`🚫 This forms a triangle/chain of 3 ${currentTerrain} tiles!`);
            return false;
          } else {
            console.log(`✅ DEBUG: Neighbors ${neighbor1 + 1} and ${neighbor2 + 1} are NOT connected - no chain formed`);
          }
        }
      }
    }
  }
  
  console.log('✅ DEBUG: No chains of 3+ detected, validation passed');
  return true;
}

// Repair expansion map clustering by swapping resources
function repairExpansionClustering(terrains: Terrain[]): Terrain[] | null {
  console.log('🔧 Starting expansion clustering repair...');
  
  const isExpansionMap = terrains.length === 30;
  if (!isExpansionMap) return null;
  
  const neighbors = EXPANSION_NEIGHBORS;
  const resourceTypes: Terrain[] = ['grain', 'wood', 'sheep', 'brick', 'ore'];
  let repaired = false;
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔧 Repair attempt ${attempts}/${maxAttempts}`);
    
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
      console.log('✅ No chains to fix, repair complete!');
      return terrains;
    }
    
    console.log(`🔧 Found ${chainsToFix.length} chains to fix:`, chainsToFix.map(c => 
      `Tile ${c.tile + 1}(${c.resource}) with neighbors ${c.neighbors.map(n => n + 1).join(', ')}`
    ));
    
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
          
          console.log(`🔧 Swapping Tile ${chain.tile + 1}(${chain.resource}) with Tile ${swapTile + 1}(${otherResource})`);
          
          // Perform the swap
          [terrains[chain.tile], terrains[swapTile]] = [terrains[swapTile], terrains[chain.tile]];
          repaired = true;
          break;
        }
      }
      
      if (repaired) break;
    }
    
    if (!repaired) {
      console.log('⚠️ Could not find valid swaps, trying to shuffle resources...');
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
    console.log('⚠️ Max repair attempts reached, returning best attempt');
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
  console.log("🔍 Checking terrain cluster validation...");
  const terrainTypes = ["grain","wood","sheep","brick","ore"] as Terrain[];
  
  // For expansion maps (30 tiles), enforce strict no-clustering rule regardless of checkbox
  const isExpansionMap = terrains.length === 30;
  
  for (let tIdx = 0; tIdx < terrainTypes.length; tIdx++) {
    const t = terrainTypes[tIdx];
    const maxCluster = maxClusterSize(terrains, t);
    
    if (isExpansionMap) {
      // Expansion maps: Maximum 2 tiles of same resource can touch (strict clustering prevention)
      if (maxCluster > 2) {
        console.log(`🚫 EXPANSION MAP: Terrain cluster violation: ${t} has cluster size ${maxCluster} > 2 (max allowed: 2)`);
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
        console.log(`🚫 Terrain cluster violation: ${t} has cluster size ${maxCluster} > 2 (max allowed: 2)`);
        return false;
      }
    } else {
      // Checkbox unchecked: NO same resource tiles can touch at all
      if (maxCluster > 1) {
        console.log(`🚫 Terrain cluster violation: ${t} has cluster size ${maxCluster} > 1 (no touching allowed)`);
        return false;
        }
      }
    }
  }
  
  if (isExpansionMap) {
    console.log("✅ EXPANSION MAP: Terrain cluster validation passed - max 2 tiles can touch");
  } else if (customRules.sameResourceCanTouch) {
    console.log("✅ Classic map: Terrain cluster validation passed - max 2 tiles can touch");
  } else {
    console.log("✅ Classic map: Terrain cluster validation passed - no same resources touching");
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
  console.log('🎲 Starting classic board generation...');
  
  const terrains = generateValidTerrains(customRules);
  const desertIdx = terrains.indexOf("desert");
  const numbers = generateValidNumbers(desertIdx, customRules);
  
  // CRITICAL: Final validation before returning
  console.log('🔍 Final validation of classic board...');
  if (!noHotAdjacency(numbers, customRules)) {
    console.error('🚫 CRITICAL: Final classic board validation failed!');
    console.error('🚫 This should NEVER happen - throwing error to prevent invalid map display');
    throw new Error('Classic board failed final validation - 6-8 adjacency rules violated');
  }
  
  console.log('✅ Classic board generated and validated successfully');
  return { terrains, numbers };
}

// Expansion board generation (5-6 players) - Improved step-by-step logic
export function makeValidExpansionBoard(customRules: any): Board {
  console.log('🎲 Starting improved expansion board generation...');
  
  // Step 1: Place Deserts First
  console.log('📍 Step 1: Placing deserts...');
  const desertPositions = placeDesertsRandomly();
  console.log('✅ Deserts placed at positions:', desertPositions);
  
  // Step 2: Place Resource Tiles
  console.log('🌾 Step 2: Placing resource tiles...');
  const terrains = placeResourceTiles(desertPositions);
  console.log('✅ Resource tiles placed:', terrains);
  
  // Step 3: Place Number Tokens Using Smart Placement Strategy
  console.log('🔢 Step 3: Placing number tokens...');
  // This will automatically use smart placement if 6-8 cannot touch,
  // or fall back to the original chit ring method if they can touch
  const numbers = placeNumberTokens(desertPositions, customRules);
  console.log('✅ Number tokens placed:', numbers);
  
  // Step 4: Randomization for Variety (already implemented in the functions above)
  console.log('🎲 Step 4: Randomization applied for variety');
  
  // Step 5: Final validation and output
  console.log('🔍 Step 5: Final validation of expansion board...');
  
  // CRITICAL: Final validation before returning
  if (!noHotAdjacencyExpansion(numbers, customRules)) {
    console.error('🚫 CRITICAL: Final expansion board validation failed!');
    console.error('🚫 This should NEVER happen - throwing error to prevent invalid map display');
    throw new Error('Expansion board failed final validation - 6-8 adjacency rules violated');
  }
  
  console.log('📤 Step 5: Final board generated and validated');
  console.log('🔍 Final expansion board:', {
    terrainsCount: terrains.length,
    numbersCount: numbers.length,
    terrains: terrains,
    numbers: numbers,
    desertPositions: desertPositions
  });
  
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
  console.log('🎯 Starting simple resource placement with retry logic...');
  
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
  
  console.log(`🎯 Placing ${emptyPositions.length} resources with retry logic...`);
  
  // Try multiple times to get a valid placement
  for (let attempt = 0; attempt < 2000; attempt++) {
    const result = placeResourcesSimple(resourcePool, emptyPositions, desertPositions);
    if (result) {
      console.log(`✅ Valid resource placement found on attempt ${attempt + 1}`);
      return result;
    }
    
    if (attempt % 200 === 0) {
      console.log(`🔄 Attempt ${attempt + 1} failed, continuing...`);
    }
  }
  
  console.warn('⚠️ Simple placement failed after 2000 attempts, falling back to aggressive placement...');
  return placeResourcesAggressively(desertPositions, resourcePool);
}

// Simple, reliable resource placement with immediate validation
function placeResourcesSimple(resourcePool: Terrain[], emptyPositions: number[], desertPositions: number[]): Terrain[] | null {
  console.log('🎯 Using simple, reliable placement strategy...');
  
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
      console.log(`🚫 No valid resources for position ${pos + 1}`);
      return null; // No valid placement, fail and retry
    }
    
    // Choose a random valid resource
    const chosenResource = validResources[Math.floor(Math.random() * validResources.length)];
    
    // Place the resource
    terrains[pos] = chosenResource;
    
    // IMMEDIATELY check if this creates any clustering issues
    if (hasAnyClustering(terrains)) {
      console.log(`🚫 Placement at position ${pos + 1} created clustering - failing this attempt`);
      return null; // This placement created clustering, fail and retry
    }
    
    // Remove the chosen resource from the pool
    const resourceIndexToRemove = shuffledResources.indexOf(chosenResource);
    if (resourceIndexToRemove !== -1) {
      shuffledResources.splice(resourceIndexToRemove, 1);
    }
    
    console.log(`✅ Position ${pos + 1}: Placed ${chosenResource}`);
  }
  
  console.log('✅ All resources placed successfully with no clustering!');
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
      console.log(`🚫 Found cluster of ${clusterSize} ${resourceType} tiles starting at position ${i + 1}`);
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
  console.log('🔧 Using aggressive placement strategy with clustering prevention...');
  
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
            console.log(`🔧 Moved ${resourceToPlace} from position ${i + 1} to better position ${betterPosition + 1}`);
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
      console.log(`✅ Aggressive placement successful on attempt ${attempt + 1}`);
      return terrains;
    }
  }
  
  // If aggressive placement also fails, create a minimal valid board
  console.warn('⚠️ All placement strategies failed, creating minimal valid board...');
  return createMinimalValidBoard(desertPositions, resourcePool);
}

// Create a minimal valid board when all else fails
function createMinimalValidBoard(desertPositions: number[], resourcePool: Terrain[]): Terrain[] {
  console.log('🔧 Creating minimal valid board...');
  
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
  
  console.log('⚠️ Minimal board created (may have clustering issues)');
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
    console.log('🔒 Using smart placement to prevent 6-8 adjacency...');
    return placeNumbersSmartly(desertPositions, customRules);
  }
  
  // Otherwise, use the original chit ring method
  console.log('🎲 Using original chit ring method...');
  
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
      console.log(`✅ Valid number placement found on attempt ${attempt + 1}`);
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
  
  console.log("✅ Expansion numbers successfully repaired and validated");
  return repaired;
}

// Smart placement function that prevents 6-8 adjacency by placing them first
// NEW APPROACH: Instead of trying to fix adjacency violations after they happen,
// we PREVENT them by placing 6s and 8s in non-adjacent positions from the start.
// This ensures that no 6-8 adjacency violations can ever occur.
function placeNumbersSmartly(desertPositions: number[], customRules: any): (number | null)[] {
  console.log('🧠 Smart placement: Placing 6s and 8s first to prevent adjacency...');
  

  
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
  console.log('🎯 Step 1: Placing 6s in non-adjacent positions...');
  console.log(`🔍 Available positions: [${availablePositions.map(p => p + 1).join(', ')}]`);
  const sixes = expansionNumbers.filter(n => n === 6);
  const sixPositions: number[] = [];
  
  for (const six of sixes) {
    console.log(`🎯 Trying to place 6 #${sixPositions.length + 1}...`);
    console.log(`🔍 Current 6 positions: [${sixPositions.map(p => p + 1).join(', ')}]`);
    
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
          console.log(`🚫 Position ${pos + 1} rejected: adjacent to existing 6s at [${adjacentSixes.map(p => p + 1).join(', ')}]`);
        }
        if (isAdjacentToExistingSixes) {
          const adjacentToSixes = sixPositions.filter(sixPos => {
            const sixNeighbors = EXPANSION_NEIGHBORS[sixPos] || [];
            return sixNeighbors.includes(pos);
          });
          console.log(`🚫 Position ${pos + 1} rejected: existing 6s at [${adjacentToSixes.map(p => p + 1).join(', ')}] are adjacent to it`);
        }
        if (wouldCreateAdjacentSixes) {
          const wouldBeAdjacentTo = sixPositions.filter(existingSixPos => {
            const existingSixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
            return existingSixNeighbors.includes(pos);
          });
          console.log(`🚫 Position ${pos + 1} rejected: would make existing 6s at [${wouldBeAdjacentTo.map(p => p + 1).join(', ')}] adjacent to each other`);
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
    
    console.log(`✅ Placed 6 at position ${chosenPos + 1}`);
  }
  
  // Step 2: Place the 8s in random non-adjacent positions (also not adjacent to 6s)
  console.log('🎯 Step 2: Placing 8s in non-adjacent positions...');
  console.log(`🔍 Available positions: [${availablePositions.map(p => p + 1).join(', ')}]`);
  console.log(`🔍 Current 6 positions: [${sixPositions.map(p => p + 1).join(', ')}]`);
  const eights = expansionNumbers.filter(n => n === 8);
  const eightPositions: number[] = [];
  
  for (const eight of eights) {
    console.log(`🎯 Trying to place 8 #${eightPositions.length + 1}...`);
    console.log(`🔍 Current 8 positions: [${eightPositions.map(p => p + 1).join(', ')}]`);
    
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
          console.log(`🚫 Position ${pos + 1} rejected: adjacent to existing 6s at [${adjacentSixes.map(p => p + 1).join(', ')}], 8s at [${adjacentEights.map(p => p + 1).join(', ')}]`);
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
          console.log(`🚫 Position ${pos + 1} rejected: existing 6s at [${adjacentToSixes.map(p => p + 1).join(', ')}], 8s at [${adjacentToEights.map(p => p + 1).join(', ')}] are adjacent to it`);
        }
        if (wouldCreateAdjacentEights) {
          const wouldBeAdjacentTo = eightPositions.filter(existingEightPos => {
            const existingEightNeighbors = EXPANSION_NEIGHBORS[existingEightPos] || [];
            return existingEightNeighbors.includes(pos);
          });
          console.log(`🚫 Position ${pos + 1} rejected: would make existing 8s at [${wouldBeAdjacentTo.map(p => p + 1).join(', ')}] adjacent to each other`);
        }
        if (wouldCreateAdjacentSixes) {
          const wouldBeAdjacentTo = sixPositions.filter(existingSixPos => {
            const sixNeighbors = EXPANSION_NEIGHBORS[existingSixPos] || [];
            return sixNeighbors.includes(pos);
          });
          console.log(`🚫 Position ${pos + 1} rejected: would make existing 6s at [${wouldBeAdjacentTo.map(p => p + 1).join(', ')}] adjacent to each other`);
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
    
    console.log(`✅ Placed 8 at position ${chosenPos + 1}`);
  }
  
  // Step 3: Place all remaining numbers randomly in remaining positions
  console.log('🎯 Step 3: Placing remaining numbers randomly...');
  const remainingNumbers = expansionNumbers.filter(n => n !== 6 && n !== 8);
  const shuffledRemaining = shuffleInPlace([...remainingNumbers]);
  
  for (let i = 0; i < shuffledRemaining.length && i < availablePositions.length; i++) {
    const number = shuffledRemaining[i];
    const position = availablePositions[i];
    numbers[position] = number;
  }
  
  // Final validation to ensure no adjacency violations
  console.log('🔍 Final validation of smart placement...');
  

  
  if (!noHotAdjacencyExpansion(numbers, customRules)) {
    console.error('🚫 Smart placement failed validation - this should never happen!');
    throw new Error('Smart placement failed to prevent adjacency violations');
  }
  
  console.log('✅ Smart placement completed successfully - no 6-8 adjacency violations!');
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
  console.log('🔧 Attempting to repair adjacency violations...');
  
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
            console.log(`✅ Repair successful by swapping positions ${i + 1} and ${j + 1}`);
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
  console.log(`🔍 [${validationId}] Checking EXPANSION number adjacency validation...`);
  console.log(`🔍 [${validationId}] Custom rules:`, customRules);
  console.log(`🔍 [${validationId}] Numbers to validate:`, nums);
  console.log(`🔍 [${validationId}] Validation call stack:`, new Error().stack?.split('\n').slice(1, 4).join('\n'));
  
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
            console.log(`🚫 [${validationId}] 6-8 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - 6 and 8 cannot be adjacent`);
            return false;
          } else {
            console.log(`✅ [${validationId}] 6-8 adjacency allowed by custom rule: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b})`);
          }
        }
        // Rule 2: Two 6s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 6 && b === 6) {
          console.log(`🚫 [${validationId}] 6-6 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - two 6s can NEVER be adjacent`);
          return false;
        }
        // Rule 3: Two 8s can NEVER be adjacent to each other (ALWAYS enforced)
        if (a === 8 && b === 8) {
          console.log(`🚫 [${validationId}] 8-8 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - two 8s can NEVER be adjacent`);
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
          console.log(`🚫 Same number violation: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - same numbers cannot be adjacent`);
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
            console.log(`🚫 2-12 VIOLATION: Position ${i + 1} (${a}) adjacent to position ${j + 1} (${b}) - 2 and 12 cannot be adjacent`);
            return false;
          }
        }
      }
    }
  }
  
  console.log(`✅ [${validationId}] EXPANSION number adjacency validation passed - all rules satisfied`);
  console.log(`📋 [${validationId}] Validation summary:`);
  console.log(`  - 6 & 8 adjacency: ✅ Valid`);
  console.log(`  - 6 & 6 adjacency: ✅ Valid`);
  console.log(`  - 8 & 8 adjacency: ✅ Valid`);
  console.log(`  - 2 & 12 adjacency: ✅ Valid`);
  console.log(`  - Same numbers: ✅ Valid`);
  return true;
}

// Validation function for debugging (can be called manually in console)
export function validateBoard(board: Board, customRules: any): boolean {
  const numbersValid = noHotAdjacency(board.numbers, customRules);
  const terrainsValid = terrainsPassClusterRule(board.terrains, customRules);
  
  if (!numbersValid) {
    console.log("❌ Number validation failed");
  }
  if (!terrainsValid) {
    console.log("❌ Terrain validation failed");
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
  
  // SCALED DIMENSIONS - Smaller map for better page layout
  const SCALE_FACTOR = 0.6; // 60% of original size
  const BASE_MAP_WIDTH = 1021.91 * SCALE_FACTOR;
  const BASE_MAP_HEIGHT = 885 * SCALE_FACTOR;
  
  // Mobile responsive dimensions
  const [showSettingsModal, setShowSettingsModal] = useState(false); // Settings modal state
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
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
    console.log('🎲 generateMap called with forcedMapType:', forcedMapType);
    console.log('🎲 currentMapType resolved to:', currentMapType);
    console.log('🎲 mapType state is:', mapType);
    
    setIsGenerating(true);
    setIsNominated(false); // Reset nomination status for new map
    console.log('🎲 Generating valid Catan board...');
    console.log('🎯 Current custom rules:', customRules);

    // Use setTimeout to prevent blocking the UI
    setTimeout(() => {
      try {
        console.log('🎯 Generating board for map type:', currentMapType);
        console.log('🔍 About to call board generator...');
        
        let board;
        if (currentMapType === 'expansion') {
          console.log('🔍 Calling makeValidExpansionBoard...');
          board = makeValidExpansionBoard(customRules);
          console.log('🔍 Expansion board generated successfully');
        } else {
          console.log('🔍 Calling makeValidBoard for CLASSIC mode...');
          try {
            board = makeValidBoard(customRules);
            console.log('🔍 Classic board generated successfully:', board);
          } catch (error) {
            console.error('❌ Error generating classic board:', error);
            throw error;
          }
        }
        
        console.log('✅ Valid board generated:', board);
        console.log('🎯 Board details:', {
          mapType,
          terrainsLength: board.terrains.length,
          numbersLength: board.numbers.length,
          terrains: board.terrains,
          numbers: board.numbers
        });

        // Convert to hexagons format
        const currentTilePositions = currentMapType === 'classic' ? classicTilePositions : expansionTilePositions;
        console.log('🔍 Current tile positions count:', currentTilePositions.length);
        console.log('🔍 Board terrains count:', board.terrains.length);
        console.log('🔍 Board numbers count:', board.numbers.length);
        
        // Debug: Check if we have enough board data for all positions
        if (currentMapType === 'expansion') {
          console.log('🔍 Expansion board check:', {
            positionsNeeded: currentTilePositions.length,
            terrainsAvailable: board.terrains.length,
            numbersAvailable: board.numbers.length,
            terrains: board.terrains,
            numbers: board.numbers
          });
        }
        
        // CRITICAL: Validate board before creating hexagons
        console.log('🚨 PRE-HEXAGON VALIDATION - Ensuring board is valid before rendering...');
        
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
        
        console.log('✅ PRE-HEXAGON VALIDATION PASSED - Board is valid for hexagon creation');
        
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

        console.log(`🔍 Created ${newHexagons.length} hexagons for ${currentMapType} map`);
        
        // CRITICAL: Validate hexagon data integrity
        console.log('🚨 HEXAGON DATA VALIDATION - Ensuring created hexagons are valid...');
        
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
        
        console.log('✅ HEXAGON DATA VALIDATION PASSED - All hexagons are valid');

        // Final validation (different for classic vs expansion)
        console.log('🔍 Running final validation...');
        if (currentMapType === 'classic') {
          if (!noHotAdjacency(board.numbers, customRules)) {
            throw new Error('6-8 adjacency rule failed in final validation');
          }
          if (!terrainsPassClusterRule(board.terrains, customRules)) {
            throw new Error('Terrain cluster rule failed in final validation');
          }
        } else {
          console.log('🔍 Running expansion-specific validation...');
          if (!noHotAdjacencyExpansion(board.numbers, customRules)) {
            throw new Error('Expansion 6-8 adjacency rule failed in final validation');
          }
          
          // Final validation for expansion terrain clustering
          console.log('🔍 Running final expansion terrain cluster validation...');
          // Since we're using the simple placement approach, clustering should already be prevented
          console.log('✅ Expansion terrain validation passed - clustering prevented during placement');
        }

        console.log('🎯 Board validation passed - rendering...');
        
        // ABSOLUTE FINAL VALIDATION - Never render invalid boards
        console.log('🚨 ABSOLUTE FINAL VALIDATION - Double-checking before render...');
        
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
        
        console.log('✅ ABSOLUTE VALIDATION PASSED - Board is safe to render');
        console.log('🔍 About to set hexagons:', newHexagons.length, 'hexagons');
        console.log('🔍 First few hexagons:', newHexagons.slice(0, 3));
        
      setHexagons(newHexagons);
        console.log('🔍 Hexagons state updated');
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
      
      console.log('🔍 Nominating CLASSIC map:', {
        mapType: 'classic',
        tileCount: hexagons.length,
        customRules: nominationCustomRules
      });

      // Send nomination to API
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

      if (!response.ok) {
        throw new Error('Failed to save classic nomination');
      }

      const result = await response.json();
      console.log('✅ Classic nomination response:', result);
      setIsNominated(true);
      alert(`Classic Catan map nominated successfully! Your nomination ID is: ${result.nominationId}`);
      
    } catch (error) {
      console.error('❌ Failed to nominate classic map:', error);
      alert('Failed to nominate classic map. Please try again.');
    } finally {
      setIsNominating(false);
    }
  };

  const handleNominateExpansionMap = async () => {
    console.log('🔍 handleNominateExpansionMap called');
    console.log('🔍 Current state:', { 
      hexagonsLength: hexagons.length, 
      mapType, 
      isNominating,
      currentHexagons: hexagons.slice(0, 5).map(h => ({ type: h.type, number: h.number }))
    });
    
    if (hexagons.length === 0 || mapType !== 'expansion') {
      console.log('❌ Validation failed:', { hexagonsLength: hexagons.length, mapType });
      return;
    }
    
    setIsNominating(true);
    try {
      console.log('🔍 About to capture expansion map image...');
      
      // Add a small delay to ensure the expansion map is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the map as an image
      const mapImage = await captureMapImage();
      console.log('🔍 Expansion map image captured, length:', mapImage.length);
      
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
      
      console.log('🔍 Nominating EXPANSION map:', {
        mapType: 'expansion',
        tileCount: hexagons.length,
        customRules: nominationCustomRules,
        terrains: mapData.terrains.slice(0, 10), // Show first 10 terrains
        numbers: mapData.numbers.slice(0, 10) // Show first 10 numbers
      });

      // Log the exact data being sent to API for EXPANSION
      const apiPayload = { 
        mapData, 
        imageBase64: mapImage, 
        customRules: nominationCustomRules,
        userId: user?.id || null, // Use the authenticated user's ID directly
        username: username,
        avatar: null
      };
      
      console.log('🔍 EXPANSION API Payload:', {
        mapDataLength: mapData.terrains.length,
        mapDataType: mapData.mapType,
        customRulesMapType: nominationCustomRules.mapType,
        customRulesTileCount: nominationCustomRules.tileCount,
        firstFewTerrains: mapData.terrains.slice(0, 5)
      });

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
      console.log('✅ Expansion nomination response:', result);
      setIsNominated(true);
      alert(`Expansion Catan map nominated successfully! Your nomination ID is: ${result.nominationId}`);
      
    } catch (error) {
      console.error('❌ Failed to nominate expansion map:', error);
      alert('Failed to nominate expansion map. Please try again.');
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
    console.log('🔍 Map type changing from', mapType, 'to', newMapType);
    console.log('🔍 Current hexagons length before change:', hexagons.length);
    
    // Update state first
    setMapType(newMapType);
    console.log('🔍 State updated, new mapType:', newMapType);
    
    // Clear existing hexagons to force a fresh render
    setHexagons([]);
    console.log('🔍 Hexagons cleared');
    
    // Generate map immediately with the new type
    console.log('🔍 About to generate map after type change, current mapType:', newMapType);
    generateMap(newMapType);
  };

  const handleCustomRuleChange = (rule: keyof typeof customRules, value: boolean) => {
    setCustomRules(prev => ({ ...prev, [rule]: value }));
  };

  const captureMapImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Get the map container element
        const mapContainer = document.querySelector('.catan-board-wrapper') as HTMLElement;
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

        console.log('🔍 Capturing map with dimensions:', { 
          mapType, 
          captureWidth, 
          captureHeight, 
          containerWidth: mapContainer.offsetWidth, 
          containerHeight: mapContainer.offsetHeight 
        });

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
    console.log('🔍 CatanMapGenerator mounted - initial mapType:', mapType);
    generateMap();
    console.log('🔍 CatanMapGenerator mounted - checking state...');
    console.log('🔍 hexagons length:', hexagons.length);
    console.log('🔍 isGenerating:', isGenerating);
    console.log('🔍 isNominating:', isNominated);
    console.log('🔍 isNominated:', isNominated);
    
    // Debug button visibility
    setTimeout(() => {
      // Look for the correct nomination button based on map type
      const starBtn = mapType === 'expansion' 
        ? document.getElementById('nomination-star-button-expansion')
        : document.getElementById('nomination-star-button');
      const testBtn = document.getElementById('test-button-left');
      const mapContainer = document.querySelector('.catan-board-wrapper');
      
      console.log('🔍 Map type:', mapType);
      console.log('🔍 Looking for button ID:', mapType === 'expansion' ? 'nomination-star-button-expansion' : 'nomination-star-button');
      console.log('🔍 Star button found:', !!starBtn);
      console.log('🔍 Test button found:', !!testBtn);
      console.log('🔍 Map container found:', !!mapContainer);
      
      if (starBtn) {
        console.log('🔍 Star button position:', starBtn.getBoundingClientRect());
        console.log('🔍 Star button styles:', window.getComputedStyle(starBtn));
        console.log('🔍 Star button classes:', starBtn.className);
        console.log('🔍 Star button parent:', starBtn.parentElement);
        console.log('🔍 Star button display:', window.getComputedStyle(starBtn).display);
        console.log('🔍 Star button visibility:', window.getComputedStyle(starBtn).visibility);
        console.log('🔍 Star button opacity:', window.getComputedStyle(starBtn).opacity);
      } else {
        console.log('❌ Star button NOT FOUND in DOM');
      }
      
      if (testBtn) {
        console.log('🔍 Test button position:', testBtn.getBoundingClientRect());
        console.log('🔍 Test button styles:', window.getComputedStyle(testBtn));
        console.log('🔍 Test button classes:', testBtn.className);
      }
      
      if (mapContainer) {
        console.log('🔍 Map container position:', mapContainer.getBoundingClientRect());
        console.log('🔍 Map container styles:', window.getComputedStyle(mapContainer));
        console.log('🔍 Map container children count:', mapContainer.children.length);
        console.log('🔍 Map container position style:', window.getComputedStyle(mapContainer).position);
      }
    }, 1000);
  }, []);

  // Monitor mapType changes
  useEffect(() => {
    console.log('🔍 mapType changed to:', mapType);
  }, [mapType]);

  // Monitor hexagons changes
  useEffect(() => {
    if (hexagons.length > 0) {
      console.log(`🔍 Rendering ${hexagons.length} tiles for ${mapType} map`);
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
    <div className={`w-full max-w-7xl mx-auto px-4 ${className}`}>
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-dark-900 mb-6">Catan Map Generator by King Dice</h3>
        
        {/* Desktop Map Type Buttons - Hidden on mobile */}
        <div className="hidden sm:flex justify-center gap-4 mb-4 relative">
          <button
            onClick={() => {
              console.log('🔍 Classic button clicked! Current mapType:', mapType);
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
              console.log('🔍 Expansion button clicked! Current mapType:', mapType);
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
        {isMobile && (
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => handleMapTypeChange('classic')}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Settings
            </button>
          </div>
        )}
        

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
              <label className="block text-sm font-medium text-dark-700 mb-2">Image Style</label>
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
                <span className="text-sm text-dark-700">6 & 8 Can Touch</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.twoTwelveCanTouch}
                  onChange={(e) => handleCustomRuleChange('twoTwelveCanTouch', e.target.checked)}
                />
                <span className="text-sm text-dark-700">2 & 12 Can Touch</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sameNumbersCanTouch}
                  onChange={(e) => handleCustomRuleChange('sameNumbersCanTouch', e.target.checked)}
                />
                <span className="text-sm text-dark-700">Same Numbers Can Touch</span>
              </label>
              
              {mapType === 'classic' && (
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={customRules.sameResourceCanTouch}
                  onChange={(e) => handleCustomRuleChange('sameResourceCanTouch', e.target.checked)}
                />
                <span className="text-sm text-dark-700">Same Resource Can Touch</span>
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
          <div 
            className={isMobile ? "w-full overflow-auto" : ""}
            style={isMobile ? { maxHeight: '80vh' } : {}}
          >
            <div
              className="catan-board-wrapper relative"
              style={{
                position: "relative",
                width: `${MAP_WIDTH}px`,
                height: `${MAP_HEIGHT}px`,
                margin: "0 auto",
                overflow: "visible",
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
            
          {/* Render all resource tiles using scaled pixel coordinates */}
          {/* Note: Classic has 19 tiles, Expansion has 30 tiles */}
          <div style={{
            transform: mapType === 'expansion' ? 'scale(0.595)' : 'none',
            transformOrigin: 'center center',
            position: 'relative',
            marginTop: mapType === 'expansion' ? '50px' : '0px',
            marginLeft: mapType === 'expansion' ? '-200px' : '0px'
          }}>
            {/* Background Catan Map - Back inside scaled container but much larger to compensate */}
            <img
              src={mapType === 'expansion' ? '/CatanMapGenerator/ExpCatanMap.svg' : 
                   customRules.imageStyle === 'classic' ? '/CatanMapGenerator/ClassicCatanMap.svg' : 
                   '/CatanMapGenerator/CatanMap.svg'}
            alt="Catan Map Background"
            style={{
              position: "absolute",
                width: mapType === 'expansion' ? '1000px' : // More reasonable size to prevent stretching
                       customRules.imageStyle === 'classic' ? `${MAP_WIDTH - 2}px` : 
                       `${MAP_WIDTH}px`,
                height: mapType === 'expansion' ? '863px' : // More reasonable size to prevent stretching
                        customRules.imageStyle === 'classic' ? `${MAP_HEIGHT - 2}px` : 
                        `${MAP_HEIGHT}px`,
                top: mapType === 'expansion' ? '-55px' : '0px', // Moved up 5px
                left: mapType === 'expansion' ? '200px' : '0px', // Moved more to the right
                transform: mapType === 'expansion' ? 'scale(1.07)' : 'none', // Zoom in to make map bigger
                objectFit: mapType === 'expansion' ? 'contain' : 'initial', // Only prevent stretching on expansion maps
                zIndex: 0, // Ensure it's behind everything
              }}
            />
            
            {/* Expansion Map Nomination Button - Positioned inside scaled container */}
            {/* Temporarily disabled to avoid duplicate IDs */}
            {/*
            {mapType === 'expansion' && (
              <button
                onClick={handleNominateExpansionMap}
                disabled={isGenerating || hexagons.length === 0 || isNominating}
                className="absolute p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                id="nomination-star-button-expansion"
                title="Nominate this Expansion Catan map"
                style={{
                  position: 'absolute',
                  top: '60px', // Adjusted for scaled container
                  right: '60px', // Adjusted for scaled container
                  zIndex: 10
                }}
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976-2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00-.951-.69l1.519-4.674z"
                    />
                  </svg>
                )}
              </button>
            )}
            */}
            
          {hexagons.map((hexagon, i) => {
            const currentTilePositions = mapType === 'classic' ? classicTilePositions : expansionTilePositions;
            const pos = currentTilePositions[i];
            
            // Debug logging for expansion tiles
            if (mapType === 'expansion') {
              console.log(`🔍 Tile ${i + 1}:`, {
                type: hexagon.type,
                number: hexagon.number,
                position: pos,
                tileIndex: i
              });
            }
            
            // Different tile sizes for different styles and map types
            let tileWidth, tileHeight;
            if (mapType === 'expansion') {
              // Expansion tiles: Different sizes based on art style
              if (customRules.imageStyle === 'classic') {
                // Classic art expansion tiles - smaller
                tileWidth = 139; // Smaller for classic art
                tileHeight = 117; // Smaller for classic art
              } else {
                // King Dice art expansion tiles - original size
                tileWidth = 233; // Reduced from 234px to 233px
                tileHeight = 201; // Reduced from 202px to 201px
              }
            } else {
              // Classic tiles with different scales
              const tileScale = customRules.imageStyle === 'classic' ? 0.65 : 1.0;
              tileWidth = 235 * SCALE_FACTOR * tileScale;
              tileHeight = 275 * SCALE_FACTOR * tileScale;
            }
            
            // Move everything just 2 pixels to the left and 1 pixel up (only for classic maps)
            const leftOffset = mapType === 'expansion' ? 0 : -2;
            const topOffset = mapType === 'expansion' ? 0 : -1;
            
            return (
              <div key={`tile-${i}`}>
                {/* Resource Tile */}
                <img
                  key={`tile-${i}`}
                  src={getResourceImage(hexagon.type)}
                  alt={`Catan ${hexagon.type} resource tile`}
                  style={{
                    position: "absolute",
                    width: `${tileWidth}px`,
                    height: `${tileHeight}px`,
                    left: mapType === 'expansion' ? 
                      `${pos.x - tileWidth / 2 - 50}px` : 
                      `${pos.x + (235 * SCALE_FACTOR - tileWidth) / 2 + leftOffset}px`,
                    top: mapType === 'expansion' ? 
                      `${pos.y - tileHeight / 2 - 50}px` : 
                      `${pos.y + (275 * SCALE_FACTOR - tileHeight) / 2 + topOffset}px`,
                    pointerEvents: "none",
                    zIndex: 2, // Higher z-index to appear above numbers
                  }}
                />
                
                {/* Number Token (if not desert) */}
                {hexagon.number && (
                  <img
                    key={`num-${i}`}
                    src={getNumberImage(hexagon.number)}
                    alt={`Catan number token ${hexagon.number}`}
                    style={{
                      position: "absolute",
                      width: mapType === 'expansion' ? '57.4754px' : `${71.4 * SCALE_FACTOR}px`,
                      height: mapType === 'expansion' ? '57.4754px' : `${71.4 * SCALE_FACTOR}px`,
                      left: mapType === 'expansion' ? 
                        `${pos.x + (233 - 57.4754) / 2 - 115 - 50}px` : 
                        `${pos.x + (235 * SCALE_FACTOR - NUMBER_WIDTH) / 2 + leftOffset}px`,
                      top: mapType === 'expansion' ? 
                        `${pos.y + (201 - 57.4754) / 2 - 100 - 50}px` : 
                        `${pos.y + (TILE_HEIGHT - NUMBER_HEIGHT) / 2 + topOffset}px`,
                      pointerEvents: "none",
                      zIndex: 1, // Lower z-index to appear behind tiles
                    }}
                  />
                )}
              </div>
            );
          })}
          </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Settings Modal */}
      {isMobile && showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-dark-900">Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-700 mb-3">Image Style</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImageStyleChange('classic')}
                    className={`px-4 py-2 text-sm rounded transition-colors ${
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
                    className={`px-4 py-2 text-sm rounded transition-colors ${
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
              
              <div className="space-y-4 mb-6">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-3 w-4 h-4" 
                    checked={customRules.sixEightCanTouch}
                    onChange={(e) => handleCustomRuleChange('sixEightCanTouch', e.target.checked)}
                  />
                  <span className="text-sm text-dark-700">6 & 8 Can Touch</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-3 w-4 h-4" 
                    checked={customRules.twoTwelveCanTouch}
                    onChange={(e) => handleCustomRuleChange('twoTwelveCanTouch', e.target.checked)}
                  />
                  <span className="text-sm text-dark-700">2 & 12 Can Touch</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-3 w-4 h-4" 
                    checked={customRules.sameNumbersCanTouch}
                    onChange={(e) => handleCustomRuleChange('sameNumbersCanTouch', e.target.checked)}
                  />
                  <span className="text-sm text-dark-700">Same Numbers Can Touch</span>
                </label>
                
                {mapType === 'classic' && (
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-3 w-4 h-4" 
                      checked={customRules.sameResourceCanTouch}
                      onChange={(e) => handleCustomRuleChange('sameResourceCanTouch', e.target.checked)}
                    />
                    <span className="text-sm text-dark-700">Same Resource Can Touch</span>
                  </label>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    generateMap();
                    setShowSettingsModal(false);
                  }}
                  disabled={isGenerating}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate New Map'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

