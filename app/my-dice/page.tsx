"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import ModernTooltip from "@/components/ModernTooltip";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { getTranslatedAssetName } from '@/lib/asset-name-translations';
import { getTranslatedTitle } from '@/lib/title-translations';

type TabKey =
  | "background"
  | "dice"
  | "pattern"
  | "accessories"
  | "hat"
  | "item"
  | "companion"
  | "title";

// TABS will be defined inside component to access translations

type Asset = { 
  id: string; 
  name: string; 
  src: string; 
  locked: boolean;
  requiredLevel?: number;
  levelName?: string;
  description?: string;
};

// Compatibility rules for dice combinations
const DICE_COMPATIBILITY: Record<string, { 
  patterns: boolean; 
  accessories: string[]; 
  hats: string[]; 
}> = {
  'box': { patterns: false, accessories: [], hats: [] },
  'dice-skull': { patterns: false, accessories: ['belt'], hats: [] },
  'gift': { patterns: false, accessories: [], hats: ['*'] }, // '*' means block entire category
  'icecube': { patterns: false, accessories: ['*'], hats: ['*'] }, // '*' means block entire category
  'rubik': { patterns: false, accessories: [], hats: [] },
  'safe': { patterns: false, accessories: ['blush'], hats: [] }
};

// NONE_LABEL will be defined inside component to access translations

function rankAsset(tab: TabKey, name: string): number {
  // Remove "thumbnail" from the name for ranking purposes
  const n = name.toLowerCase().replace('thumbnail', '');
  if (tab === "background") {
    // Match LevelUnlocks.txt order: White, Black, Blue, Green, Red, Yellow, Game Board, Chess Board, Casino, Card Game
    if (n.includes('white')) return 0;
    if (n.includes('black')) return 1;
    if (n.includes('blue')) return 2;
    if (n.includes('green')) return 3;
    if (n.includes('red')) return 4;
    if (n.includes('yellow')) return 5;
    if (n.includes('gameboard')) return 6;
    if (n.includes('chessboard')) return 7;
    if (n.includes('casino')) return 8;
    if (n.includes('cardgame')) return 9;
    return 99;
  }
  if (tab === "dice") {
    // Match LevelUnlocks.txt order: White, Black, Blue, Green, Orange, Pink, Purple, Red, Yellow, Box, Ice Cube, Rubik, Dice-Skull, Safe
    if (n.includes('white')) return 0;
    if (n.includes('black')) return 1;
    if (n.includes('blue')) return 2;
    if (n.includes('green')) return 3;
    if (n.includes('orange')) return 4;
    if (n.includes('pink')) return 5;
    if (n.includes('purple')) return 6;
    if (n.includes('red')) return 7;
    if (n.includes('yellow')) return 8;
    if (n.includes('box')) return 9;
    if (n.includes('icecube')) return 10;
    if (n.includes('rubik')) return 11;
    if (n.includes('dice skull')) return 12;
    if (n.includes('safe')) return 13;
    return 99;
  }
  if (tab === "pattern") {
    // Order by unlock level: Level 1 patterns first, then Level 4, 6, 8
    // Level 1: 1-2-3, 2-1-4, 3-6-5, 4-5-6, 5-4-1, 6-3-2
    if (n.includes('1-2-3') || n.includes('123')) return 0;
    if (n.includes('2-1-4') || n.includes('214')) return 1;
    if (n.includes('3-6-5') || n.includes('365')) return 2;
    if (n.includes('4-5-6') || n.includes('456')) return 3;
    if (n.includes('5-4-1') || n.includes('541')) return 4;
    if (n.includes('6-3-2') || n.includes('632')) return 5;
    // Level 4: ABC
    if (n.includes('abc')) return 6;
    // Level 6: Mistery, Suits
    if (n.includes('mistery')) return 7;
    if (n.includes('suits')) return 8;
    // Level 8: Elements
    if (n.includes('elements')) return 9;
    return 99;
  }
  if (tab === "accessories") {
    // Match LevelUnlocks.txt order: Belt, Blush, Scar, Patch, King's Cape
    if (n.includes('belt')) return 0;
    if (n.includes('blush')) return 1;
    if (n.includes('scar')) return 2;
    if (n.includes('patch')) return 3;
    if (n.includes('kingscape')) return 4;
    return 99;
  }
  if (tab === "hat") {
    // Match LevelUnlocks.txt order: Cone, Top Hat, Sorcerer Hat, Wizard Hat, Prince's Crown, King's Crown
    if (n.includes('cone')) return 0;
    if (n.includes('tophat')) return 1;
    if (n.includes('sorcerer')) return 2;
    if (n.includes('wizard')) return 3;
    if (n.includes('prince')) return 4;
    if (n.includes('king')) return 5;
    return 99;
  }
  if (tab === "item") {
    // Match LevelUnlocks.txt order: Mana Potion, Health Potion, Card Castle, Poker Chips, Map, Coins, Shield, Mace, Bomb, Staff, Spellbook, Sword, Holy Grail
    if (n.includes('manapotion')) return 0;
    if (n.includes('healthpotion')) return 1;
    if (n.includes('cardcastle')) return 2;
    if (n.includes('pokerchips')) return 3;
    if (n.includes('map')) return 4;
    if (n.includes('coins')) return 5;
    if (n.includes('shield')) return 6;
    if (n.includes('mace')) return 7;
    if (n.includes('bomb')) return 8;
    if (n.includes('staff')) return 9;
    if (n.includes('spellbook')) return 10;
    if (n.includes('sword')) return 11;
    if (n.includes('holygrail')) return 12;
    return 99;
  }
  if (tab === "companion") {
    // Match LevelUnlocks.txt order: Meeple, Mini-Dice, Chess Knight, Dice-Skull, Eight Ball, Mimic
    if (n.includes('meeple')) return 0;
    if (n.includes('mini dice')) return 1;
    if (n.includes('chessknight')) return 2;
    if (n.includes('dice skull')) return 3;
    if (n.includes('eightball')) return 4;
    if (n.includes('mimic')) return 5;
    return 99;
  }
  if (tab === "title") {
    // Match level progression order: Commoner, Squire, Knight, Champion, Baron, Baroness, Lord, Lady, Archmage, Duke, Duchess, Prince, Princess, King, Queen
    if (n.includes('commoner')) return 0;
    if (n.includes('squire')) return 1;
    if (n.includes('knight')) return 2;
    if (n.includes('champion')) return 3;
    if (n.includes('baron')) return 4;
    if (n.includes('baroness')) return 5;
    if (n.includes('lord')) return 6;
    if (n.includes('lady')) return 7;
    if (n.includes('archmage')) return 8;
    if (n.includes('duke')) return 9;
    if (n.includes('duchess')) return 10;
    if (n.includes('prince')) return 11;
    if (n.includes('princess')) return 12;
    if (n.includes('king')) return 13;
    if (n.includes('queen')) return 14;
    return 99;
  }
  return 99;
}

function sortAssetsRecord(incoming: Record<TabKey, Asset[]>): Record<TabKey, Asset[]> {
  const sorted: Record<TabKey, Asset[]> = { ...incoming };
  (Object.keys(incoming) as TabKey[]).forEach(tab => {
    sorted[tab] = [...incoming[tab]].sort((a, b) => {
      // First sort by unlock level (available items first, then by level)
      const aLevel = a.requiredLevel || 0;
      const bLevel = b.requiredLevel || 0;
      
      // Special items (level 0) should go at the end
      if (aLevel === 0 && bLevel !== 0) return 1;
      if (bLevel === 0 && aLevel !== 0) return -1;
      if (aLevel !== bLevel) return aLevel - bLevel;
      
      // Then sort by the custom ranking for items at the same level
      const ra = rankAsset(tab, a.name);
      const rb = rankAsset(tab, b.name);
      if (ra !== rb) return ra - rb;
      
      // Finally sort alphabetically
      return a.name.localeCompare(b.name);
    });
  });
  return sorted;
}

function buildPreviewLayers(sel: Record<TabKey, string | null>): string[] {
  const out: string[] = [];
  if (sel.background) out.push(sel.background);
  if (sel.dice) out.push(sel.dice);
  if (sel.pattern) out.push(sel.pattern);
  if (sel.accessories) out.push(sel.accessories);
  if (sel.hat) out.push(sel.hat);
  if (sel.item) out.push(sel.item);
  if (sel.companion) out.push(sel.companion);
  // Note: Title is NOT included in the dice image - it's only displayed in the header
  return out;
}

function getThumbnailPath(originalPath: string): string {
  // Decode URL-encoded path first (handles %20 for spaces, etc.)
  const decodedPath = decodeURIComponent(originalPath);
  
  // Extract the filename from the decoded path
  const pathParts = decodedPath.split('/');
  const filename = pathParts[pathParts.length - 1];
  
  // Remove the file extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return originalPath;
  
  const extension = filename.substring(lastDotIndex);
  let baseName = filename.substring(0, lastDotIndex);
  
  // For pattern files (Black/White patterns), remove spaces before adding Thumbnail
  // e.g., "White 1-2-3" -> "White1-2-3Thumbnail.svg"
  // e.g., "Black 1-2-3" -> "Black1-2-3Thumbnail.svg"
  if (decodedPath.includes('/Patterns/')) {
    // Remove spaces from pattern names to match thumbnail file naming
    baseName = baseName.replace(/\s+/g, '');
  }
  
  // Add "Thumbnail" with capital T to match the actual file naming convention
  const thumbnailName = baseName + 'Thumbnail' + extension;
  return `/dice/Thumbnails/${thumbnailName}`;
}

function getDisplayName(assetName: string): string {
  let displayName = assetName;
  
  // Remove "thumbnail" from the end of the name for display
  if (displayName.toLowerCase().endsWith('thumbnail')) {
    displayName = displayName.slice(0, -9); // Remove "thumbnail" (9 characters)
  }
  
  // Remove "Background" from background names
  if (displayName.toLowerCase().includes('background')) {
    displayName = displayName.replace(/background/gi, '').trim();
  }
  
  // Handle "Dice-Skull" special case first, before removing other "Dice" instances
  if (displayName.toLowerCase().includes('dice') && displayName.toLowerCase().includes('skull')) {
    displayName = 'Dice-Skull';
  } else if (displayName.toLowerCase().includes('dice')) {
    // Remove "Dice" from other dice names
    displayName = displayName.replace(/dice/gi, '').trim();
  }
  
  // Add spaces before capital letters (camelCase to readable text)
  displayName = displayName.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Add possessive apostrophes for specific items (check exact matches after spacing)
  if (displayName.toLowerCase() === 'kings crown') {
    displayName = "King's Crown";
  } else if (displayName.toLowerCase() === 'princes crown') {
    displayName = "Prince's Crown";
  } else if (displayName.toLowerCase() === 'kings cape') {
    displayName = "King's Cape";
  }
  
  return displayName;
}

// Simple blocking function - brute force approach
function isBlocked(selectedDice: string | null, tab: TabKey, assetName: string): boolean {
  if (!selectedDice) return false;
  
  // Extract the dice name from the full path
  let diceName = '';
  
  // Get the filename from the path
  const pathParts = selectedDice.split('/');
  const filename = pathParts[pathParts.length - 1]; // Get the last part (filename)
  
  // Remove file extension
  const lastDotIndex = filename.lastIndexOf('.');
  const filenameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
  
  // Remove "thumbnail" suffix if present
  if (filenameWithoutExt.toLowerCase().endsWith('thumbnail')) {
    diceName = filenameWithoutExt.slice(0, -9); // Remove "thumbnail"
  } else {
    diceName = filenameWithoutExt;
  }
  
  // Remove "Dice" suffix if present (for dice files)
  if (diceName.toLowerCase().endsWith('dice')) {
    diceName = diceName.slice(0, -4); // Remove "Dice" (4 characters)
  }
  
  // Convert to lowercase for comparison
  diceName = diceName.toLowerCase();
  




  
  // Check if this dice has blocking rules
  const blocking = DICE_COMPATIBILITY[diceName];
  if (!blocking) {
    return false;
  }
  
  // Block patterns if not allowed
  if (tab === 'pattern' && !blocking.patterns) {
    return true;
  }
  
  // Block accessories
  if (tab === 'accessories') {
    // Empty array means NO accessories are blocked (all allowed)
    if (blocking.accessories.length === 0) {
      return false;
    }
    // Check if '*' means block entire category
    if (blocking.accessories.includes('*')) {
      return true;
    }
    // Check if this specific accessory is blocked
    const assetNameLower = assetName.toLowerCase();
    const isBlocked = blocking.accessories.some((blocked: string) => 
      assetNameLower.includes(blocked)
    );
    if (isBlocked) {
      return true;
    }
  }
  
  // Block hats
  if (tab === 'hat') {
    // Empty array means NO hats are blocked (all allowed)
    if (blocking.hats.length === 0) {
      return false;
    }
    // Check if '*' means block entire category
    if (blocking.hats.includes('*')) {
      return true;
    }
    // Check if this specific hat is blocked
    const assetNameLower = assetName.toLowerCase();
    const isBlocked = blocking.hats.some((blocked: string) => 
      assetNameLower.includes(blocked)
    );
    if (isBlocked) {
      return true;
    }
  }
  
  return false;
}



export default function MyDicePage() {
  const t = useTranslations('common');
  const tHeader = useTranslations('header');
  const tMyDice = useTranslations('myDice');
  const { user, updateAvatar, syncUserData } = useAuth();
  const { showToast } = useToast();
  
  const TABS: { key: TabKey; label: string }[] = [
    { key: "background", label: tMyDice('tabBackground') },
    { key: "dice", label: tMyDice('tabDice') },
    { key: "pattern", label: tMyDice('tabPattern') },
    { key: "hat", label: tMyDice('tabCrownsHats') },
    { key: "accessories", label: tMyDice('tabAccessories') },
    { key: "item", label: tMyDice('tabItem') },
    { key: "companion", label: tMyDice('tabCompanion') },
    { key: "title", label: tMyDice('tabTitle') },
  ];

  const NONE_LABEL: Partial<Record<TabKey, string>> = {
    pattern: tMyDice('noPattern'),
    accessories: tMyDice('noAccessory'),
    hat: tMyDice('nothing'),
    item: tMyDice('noItem'),
    companion: tMyDice('noCompanion'),
    title: tMyDice('noTitle'),
  };
  
  const [activeTab, setActiveTab] = useState<TabKey>("background");
  const [assets, setAssets] = useState<Record<TabKey, Asset[]>>({
    background: [], dice: [], pattern: [], accessories: [], hat: [], item: [], companion: [], title: []
  });
  const [selected, setSelected] = useState<Record<TabKey, string | null>>({
    background: null, dice: null, pattern: null, accessories: null, hat: null, item: null, companion: null, title: null
  });
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState({
    currentLevel: 1,
    currentLevelName: 'Commoner',
    currentXP: 0,
    xpForNextLevel: 100,
    progressPercentage: 0
  });
  const [showXPHelp, setShowXPHelp] = useState(false);

  // Load saved configuration from server (user-specific)
  const loadSavedConfiguration = async (): Promise<Record<TabKey, string | null>> => {
    if (!user?.id) {
      console.log('⚠️ No user ID available, returning empty config');
      return {
      background: null, dice: null, pattern: null, accessories: null, hat: null, item: null, companion: null, title: null
    };
    }
    
    try {
      console.log('🔄 Fetching saved configuration for user:', user.id);
      const response = await fetch(`/api/my-dice/load?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded saved configuration from server:', data);
        if (data.config) {
          console.log('📦 Config data:', data.config);
        return data.config;
        } else {
          console.log('⚠️ No config in response, using defaults');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load saved configuration:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error loading saved configuration from server:', error);
    }
    
    // Return null for new users so defaults can be applied
    console.log('📝 No saved config found, returning null to apply defaults');
    return {
      background: null,
      dice: null, 
      pattern: null,
      accessories: null,
      hat: null,
      item: null,
      companion: null,
      title: null
    };
  };

  // Save configuration to server (user-specific)
  const saveConfigurationToStorage = async (config: Record<TabKey, string | null>) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/my-dice/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          config
        }),
      });

      if (response.ok) {
        console.log('💾 Saved configuration to server:', config);
      } else {
        console.error('❌ Failed to save configuration to server');
      }
    } catch (error) {
      console.error('❌ Error saving configuration to server:', error);
    }
  };

  // Fetch user level and progress - using same endpoint as profile page
  const fetchUserLevel = async () => {
    if (!user?.id) {
      return {
        level: 1,
        progress: {
          currentLevel: 1,
          currentLevelName: 'Commoner',
          currentXP: 0,
          xpForNextLevel: 100,
          progressPercentage: 0
        }
      };
    }
    
    try {
      // Use the same endpoint as the profile page for consistency
      const response = await fetch(`/api/users/level-progress?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        return { 
          level: data.currentLevel || 1,
          progress: {
            currentLevel: data.currentLevel || 1,
            currentLevelName: data.currentLevelName || 'Commoner',
            currentXP: data.currentXP || 0,
            xpForNextLevel: data.xpForNextLevel || 100,
            progressPercentage: data.progressPercentage || 0
          }
        };
      }
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
    return {
      level: 1,
      progress: {
        currentLevel: 1,
        currentLevelName: 'Commoner',
        currentXP: 0,
        xpForNextLevel: 100,
        progressPercentage: 0
      }
    };
  };

  // Function to refresh XP progress
  const refreshXPProgress = async () => {
    if (!user?.id) return;
    const { level, progress } = await fetchUserLevel();
    setUserLevel(level);
    setLevelProgress(progress);
    console.log('XP Progress refreshed:', progress);
  };

  // Load XP immediately when user is available (don't wait for assets)
  useEffect(() => {
    if (!user?.id) return;
    
    const loadXP = async () => {
      const { level, progress } = await fetchUserLevel();
      setUserLevel(level);
      setLevelProgress(progress);
      console.log('XP Progress loaded:', progress);
    };
    
    loadXP();
  }, [user?.id]);

  useEffect(() => {
    // Don't load until user is available
    if (!user?.id) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        
        // Fetch user level first if not already loaded
        let currentLevel = userLevel;
        if (!currentLevel || currentLevel === 1) {
          const { level } = await fetchUserLevel();
          currentLevel = level;
        setUserLevel(level);
        }
        
        // Fetch assets with user level
        const res = await fetch(`/api/dice-assets?userLevel=${currentLevel}`);
        if (res.ok) {
          const data = await res.json();
          const incoming = data.assets as Record<TabKey, Asset[]>;
          

          
          const sorted = sortAssetsRecord(incoming);
          setAssets(sorted);

          // Load saved configuration first - this must happen after user is available
          const savedConfig = await loadSavedConfiguration();
          
          // Helper function to find specific default assets by name pattern
          const findDefaultAsset = (tab: TabKey, patterns: string[]): string | null => {
            const list = sorted[tab];
            if (!list || list.length === 0) return null;
            
            // Look for an asset that matches all patterns (case-insensitive)
            const found = list.find(asset => {
              const assetName = asset.src.toLowerCase();
              return patterns.every(pattern => assetName.includes(pattern.toLowerCase()));
            });
            
            return found?.src ?? null;
          };

          // Helper function to pick first available asset as fallback
          const pick = (tab: TabKey, fallbackIndex = 0): string | null => {
            const list = sorted[tab];
            if (!list || list.length === 0) return null;
            // Because of sort, best candidates are first
            return list[fallbackIndex]?.src ?? null;
          };

          // Debug: Log the sorted assets to see the order
          console.log('📦 Sorted assets:', sorted);
          console.log('💾 Saved configuration loaded:', savedConfig);

          // Determine if this is a new user (no saved config)
          const isNewUser = !savedConfig.background && !savedConfig.dice;

          // Helper to find Black 123 pattern (handles various naming formats)
          const findBlack123Pattern = (): string | null => {
            const list = sorted.pattern;
            if (!list || list.length === 0) return null;
            
            // Look for Black 123 pattern - must contain "black" and either "1-2-3", "1 2 3", or "123"
            const found = list.find(asset => {
              const assetName = asset.src.toLowerCase();
              const hasBlack = assetName.includes("black");
              const has123 = assetName.includes("1-2-3") || assetName.includes("1 2 3") || assetName.includes("123");
              return hasBlack && has123;
            });
            
            return found?.src ?? null;
          };

          // For new users, always apply defaults: white background, white dice, black 1-2-3 pattern
          // For existing users, use saved config or fallback to first available
          let initialSelection: Record<TabKey, string | null>;
          
          if (isNewUser) {
            // New user - apply specific defaults: white background, white dice, black 1-2-3 pattern
            const whiteBg = findDefaultAsset("background", ["white", "background"]);
            const whiteDice = findDefaultAsset("dice", ["white", "dice"]);
            const black123Pattern = findBlack123Pattern();
            
            // Ensure we always have background and dice (required for preview)
            // Pattern should default to Black 1-2-3 for new users
            const finalBg = whiteBg ?? pick("background", 0);
            const finalDice = whiteDice ?? pick("dice", 0);
            const finalPattern = black123Pattern ?? pick("pattern", 0);
            
            // Ensure background and dice are never null for new users (required for preview)
            if (!finalBg || !finalDice) {
              console.warn('⚠️ Could not find default assets, using fallback paths');
            }
            
            initialSelection = {
              background: finalBg ?? "/dice/Backgrounds/WhiteBackground.svg",
              dice: finalDice ?? "/dice/Dice/WhiteDice.svg",
              pattern: finalPattern ?? null, // Default to Black 1-2-3 if available
              accessories: null,
              hat: null,
              item: null,
              companion: null,
              title: null,
            };
            
            console.log('🆕 New user - applying defaults:', initialSelection);
          } else {
            // Existing user - use saved config with fallbacks
            initialSelection = {
              background: savedConfig.background ?? pick("background", 0),
              dice: savedConfig.dice ?? pick("dice", 0),
              pattern: savedConfig.pattern ?? null,
            accessories: savedConfig.accessories ?? null,
            hat: savedConfig.hat ?? null,
            item: savedConfig.item ?? null,
            companion: savedConfig.companion ?? null,
            title: savedConfig.title ?? null,
          };
            
            console.log('👤 Existing user - using saved config:', initialSelection);
          }

          console.log('🎯 Initial selection (before compatibility check):', initialSelection);

          // Validate compatibility rules for saved configuration
          // If no dice is selected, ensure pattern is null
          if (!initialSelection.dice && initialSelection.pattern) {
            console.log('🚫 No dice selected: Clearing pattern');
            initialSelection.pattern = null;
          }
          
          if (initialSelection.dice) {
            const diceName = initialSelection.dice.split('/').pop()?.replace('.svg', '').toLowerCase();
            if (diceName) {
              const compatibility = DICE_COMPATIBILITY[diceName];
            
            if (compatibility) {
              // Reset pattern if not allowed
              if (!compatibility.patterns && initialSelection.pattern) {
                console.log('🚫 Compatibility check: Clearing pattern for', diceName);
                initialSelection.pattern = null;
              }
              
              // Reset accessories if blocked
              if (compatibility.accessories.includes('*') && initialSelection.accessories) {
                console.log('🚫 Compatibility check: Clearing accessories for', diceName);
                initialSelection.accessories = null;
              } else if (initialSelection.accessories) {
                // Check specific blocked accessories
                const accessoryName = initialSelection.accessories.split('/').pop()?.replace('.svg', '').toLowerCase();
                const isBlocked = compatibility.accessories.some((blocked: string) => 
                  accessoryName?.includes(blocked)
                );
                if (isBlocked) {
                  console.log('🚫 Compatibility check: Clearing blocked accessory', accessoryName, 'for', diceName);
                  initialSelection.accessories = null;
                }
              }
              
              // Reset hats if blocked
              if (compatibility.hats.includes('*') && initialSelection.hat) {
                console.log('🚫 Compatibility check: Clearing hats for', diceName);
                initialSelection.hat = null;
              } else if (initialSelection.hat) {
                // Check specific blocked hats
                const hatName = initialSelection.hat.split('/').pop()?.replace('.svg', '').toLowerCase();
                const isBlocked = compatibility.hats.some((blocked: string) => 
                  hatName?.includes(blocked)
                );
                if (isBlocked) {
                  console.log('🚫 Compatibility check: Clearing blocked hat', hatName, 'for', diceName);
                  initialSelection.hat = null;
                }
              }
            }
          }

          console.log('✅ Final initial selection (after compatibility check):', initialSelection);
          setSelected(initialSelection);
          console.log('💾 State updated with saved configuration');
        }
        }
      } catch (error) {
        console.error('Error loading dice assets:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]); // Re-run when user becomes available

  // Auto-save configuration whenever selected changes (but not during initial load)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  useEffect(() => {
    if (!loading && initialLoadComplete && Object.values(selected).some(val => val !== null)) {
      saveConfigurationToStorage(selected);
    }
  }, [selected, loading, initialLoadComplete]);
  
  // Mark initial load as complete after loading finishes
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure all state updates are complete
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Refresh XP when page becomes visible (user returns to tab)
  useEffect(() => {
    if (!user?.id) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshXPProgress();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh every 30 seconds while page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshXPProgress();
      }
    }, 30000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user?.id]);

  const handleSelect = (tab: TabKey, src: string) => {
    setSelected(prev => {
      const newSelection = { ...prev, [tab]: src };
      
      // If selecting a dice, check if it has restrictions
      if (tab === 'dice' && src) {
        // Extract the dice name from the full path
        let diceName = '';
        
        // Get the filename from the path
        const pathParts = src.split('/');
        const filename = pathParts[pathParts.length - 1]; // Get the last part (filename)
        
        // Remove file extension
        const lastDotIndex = filename.lastIndexOf('.');
        const filenameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
        
        // Remove "thumbnail" suffix if present
        if (filenameWithoutExt.toLowerCase().endsWith('thumbnail')) {
          diceName = filenameWithoutExt.slice(0, -9); // Remove "thumbnail"
        } else {
          diceName = filenameWithoutExt;
        }
        
        // Remove "Dice" suffix if present (for dice files)
        if (diceName.toLowerCase().endsWith('dice')) {
          diceName = diceName.slice(0, -4); // Remove "Dice" (4 characters)
        }
        
        // Convert to lowercase for comparison
        const diceNameLower = diceName.toLowerCase();
        
        // Check if this dice has restrictions
        const compatibility = DICE_COMPATIBILITY[diceNameLower];
        if (compatibility) {
          // Reset pattern if not allowed
          if (!compatibility.patterns) {
            newSelection.pattern = "";
            // If currently on pattern tab, switch to background tab
            if (activeTab === 'pattern') {
              setActiveTab('background');
            }
          }
          
          // Reset accessories if specific ones are blocked or entire category blocked
          if (compatibility.accessories.includes('*')) {
            newSelection.accessories = "";
            // If currently on accessories tab, switch to background tab
            if (activeTab === 'accessories') {
              setActiveTab('background');
            }
          } else if (compatibility.accessories.length > 0) {
            // Check if current accessory is blocked and clear it
            if (newSelection.accessories) {
              const currentAccessory = newSelection.accessories.toLowerCase();
              if (compatibility.accessories.some(blocked => currentAccessory.includes(blocked))) {
                newSelection.accessories = "";
              }
            }
          }
          
          // Reset hats if specific ones are blocked or entire category blocked
          if (compatibility.hats.includes('*')) {
            newSelection.hat = "";
            // If currently on pattern tab, switch to background tab
            if (activeTab === 'hat') {
              setActiveTab('background');
            }
          } else if (compatibility.hats.length > 0) {
            // Check if current hat is blocked and clear it
            if (newSelection.hat) {
              const currentHat = newSelection.hat.toLowerCase();
              if (compatibility.hats.includes(currentHat)) {
                newSelection.hat = "";
              }
            }
          }
        }
      }
      
      return newSelection;
    });
  };

  const previewLayers = buildPreviewLayers(selected);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('backToHome')}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex-1 flex items-center justify-between gap-2 sm:justify-start sm:gap-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {tHeader('myDice')}
              </h1>
            {user && (
                <button
                  onClick={() => setShowXPHelp(true)}
                  className="px-2 py-1 text-xs bg-[#fbae17] text-white rounded-full hover:bg-[#e6a015] transition-colors flex-shrink-0"
                >
                  {tMyDice('howDoIEarnXP')}
                </button>
              )}
            </div>
          </div>
          {user && (
            <div className="ml-12 mt-2 flex items-center gap-2 flex-wrap">
                   <span className="text-sm text-gray-600">
                     {tMyDice('levelLabel')} {levelProgress.currentLevel} {levelProgress.currentLevelName}
                   </span>
                   <div className="flex items-center gap-2">
                   <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300"
                       style={{ width: `${Math.min(100, levelProgress.progressPercentage)}%` }}
                     ></div>
                   </div>
                     <span className="text-xs text-gray-500">
                       {levelProgress.currentXP} XP
                       {levelProgress.xpForNextLevel > 0 && ` / ${levelProgress.xpForNextLevel} ${tMyDice('toNext')}`}
                     </span>
                   </div>
               </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Center Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="relative mx-auto aspect-square max-w-xl w-full">
                {/* Layered preview using absolute fill images */}
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image 
                      src="/DiceLoading.svg" 
                      alt="Loading..." 
                      width={64} 
                      height={64} 
                      className="opacity-60"
                    />
                  </div>
                ) : previewLayers.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {tMyDice('noLayersSelected')}
                  </div>
                ) : (
                  previewLayers.map((src, idx) => (
                    <Image key={src + idx} src={src} alt={`layer-${idx}`} fill className="object-contain" />
                  ))
                )}
              </div>



              {/* Actions */}
              <div className="flex items-center justify-center gap-3 mt-6">

                <button
                  onClick={async () => {
                    try {
                      console.log('🎨 Sharing dice to gallery:', selected);
                      
                      // First generate the composite image
                      const generateRes = await fetch('/api/dice-assets/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ diceConfig: selected })
                      });
                      
                      if (!generateRes.ok) {
                        throw new Error('Failed to generate composite image');
                      }
                      
                      const { imageUrl } = await generateRes.json();
                      console.log('🎨 Gallery image generated:', imageUrl);
                      
                      // Create a title for the dice
                      const diceName = selected.dice ? selected.dice.split('/').pop()?.replace('.svg', '').replace('thumbnail', '') : 'Custom';
                      const backgroundName = selected.background ? selected.background.split('/').pop()?.replace('.svg', '').replace('Background', '') : '';
                      const patternName = selected.pattern ? selected.pattern.split('/').pop()?.replace('.svg', '') : '';
                      
                      // Get the next dice number from the counter API
                      const counterResponse = await fetch('/api/dice-counter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      let title = 'My Custom Dice'; // fallback
                      if (counterResponse.ok) {
                        const counterData = await counterResponse.json();
                        title = counterData.diceName; // e.g., "Dice 000001"
                      }
                      
                      // Convert SVG to Blob for upload
                      const svgResponse = await fetch(imageUrl);
                      const svgBlob = await svgResponse.blob();
                      
                      // Create a file object from the blob
                      const diceFile = new File([svgBlob], 'dice.svg', { type: 'image/svg+xml' });
                      
                      // Store the dice data in sessionStorage for the gallery page
                      const base64Data = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(diceFile);
                      });
                      
                      const diceData = {
                        file: {
                          name: diceFile.name,
                          type: diceFile.type,
                          size: diceFile.size,
                          data: base64Data
                        },
                        title: title,
                        category: 'dice-throne',
                        description: '',
                        tags: []
                      };
                      
                      sessionStorage.setItem('diceToShare', JSON.stringify(diceData));
                      
                      // Navigate directly to gallery with upload section open
                      window.location.href = '/community-gallery?upload=true';
                    } catch (error) {
                      console.error('❌ Error sharing dice:', error);
                      showToast('Error sharing dice. Please try again.', 'error');
                    }
                  }}
                  className="btn-secondary"
                >
                  {tMyDice('shareToGallery')}
                </button>
                
                                  <button
                    onClick={async () => {
                      try {

                        
                        // Generate the composite image
                        const generateRes = await fetch('/api/dice-assets/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ diceConfig: selected })
                        });
                        
                        if (!generateRes.ok) {
                          throw new Error('Failed to generate composite image');
                        }
                        
                        const { imageUrl } = await generateRes.json();
                        
                        // Save the dice configuration and update profile image
                        
                        const saveRes = await fetch('/api/dice-assets/save', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            userId: user?.id || 'demo-user',
                            username: user?.username,
                            diceConfig: selected,
                            profileImageUrl: imageUrl
                          })
                        });
                        
                        if (saveRes.ok) {
                          const saveData = await saveRes.json();
                          
                          // Sync the updated user data from the server
                          if (saveData.updatedUser && syncUserData) {
                            syncUserData(saveData.updatedUser);
                          } else if (updateAvatar) {
                            updateAvatar(imageUrl);
                          }
                          
                          showToast(tMyDice('diceSavedSuccessfully'), 'success');
                        } else {
                          const errorData = await saveRes.json();
                          console.error('❌ Failed to save dice:', errorData);
                          showToast(tMyDice('failedToSaveDice'), 'error');
                        }
                      } catch (error) {
                        console.error('❌ Error saving dice:', error);
                        showToast(tMyDice('errorSavingDice'), 'error');
                      }
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    {tMyDice('saveConfiguration')}
                  </button>
                  

              </div>
              

            </div>
          </div>

          {/* Right Panel: Tabs + Assets */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative">
              {/* Tabs */}
              <div className="grid grid-cols-4 border-b border-gray-200 overflow-hidden">
                  {TABS.map(tab => {
                    const selectedDice = selected.dice;
                    let isTabDisabled = false;
                    
                    if (selectedDice) {
                      // Extract the dice name from the full path
                      let diceName = '';
                      
                      // Get the filename from the path
                      const pathParts = selectedDice.split('/');
                      const filename = pathParts[pathParts.length - 1]; // Get the last part (filename)
                      
                      // Remove file extension
                      const lastDotIndex = filename.lastIndexOf('.');
                      const filenameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
                      
                      // Remove "thumbnail" suffix if present
                      if (filenameWithoutExt.toLowerCase().endsWith('thumbnail')) {
                        diceName = filenameWithoutExt.slice(0, -9); // Remove "thumbnail"
                      } else {
                        diceName = filenameWithoutExt;
                      }
                      
                      // Remove "Dice" suffix if present (for dice files)
                      if (diceName.toLowerCase().endsWith('dice')) {
                        diceName = diceName.slice(0, -4); // Remove "Dice" (4 characters)
                      }
                      
                      // Convert to lowercase for comparison
                      diceName = diceName.toLowerCase();
                      
                      // Check if this dice has restrictions for this tab
                      const compatibility = DICE_COMPATIBILITY[diceName];
                      if (compatibility) {
                        if (tab.key === 'pattern' && !compatibility.patterns) {
                          isTabDisabled = true;
                        } else if (tab.key === 'accessories' && compatibility.accessories.includes('*')) {
                          isTabDisabled = true;
                        } else if (tab.key === 'hat' && compatibility.hats.includes('*')) {
                          isTabDisabled = true;
                        }
                      }
                    }
                    
                    return (
                  <button
                    key={tab.key}
                        onClick={() => !isTabDisabled && setActiveTab(tab.key)}
                        disabled={isTabDisabled}
                    className={`px-4 py-4 text-xs font-semibold transition-all duration-200 text-center border-r border-gray-200 last:border-r-0 flex items-center justify-center ${
                          isTabDisabled
                            ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                            : activeTab === tab.key
                        ? "text-white bg-[#fbae17] shadow-lg transform scale-105"
                        : "text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md hover:transform hover:scale-105"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {tab.label}
                      {isTabDisabled && (
                        <span className="text-xs">🔒</span>
                      )}
                    </span>
                  </button>
                    );
                  })}
              </div>

              {/* Asset grid for active tab - shows 2 rows (4 items) at a time with internal scroll */}
              <div className="p-4 max-h-[320px] overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Optional None option for tabs except background and dice */}
                {activeTab !== "background" && activeTab !== "dice" && (
                  <button
                    key={`${activeTab}-none`}
                    onClick={() => handleSelect(activeTab, "")}
                    className={`relative rounded-lg border bg-white transition-shadow flex items-center justify-center ${
                      activeTab === 'title' 
                        ? 'px-4 py-2 min-h-[3rem]' 
                        : 'overflow-hidden aspect-square w-full'
                    } ${
                      !selected[activeTab] ? "border-[#fbae17] border-2 shadow-lg" : "border-gray-200 hover:shadow-md"
                    }`}
                  >
                    {activeTab === 'title' ? (
                      <span className="text-sm font-medium text-gray-800">
                        {NONE_LABEL[activeTab] || "None"}
                      </span>
                    ) : (
                      <>
                        <Image src={"/NoIcon.svg"} alt={NONE_LABEL[activeTab] || "None"} fill className="object-contain p-6" />
                        <div className="absolute bottom-0 left-0 right-0 bg-white/80 text-[9px] text-gray-700 px-1 py-1 text-center line-clamp-1">
                          {NONE_LABEL[activeTab] || "None"}
                        </div>
                      </>
                    )}
                  </button>
                )}
                {assets[activeTab].map(asset => {
                  const isActive = selected[activeTab] === asset.src;
                  const isBlockedByDice = isBlocked(selected.dice, activeTab, asset.name);
                  const isLockedByLevel = asset.locked;
                  const isDisabled = isBlockedByDice || isLockedByLevel;
                  
                  // Special handling for title category - display as text instead of image
                  if (activeTab === 'title') {
                    const buttonElement = (
                      <button
                        key={asset.id}
                        onClick={() => {
                          if (!isDisabled) {
                            handleSelect(activeTab, asset.src);
                          } else if (isBlockedByDice) {
                            console.log('🚫 BLOCKED: Cannot select', asset.name, 'with current dice');
                          } else if (isLockedByLevel) {
                            console.log('🔒 LOCKED: Cannot select', asset.name, 'requires level', asset.requiredLevel);
                          }
                        }}
                        disabled={isDisabled}
                        className={`relative rounded-lg border transition-shadow flex items-center justify-center px-4 py-2 min-h-[4rem] sm:min-h-[3rem] ${
                          isDisabled 
                            ? "bg-gray-200 border-gray-300 cursor-not-allowed opacity-60" 
                            : isActive 
                              ? "bg-white border-[#fbae17] border-2 shadow-lg" 
                              : "bg-white border-gray-200 hover:shadow-md"
                        }`}
                      >
                        <span className={`text-sm sm:text-sm text-base font-medium ${
                          isDisabled ? 'text-gray-400' : 'text-gray-800'
                        }`}>
                          {asset.name}
                        </span>
                        
                        {/* Lock badge for level-locked items */}
                        {isLockedByLevel && (
                          <div className="absolute top-1 right-1 bg-primary-500 text-white rounded-lg px-2 py-1 text-xs font-bold shadow-lg">
                            {asset.requiredLevel === 0 ? tMyDice('reward') : `${tMyDice('level')}${asset.requiredLevel}`}
                          </div>
                        )}
                        
                        <div className={`absolute bottom-0 left-0 right-0 text-[10px] px-1 py-1 text-center leading-tight ${
                          isDisabled 
                            ? "bg-gray-200/90 text-gray-500" 
                            : "bg-white/80 text-gray-700"
                        }`}>
                          {isLockedByLevel && asset.requiredLevel !== undefined && (
                            <div className="text-[9px] text-black font-semibold mt-0.5">
                              {asset.requiredLevel === 0 ? tMyDice('specialItem') : tMyDice('unlockAtLevel', { level: asset.requiredLevel })}
                            </div>
                          )}
                        </div>
                      </button>
                    );

                    // Wrap with ModernTooltip for Reward objects
                    if (asset.requiredLevel === 0 && asset.description) {
                      return (
                        <ModernTooltip
                          key={asset.id}
                          content={asset.description}
                          position="top"
                        >
                          {buttonElement}
                        </ModernTooltip>
                      );
                    }

                    return buttonElement;
                  }
                  
                  // Regular image-based assets
                  const buttonElement = (
                    <button
                      key={asset.id}
                      onClick={() => {
                        if (!isDisabled) {
                          handleSelect(activeTab, asset.src);
                        } else if (isBlockedByDice) {
                          console.log('🚫 BLOCKED: Cannot select', asset.name, 'with current dice');
                        } else if (isLockedByLevel) {
                          console.log('🔒 LOCKED: Cannot select', asset.name, 'requires level', asset.requiredLevel);
                        }
                      }}
                      disabled={isDisabled}
                      className={`relative rounded-lg border overflow-hidden aspect-square transition-shadow flex items-center justify-center w-full ${
                        isDisabled 
                          ? "bg-gray-200 border-gray-300 cursor-not-allowed opacity-60" 
                          : isActive 
                            ? "bg-white border-[#fbae17] border-2 shadow-lg" 
                            : "bg-white border-gray-200 hover:shadow-md"
                      }`}
                    >
                      <Image 
                        src={getThumbnailPath(asset.src)} 
                        alt={asset.name} 
                        fill 
                        className={`object-contain ${isDisabled ? 'grayscale' : ''}`}
                      />
                      
                      {/* Lock badge for level-locked items */}
                      {isLockedByLevel && (
                        <div className="absolute top-1 right-1 bg-primary-500 text-white rounded-lg px-2 py-1 text-xs font-bold shadow-lg">
                          {asset.requiredLevel === 0 ? 'Reward' : `Lv.${asset.requiredLevel}`}
                        </div>
                      )}
                      
                      <div className={`absolute bottom-0 left-0 right-0 text-[9px] px-1 py-1 text-center leading-tight ${
                        isDisabled 
                          ? "bg-gray-200/90 text-gray-500" 
                          : "bg-white/80 text-gray-700"
                      }`}>
                        <div className="line-clamp-1">
                          {getTranslatedAssetName(getDisplayName(asset.name), tMyDice)}
                        </div>
                                                 {isLockedByLevel && asset.requiredLevel !== undefined && (
                           <div className="text-[9px] text-black font-semibold mt-0.5">
                             {asset.requiredLevel === 0 ? 'Special Item' : `Unlock at level ${asset.requiredLevel}`}
                           </div>
                         )}
                      </div>
                    </button>
                  );

                  // Wrap with ModernTooltip for Reward objects
                  if (asset.requiredLevel === 0 && asset.description) {
                    return (
                      <ModernTooltip
                        key={asset.id}
                        content={asset.description}
                        position="top"
                      >
                        {buttonElement}
                      </ModernTooltip>
                    );
                  }

                  return buttonElement;
                })}

                {assets[activeTab].length === 0 && (
                  <div className="col-span-2 sm:col-span-3 text-center text-gray-500 py-8">
                    {tMyDice('noAssetsForCategory')}
                  </div>
                )}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      
      {/* XP Help Modal */}
      {showXPHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{tMyDice('howToEarnXPLevelUp')}</h2>
              <button
                onClick={() => setShowXPHelp(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Daily Actions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">{tMyDice('dailyActionsResetsMidnight')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-green-800">{tMyDice('createForumPosts')}</span>
                      <p className="text-sm text-green-600">{tMyDice('shareDiscussionsHelpCommunity')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-800">{tMyDice('xpEach', { xp: 5 })}</span>
                      <p className="text-xs text-green-600">{tMyDice('postsPerDayMax', { max: 10 })}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium text-blue-800">{tMyDice('uploadImages')}</span>
                      <p className="text-sm text-blue-600">{tMyDice('shareDiceCreationsGallery')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-blue-800">{tMyDice('xpEach', { xp: 10 })}</span>
                      <p className="text-xs text-blue-600">{tMyDice('imagesPerDayFirstGiveXP', { max: 10, first: 5 })}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium text-purple-800">{tMyDice('writeComments')}</span>
                      <p className="text-sm text-purple-600">{tMyDice('engageWithPostsGallery')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-purple-800">{tMyDice('xpEach', { xp: 1 })}</span>
                      <p className="text-xs text-purple-600">{tMyDice('commentsPerDayFirstGiveXP', { max: 50, first: 20 })}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <span className="font-medium text-yellow-800">{tMyDice('dailyLogin')}</span>
                      <p className="text-sm text-yellow-600">{tMyDice('visitSiteRegularly')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-yellow-800">{tMyDice('xpEach', { xp: 2 })}</span>
                      <p className="text-xs text-yellow-600">{tMyDice('loginsPerDayMax', { max: 10 })}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="font-medium text-red-800">{tMyDice('receiveLikes')}</span>
                      <p className="text-sm text-red-600">{tMyDice('whenOthersLikePostsImages')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-800">{tMyDice('xpEach', { xp: 1 })}</span>
                      <p className="text-xs text-red-600">{tMyDice('maxXPDayFromLikes', { xp: 100 })}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                    <div>
                      <span className="font-medium text-indigo-800">{tMyDice('voteOnGames')}</span>
                      <p className="text-sm text-indigo-600">{tMyDice('rateGamesInLibrary')}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-indigo-800">{tMyDice('xpEach', { xp: 1 })}</span>
                      <p className="text-xs text-indigo-600">{tMyDice('maxXPDayFromVoting', { xp: 50 })}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tips */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">{tMyDice('tipsForLevelingUp')}</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>{tMyDice('qualityOverQuantity').split(':')[0]}:</strong> {tMyDice('qualityOverQuantity').split(':')[1]}</li>
                  <li>• <strong>{tMyDice('beActiveDaily').split(':')[0]}:</strong> {tMyDice('beActiveDaily').split(':')[1]}</li>
                  <li>• <strong>{tMyDice('helpOthers').split(':')[0]}:</strong> {tMyDice('helpOthers').split(':')[1]}</li>
                  <li>• <strong>{tMyDice('shareYourCreations').split(':')[0]}:</strong> {tMyDice('shareYourCreations').split(':')[1]}</li>
                  <li>• <strong>{tMyDice('engageWithContent').split(':')[0]}:</strong> {tMyDice('engageWithContent').split(':')[1]}</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowXPHelp(false)}
                className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#e6a015] transition-colors"
              >
                {tMyDice('gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
} 