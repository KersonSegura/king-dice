"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import ModernTooltip from "@/components/ModernTooltip";
import BackButton from "@/components/BackButton";

type TabKey =
  | "background"
  | "dice"
  | "pattern"
  | "accessories"
  | "hat"
  | "item"
  | "companion"
  | "title";

const TABS: { key: TabKey; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "dice", label: "Dice" },
  { key: "pattern", label: "Pattern" },
  { key: "hat", label: "Crowns & Hats" },
  { key: "accessories", label: "Accessories" },
  { key: "item", label: "Item" },
  { key: "companion", label: "Companion" },
  { key: "title", label: "Title" },
];

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

// Custom labels for the "None" option per tab
const NONE_LABEL: Partial<Record<TabKey, string>> = {
  pattern: "No Pattern",
  accessories: "No Accessory",
  hat: "Nothing",
  item: "No Item",
  companion: "No Companion",
  title: "No Title",
};

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
  // Extract the filename from the original path
  const pathParts = originalPath.split('/');
  const filename = pathParts[pathParts.length - 1];
  
  // Remove the file extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return originalPath;
  
  const extension = filename.substring(lastDotIndex);
  const baseName = filename.substring(0, lastDotIndex);
  
  // Add "thumbnail" to the end and use the Thumbnails folder
  const thumbnailName = baseName + 'thumbnail' + extension;
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
  const { user, updateAvatar, syncUserData } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabKey>("background");
  const [assets, setAssets] = useState<Record<TabKey, Asset[]>>({
    background: [], dice: [], pattern: [], accessories: [], hat: [], item: [], companion: [], title: []
  });
  const [selected, setSelected] = useState<Record<TabKey, string | null>>({
    background: null, dice: null, pattern: null, accessories: null, hat: null, item: null, companion: null, title: null
  });
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState({ progressPercentage: 0, xpForNextLevel: 100 });
  const [showXPHelp, setShowXPHelp] = useState(false);

  // Load saved configuration from server (user-specific)
  const loadSavedConfiguration = async (): Promise<Record<TabKey, string | null>> => {
    if (!user?.id) return {
      background: null, dice: null, pattern: null, accessories: null, hat: null, item: null, companion: null, title: null
    };
    
    try {
      const response = await fetch(`/api/my-dice/load?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📂 Loaded saved configuration from server:', data);
        return data.config;
      }
    } catch (error) {
      console.error('❌ Error loading saved configuration from server:', error);
    }
    
    // Return default configuration for new users
    return {
      background: "/dice/backgrounds/WhiteBackground.svg",
      dice: "/dice/dice/WhiteDice.svg", 
      pattern: "/dice/patterns/1-2-3.svg",
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

  // Fetch user level and progress
  const fetchUserLevel = async () => {
    if (!user?.id) return { level: 1, progress: { progressPercentage: 0, xpForNextLevel: 100 } };
    
    try {
      const response = await fetch(`/api/reputation?userId=${user.id}&action=progress`);
      if (response.ok) {
        const data = await response.json();
        return { 
          level: data.progress?.currentLevel || 1, 
          progress: {
            progressPercentage: data.progress?.progressPercentage || 0,
            xpForNextLevel: data.progress?.xpForNextLevel || 100
          }
        };
      }
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
    return { level: 1, progress: { progressPercentage: 0, xpForNextLevel: 100 } };
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Fetch user level and progress first
        const { level, progress } = await fetchUserLevel();
        setUserLevel(level);
        setLevelProgress(progress);
        
        // Fetch assets with user level
        const res = await fetch(`/api/dice-assets?userLevel=${level}`);
        if (res.ok) {
          const data = await res.json();
          const incoming = data.assets as Record<TabKey, Asset[]>;
          

          
          const sorted = sortAssetsRecord(incoming);
          setAssets(sorted);

          // Load saved configuration first
          const savedConfig = await loadSavedConfiguration();
          
          // Helper function to pick assets with fallback
          const pick = (tab: TabKey, fallbackIndex = 0): string | null => {
            const list = sorted[tab];
            if (!list || list.length === 0) return null;
            // Because of sort, best candidates are first
            return list[fallbackIndex]?.src ?? null;
          };

          // Debug: Log the sorted assets to see the order
          console.log('Sorted assets:', sorted);
          console.log('Saved configuration:', savedConfig);

          // Use saved configuration if available, otherwise use defaults
          let initialSelection = {
            background: savedConfig.background || pick("background"),
            dice: savedConfig.dice || pick("dice"),
            pattern: savedConfig.pattern || null, // Use saved pattern, fallback to null
            accessories: savedConfig.accessories || null,
            hat: savedConfig.hat || null,
            item: savedConfig.item || null,
            companion: savedConfig.companion || null,
            title: savedConfig.title || null,
          };

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

          console.log('Initial selection (after compatibility check):', initialSelection);
          setSelected(initialSelection);
        }
        }
      } catch (error) {
        console.error('Error loading dice assets:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Dice{user?.title ? ` - ${user.title}` : ''}
              </h1>
            {user && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-600">Level {userLevel}</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, levelProgress.progressPercentage)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">Progress to next level</span>
                <button
                  onClick={() => setShowXPHelp(true)}
                  className="ml-2 px-2 py-1 text-xs bg-[#fbae17] text-white rounded-full hover:bg-[#e6a015] transition-colors"
                >
                  How do I earn XP?
                </button>
              </div>
            )}
            </div>
          </div>
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
                    No layers selected yet
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
                  Share to Gallery
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
                          
                          showToast('Dice saved successfully! Your profile image has been updated.', 'success');
                        } else {
                          const errorData = await saveRes.json();
                          console.error('❌ Failed to save dice:', errorData);
                          showToast('Failed to save dice. Please try again.', 'error');
                        }
                      } catch (error) {
                        console.error('❌ Error saving dice:', error);
                        showToast('Error saving dice. Please try again.', 'error');
                      }
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    Save Dice
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

              {/* Asset grid for active tab - fixed max height with scroll */}
              <div className="p-4 max-h-[560px] overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Optional None option for tabs except background and dice */}
                {activeTab !== "background" && activeTab !== "dice" && (
                  <button
                    key={`${activeTab}-none`}
                    onClick={() => handleSelect(activeTab, "")}
                    className={`relative rounded-lg border bg-white transition-shadow flex items-center justify-center ${
                      activeTab === 'title' 
                        ? 'px-4 py-2 min-h-[3rem]' 
                        : 'overflow-hidden aspect-square h-24 w-24'
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
                        className={`relative rounded-lg border transition-shadow flex items-center justify-center px-4 py-2 min-h-[3rem] ${
                          isDisabled 
                            ? "bg-gray-200 border-gray-300 cursor-not-allowed opacity-60" 
                            : isActive 
                              ? "bg-white border-[#fbae17] border-2 shadow-lg" 
                              : "bg-white border-gray-200 hover:shadow-md"
                        }`}
                      >
                        <span className={`text-sm font-medium ${
                          isDisabled ? 'text-gray-400' : 'text-gray-800'
                        }`}>
                          {asset.name}
                        </span>
                        
                        {/* Lock badge for level-locked items */}
                        {isLockedByLevel && (
                          <div className="absolute top-1 right-1 bg-primary-500 text-white rounded-lg px-2 py-1 text-xs font-bold shadow-lg">
                            {asset.requiredLevel === 0 ? 'Reward' : `Lv.${asset.requiredLevel}`}
                          </div>
                        )}
                        
                        <div className={`absolute bottom-0 left-0 right-0 text-[10px] px-1 py-1 text-center leading-tight ${
                          isDisabled 
                            ? "bg-gray-200/90 text-gray-500" 
                            : "bg-white/80 text-gray-700"
                        }`}>
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
                      className={`relative rounded-lg border overflow-hidden aspect-square transition-shadow flex items-center justify-center h-24 w-24 ${
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
                          {getDisplayName(asset.name)}
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
                    No assets yet for this category
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
              <h2 className="text-2xl font-bold text-gray-900">How to Earn XP & Level Up</h2>
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
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Daily Actions (Resets at midnight)</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-green-800">Create Forum Posts</span>
                      <p className="text-sm text-green-600">Share discussions and help the community</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-800">5 XP each</span>
                      <p className="text-xs text-green-600">10 posts/day max</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium text-blue-800">Upload Images</span>
                      <p className="text-sm text-blue-600">Share your dice creations in the gallery</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-blue-800">10 XP each</span>
                      <p className="text-xs text-blue-600">10 images/day (first 5 give XP)</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium text-purple-800">Write Comments</span>
                      <p className="text-sm text-purple-600">Engage with posts and gallery images</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-purple-800">1 XP each</span>
                      <p className="text-xs text-purple-600">50 comments/day (first 20 give XP)</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <span className="font-medium text-yellow-800">Daily Login</span>
                      <p className="text-sm text-yellow-600">Visit the site regularly</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-yellow-800">2 XP each</span>
                      <p className="text-xs text-yellow-600">10 logins/day max</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="font-medium text-red-800">Receive Likes</span>
                      <p className="text-sm text-red-600">When others like your posts or images</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-800">1 XP each</span>
                      <p className="text-xs text-red-600">Max 100 XP/day from likes</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                    <div>
                      <span className="font-medium text-indigo-800">Vote on Games</span>
                      <p className="text-sm text-indigo-600">Rate games in the game library</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-indigo-800">1 XP each</span>
                      <p className="text-xs text-indigo-600">Max 50 XP/day from voting</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tips */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 Tips for Leveling Up</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>Quality over quantity:</strong> Create engaging posts and beautiful dice images</li>
                  <li>• <strong>Be active daily:</strong> Login regularly and participate in discussions</li>
                  <li>• <strong>Help others:</strong> Answer questions and provide helpful comments</li>
                  <li>• <strong>Share your creations:</strong> Upload your best dice designs to the gallery</li>
                  <li>• <strong>Engage with content:</strong> Like and comment on others' posts and images</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowXPHelp(false)}
                className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#e6a015] transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
} 