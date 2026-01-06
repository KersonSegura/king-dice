'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Edit3, Save, X, Plus, FileText, Eye, EyeOff, Database, Gamepad2, CheckCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, Play, Download } from 'lucide-react';
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor';
import Footer from './Footer';
import LazyList from './LazyList';
import VideoLinks from './VideoLinks';
import PDFHandler from './PDFHandler';
import GameSearchModal from './GameSearchModal';
import { fetchJsonWithRetry } from '@/utils/fetchWithRetry';
import { useLocale } from 'next-intl';
// import BackToTopButton from './BackToTopButton'; // Removed - using global one from layout

interface Game {
  id: number;
  bggId?: number;
  nameEn: string;
  nameEs: string;
  yearRelease?: number;
  designer?: string;
  developer?: string;
  minPlayers?: number;
  maxPlayers?: number;
  durationMinutes?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pdfFile?: string;
  officialWebsite?: string;
  amazonUrl?: string;
  isExpansion?: boolean;
  shopItems?: ShopItem[];
  shopListMasterGameId?: number | null;
  gameCategories: Array<{
    category: {
      id: number;
      nameEn: string;
      nameEs: string;
    };
  }>;
  gameMechanics: Array<{
    mechanic: {
      id: number;
      nameEn: string;
      nameEs: string;
    };
  }>;
  descriptions: Array<{
    id: number;
    language: string;
    shortDescription?: string;
    fullDescription?: string;
  }>;
  rules: Array<{
    id: number;
    language: string;
    rulesText?: string;
    rulesHtml?: string;
  }>;
  baseGameExpansions: Array<{
    id: number;
    nameEn: string;
    nameEs: string;
  }>;
}

interface GameDescription {
  id: number;
  language: string;
  shortDescription?: string;
  fullDescription?: string;
}

interface GameRule {
  id: number;
  language: string;
  rulesText?: string;
  rulesHtml?: string;
}

interface ShopItem {
  id?: number;
  title: string;
  imageUrl?: string;
  link: string;
  order?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface NewGameForm {
  nameEn: string;
  nameEs: string;
  yearRelease?: number;
  designer?: string;
  developer?: string;
  minPlayers?: number;
  maxPlayers?: number;
  durationMinutes?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pdfFile?: string;
  officialWebsite?: string;
  fullDescription?: string;
  rulesText?: string;
  isExpansion?: boolean;
}

function BoardGameDatabaseContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRules, setEditingRules] = useState<{[key: number]: boolean}>({});
  const [editingRuleContent, setEditingRuleContent] = useState<{[key: number]: string}>({});
  const [savingRules, setSavingRules] = useState<{[key: number]: boolean}>({});
  const [editingGame, setEditingGame] = useState<{[key: number]: boolean}>({});
  const [editingGameData, setEditingGameData] = useState<{[key: number]: Partial<Game> & { fullDescription?: string; categories?: string }}>({});
  const [editingShopItems, setEditingShopItems] = useState<{ [key: number]: ShopItem[] }>({});
  const [linkedShopGames, setLinkedShopGames] = useState<{ [key: number]: Array<{ id: number; nameEn: string; nameEs?: string; isMaster?: boolean }> }>({});
  const [shopMasterGameId, setShopMasterGameId] = useState<{ [key: number]: number | null }>({});
  const [showLinkGameModal, setShowLinkGameModal] = useState<{ [key: number]: boolean }>({});
  const [savingGame, setSavingGame] = useState<{[key: number]: boolean}>({});
  const [showOnlyWithoutRules, setShowOnlyWithoutRules] = useState(false);
  const [showAddGameForm, setShowAddGameForm] = useState(false);
  const [showScraperForm, setShowScraperForm] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [addingGame, setAddingGame] = useState(false);
  const [scrapingGame, setScrapingGame] = useState(false);
  const [scraperUrls, setScraperUrls] = useState({
    gameUrl: '',
    rulesUrl: ''
  });
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'success',
    visible: false
  });
  const [duplicateCheck, setDuplicateCheck] = useState<{
    isChecking: boolean;
    isDuplicate: boolean;
    existingGame: any;
  }>({
    isChecking: false,
    isDuplicate: false,
    existingGame: null
  });
  const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deletingGame, setDeletingGame] = useState<{[key: number]: boolean}>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{
    gameId: number | null;
    gameName: string;
    isOpen: boolean;
  }>({
    gameId: null,
    gameName: '',
    isOpen: false
  });
  const [newGameForm, setNewGameForm] = useState<NewGameForm>({
    nameEn: '',
    nameEs: '',
    yearRelease: undefined,
    designer: '',
    developer: '',
    minPlayers: undefined,
    maxPlayers: undefined,
    durationMinutes: undefined,
    imageUrl: '',
    thumbnailUrl: '',
    videoUrl: '',
    pdfUrl: '',
    pdfFile: '',
    officialWebsite: '',
    fullDescription: '',
    rulesText: '',
    isExpansion: false
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Refs for RichTextEditor components
  const editingRulesEditorRef = useRef<RichTextEditorRef>(null);
  const newGameRulesEditorRef = useRef<RichTextEditorRef>(null);

  // Toast notification functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000); // Hide after 4 seconds
  };

  const fetchGames = async (page: number = 1, search: string = '', withoutRulesOnly: boolean = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(withoutRulesOnly && { withoutRules: 'true' })
      });
      
      const data = await fetchJsonWithRetry(`/api/boardgames?${params}`, {}, {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000 // Increased to 30 seconds to handle large datasets
      });
      
      if (data.games && data.pagination) {
        setGames(data.games);
        setPagination(data.pagination);
      } else {
        setGames([]);
        setPagination({
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames(1, searchTerm, showOnlyWithoutRules);
  }, [searchTerm, showOnlyWithoutRules]);

  // Handle game parameter from URL
  useEffect(() => {
    const gameId = searchParams.get('game');
    if (gameId && games.length > 0) {
      const game = games.find(g => g.id === parseInt(gameId));
      if (game) {
        setSelectedGame(game);
      }
    }
  }, [searchParams, games]);


  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateCheckTimeout) {
        clearTimeout(duplicateCheckTimeout);
      }
    };
  }, [duplicateCheckTimeout]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterToggle = () => {
    setShowOnlyWithoutRules(!showOnlyWithoutRules);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const startEditingRule = (gameId: number, currentRules?: string) => {
    setEditingRules(prev => ({ ...prev, [gameId]: true }));
    setEditingRuleContent(prev => ({ 
      ...prev, 
      [gameId]: currentRules || '' 
    }));
  };

  const cancelEditingRule = (gameId: number) => {
    setEditingRules(prev => ({ ...prev, [gameId]: false }));
    setEditingRuleContent(prev => ({ ...prev, [gameId]: '' }));
  };

  const saveRule = async (gameId: number) => {
    setSavingRules(prev => ({ ...prev, [gameId]: true }));
    
    try {
      // Get the base64 content from the RichTextEditor
      const base64Content = editingRulesEditorRef.current?.getBase64Content() || editingRuleContent[gameId] || '';
      
      // Convert base64 images to file references
      const imageResponse = await fetch('/api/rules/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: base64Content,
          gameId: gameId
        })
      });
      
      if (!imageResponse.ok) {
        throw new Error('Failed to process images');
      }
      
      const { content: processedContent } = await imageResponse.json();
      
      // Check if game already has rules
      const game = games.find(g => g.id === gameId);
      const existingRule = game?.rules?.find(r => r.language === 'es');
      
      if (existingRule) {
        // Update existing rule
        const response = await fetch(`/api/rules/${existingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rulesText: processedContent,
            rulesHtml: `<div class="game-rules">${processedContent.replace(/\n/g, '<br>')}</div>`,
            language: 'es'
          })
        });
        
        if (!response.ok) {
          // Use helper to safely parse error response
          try {
            const errorData = await parseApiResponse(response);
            throw new Error(errorData.error || 'Failed to update rule');
          } catch (parseError) {
            // If parseApiResponse throws, use its error message
            throw parseError;
          }
        }
      } else {
        // Create new rule
        const response = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            rulesText: processedContent,
            rulesHtml: `<div class="game-rules">${processedContent.replace(/\n/g, '<br>')}</div>`,
            language: 'es'
          })
        });
        
        if (!response.ok) {
          // Use helper to safely parse error response
          try {
            const errorData = await parseApiResponse(response);
            throw new Error(errorData.error || 'Failed to create rule');
          } catch (parseError) {
            // If parseApiResponse throws, use its error message
            throw parseError;
          }
        }
      }
      
      // Refresh the games list to show updated data
      await fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
      
      // Reset editing state
      setEditingRules(prev => ({ ...prev, [gameId]: false }));
      setEditingRuleContent(prev => ({ ...prev, [gameId]: '' }));
      
    } catch (error) {
      console.error('Error saving rule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar las reglas: ${errorMessage}`);
    } finally {
      setSavingRules(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const createRuleFromScrapped = async (gameId: number) => {
    try {
      const response = await fetch(`/api/admin/import-scraped-rule/${gameId}`);
      if (response.ok) {
        const ruleData = await response.json();
        setEditingRuleContent(prev => ({ 
          ...prev, 
          [gameId]: ruleData.rulesText || ruleData.rulesHtml || '' 
        }));
        setEditingRules(prev => ({ ...prev, [gameId]: true }));
      } else {
        alert('No se encontraron reglas scrapeadas para este juego');
      }
    } catch (error) {
      console.error('Error importing scraped rule:', error);
      alert('Error al importar reglas scrapeadas');
    }
  };

  const startEditingGame = (game: Game) => {
    setEditingGame(prev => ({ ...prev, [game.id]: true }));
    
    // Get the current description from the game
    const currentDescription = getGameDescription(game);
    
    // Get current categories as comma-separated string
    const currentCategories = game.gameCategories && game.gameCategories.length > 0
      ? game.gameCategories.map(gc => gc.category.nameEn).join(', ')
      : '';

    setEditingGameData(prev => ({ 
      ...prev, 
      [game.id]: {
        nameEn: game.nameEn,
        nameEs: game.nameEs,
        yearRelease: game.yearRelease,
        designer: game.designer,
        developer: game.developer,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        durationMinutes: game.durationMinutes,
        imageUrl: game.imageUrl,
        thumbnailUrl: game.thumbnailUrl,
        videoUrl: game.videoUrl,
        pdfUrl: game.pdfUrl,
        officialWebsite: game.officialWebsite,
        fullDescription: currentDescription !== 'No description available' ? currentDescription : '',
        isExpansion: game.isExpansion || false,
        categories: currentCategories
      }
    }));

    setEditingShopItems(prev => ({
      ...prev,
      [game.id]: game.shopItems ? game.shopItems.map((item, idx) => ({
        ...item,
        order: item.order ?? idx + 1
      })) : []
    }));

    // Fetch linked shop games
    fetchLinkedShopGames(game.id);

    // Set the master game ID (if this game links to another, use that; otherwise this game is the master)
    const masterId = game.shopListMasterGameId || game.id;
    setShopMasterGameId(prev => ({ ...prev, [game.id]: masterId === game.id ? null : masterId }));
  };

  const fetchLinkedShopGames = async (gameId: number) => {
    console.log(`[fetchLinkedShopGames] Fetching linked games for game ID: ${gameId}`);
    try {
      const response = await fetch(`/api/boardgames/${gameId}/linked-shop-games`);
      console.log(`[fetchLinkedShopGames] Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[fetchLinkedShopGames] Received data:`, data);
        const masterId = data.masterGameId || gameId;
        // Mark which games are the master
        const gamesWithMaster = (data.linkedGames || []).map((g: any) => ({
          ...g,
          isMaster: g.id === masterId
        }));
        console.log(`[fetchLinkedShopGames] Setting ${gamesWithMaster.length} linked games`);
        setLinkedShopGames(prev => ({ ...prev, [gameId]: gamesWithMaster }));
        setShopMasterGameId(prev => ({ ...prev, [gameId]: masterId }));
      } else {
        // For any error (404, 500, etc.), log it but don't overwrite existing state
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[fetchLinkedShopGames] Error ${response.status} fetching linked shop games:`, errorText);
        
        // Only initialize with current game if we don't already have linked games for this game
        setLinkedShopGames(prev => {
          // If we already have linked games, preserve them (don't overwrite)
          if (prev[gameId] && prev[gameId].length > 0) {
            console.log(`[fetchLinkedShopGames] Preserving existing ${prev[gameId].length} linked games due to API error`);
            return prev;
          }
          // Otherwise, initialize with just the current game as master (only on first load)
          console.log(`[fetchLinkedShopGames] Initializing with current game as master due to API error`);
          const currentGame = games.find(g => g.id === gameId);
          return {
            ...prev,
            [gameId]: [{ 
              id: gameId, 
              nameEn: currentGame?.nameEn || editingGameData[gameId]?.nameEn || 'Current Game', 
              isMaster: true 
            }]
          };
        });
        // Only set master ID if not already set
        setShopMasterGameId(prev => {
          if (prev[gameId] !== undefined) {
            return prev;
          }
          return { ...prev, [gameId]: gameId };
        });
      }
    } catch (error) {
      console.error('[fetchLinkedShopGames] Exception fetching linked shop games:', error);
      // Fallback: preserve existing linked games or initialize with current game as master
      setLinkedShopGames(prev => {
        // If we already have linked games, preserve them (don't overwrite)
        if (prev[gameId] && prev[gameId].length > 0) {
          console.log(`[fetchLinkedShopGames] Preserving existing ${prev[gameId].length} linked games due to exception`);
          return prev;
        }
        // Otherwise, initialize with just the current game as master (only on first load)
        console.log(`[fetchLinkedShopGames] Initializing with current game as master due to exception`);
        const currentGame = games.find(g => g.id === gameId);
        return {
          ...prev,
          [gameId]: [{ 
            id: gameId, 
            nameEn: currentGame?.nameEn || editingGameData[gameId]?.nameEn || 'Current Game', 
            isMaster: true 
          }]
        };
      });
      // Only set master ID if not already set
      setShopMasterGameId(prev => {
        if (prev[gameId] !== undefined) {
          return prev;
        }
        return { ...prev, [gameId]: gameId };
      });
    }
  };

  const cancelEditingGame = (gameId: number) => {
    setEditingGame(prev => ({ ...prev, [gameId]: false }));
    setEditingGameData(prev => ({ ...prev, [gameId]: {} }));
    setEditingShopItems(prev => {
      const updated = { ...prev };
      delete updated[gameId];
      return updated;
    });
    setLinkedShopGames(prev => {
      const updated = { ...prev };
      delete updated[gameId];
      return updated;
    });
    setShopMasterGameId(prev => {
      const updated = { ...prev };
      delete updated[gameId];
      return updated;
    });
  };

  // Helper function to safely parse API responses (handles both JSON and non-JSON)
  const parseApiResponse = async (response: Response): Promise<any> => {
    const textResponse = await response.text();
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(textResponse);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', textResponse);
        throw new Error('El servidor devolvió una respuesta inválida. Intenta nuevamente.');
      }
    } else {
      // If not JSON, extract error message from text
      console.error('Non-JSON response:', textResponse);
      
      let errorMessage = 'Error desconocido del servidor';
      if (response.status === 413) {
        errorMessage = 'El archivo o datos son demasiado grandes. Intenta usar una URL en lugar de subir un archivo.';
      } else if (response.status === 504 || response.status === 408) {
        errorMessage = 'La solicitud tardó demasiado. Intenta nuevamente o reduce el tamaño de los datos.';
      } else if (textResponse.includes('Request Entity Too Large')) {
        errorMessage = 'Los datos son demasiado grandes. Intenta usar URLs en lugar de subir archivos grandes.';
      } else if (textResponse.includes('timeout') || textResponse.includes('Timeout')) {
        errorMessage = 'La solicitud tardó demasiado. Intenta nuevamente.';
      } else if (textResponse.trim().length > 0) {
        const snippet = textResponse.substring(0, 200);
        errorMessage = `Error del servidor: ${snippet}${textResponse.length > 200 ? '...' : ''}`;
      }
      
      throw new Error(errorMessage);
    }
  };

  const saveGameProperties = async (gameId: number) => {
    setSavingGame(prev => ({ ...prev, [gameId]: true }));
    
    try {
      const gameData = editingGameData[gameId];
      if (!gameData) {
        throw new Error('No game data to save');
      }

      // Validation
      if (!gameData.nameEn || gameData.nameEn.trim() === '') {
        alert('El nombre en inglés es obligatorio');
        return;
      }

      // Validate player counts if provided
      if (gameData.minPlayers && gameData.maxPlayers && gameData.minPlayers > gameData.maxPlayers) {
        alert('El número mínimo de jugadores no puede ser mayor que el máximo');
        return;
      }

      // Validate duration if provided
      if (gameData.durationMinutes && (gameData.durationMinutes < 1 || gameData.durationMinutes > 480)) {
        alert('La duración debe estar entre 1 y 480 minutos');
        return;
      }

      // Validate URLs if provided
      if (gameData.imageUrl && !isValidUrl(gameData.imageUrl)) {
        alert('La URL de la imagen no es válida');
        return;
      }

      if (gameData.thumbnailUrl && !isValidUrl(gameData.thumbnailUrl)) {
        alert('La URL del thumbnail no es válida');
        return;
      }

      if (gameData.videoUrl && !isValidUrl(gameData.videoUrl)) {
        alert('La URL del video no es válida');
        return;
      }

      if (gameData.pdfUrl && !isValidUrl(gameData.pdfUrl)) {
        alert('La URL del PDF no es válida');
        return;
      }

      // Clean and prepare the data for the API
      const cleanGameData: any = {};
      
      // Helper function to clean string values
      const cleanString = (value: any, isUrl: boolean = false): string | undefined => {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== 'string') return String(value);
        
        // Remove null bytes and other problematic characters
        let cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
        
        // Additional cleaning for specific issues
        cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ''); // Keep only printable characters and Unicode
        cleaned = cleaned.replace(/\s+/g, ' '); // Replace multiple spaces with single space
        
        // Different cleaning for URLs vs other strings
        if (isUrl) {
          // For URLs, only remove truly problematic characters but keep : and /
          cleaned = cleaned.replace(/[<>"\\|*\x00-\x1F\x7F]/g, ''); // Remove problematic characters but keep : and /
          cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
          cleaned = cleaned.replace(/\u00A0/g, ' '); // Replace non-breaking spaces with regular spaces
        } else {
          // For non-URL strings, apply cleaning but preserve colons for game names
          cleaned = cleaned.replace(/[<>"/\\|?*\x00-\x1F\x7F]/g, ''); // Remove problematic characters but keep :
          cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
          cleaned = cleaned.replace(/\u00A0/g, ' '); // Replace non-breaking spaces with regular spaces
        }
        
        return cleaned;
      };

      // Helper function to clean descriptions while preserving newlines and paragraph breaks
      const cleanDescription = (value: any): string | undefined => {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== 'string') return String(value);
        
        // Remove null bytes and other problematic characters, but preserve newlines (\n) and carriage returns (\r)
        let cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Remove zero-width characters
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // Replace non-breaking spaces with regular spaces
        cleaned = cleaned.replace(/\u00A0/g, ' ');
        
        // Remove problematic characters but preserve newlines
        cleaned = cleaned.replace(/[<>]/g, ''); // Remove angle brackets but keep everything else including newlines
        
        // Normalize line endings: convert \r\n to \n, then convert standalone \r to \n
        cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Preserve multiple newlines (paragraph breaks) but normalize excessive ones (more than 3 consecutive)
        cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
        
        // Trim only the start and end, not internal whitespace
        cleaned = cleaned.trim();
        
        return cleaned;
      };
      
      // Only include defined fields with proper cleaning
      if (gameData.nameEn !== undefined) {
        let cleanedName = cleanString(gameData.nameEn);
        
        // Extra safety check for nameEn - if it's still problematic, create a safe version
        if (cleanedName && cleanedName.length > 0) {
          // Remove any remaining problematic characters but preserve colons
          cleanedName = cleanedName.replace(/[^\w\s\-'&().,:]/g, '');
          // Ensure it's not just whitespace
          if (cleanedName.trim().length === 0) {
            cleanedName = 'Untitled Game';
          }
        }
        
        cleanGameData.nameEn = cleanedName;
      }
      if (gameData.nameEs !== undefined) cleanGameData.nameEs = cleanString(gameData.nameEs);
      if (gameData.yearRelease !== undefined) cleanGameData.yearRelease = gameData.yearRelease;
      if (gameData.designer !== undefined) cleanGameData.designer = cleanString(gameData.designer);
      if (gameData.developer !== undefined) cleanGameData.developer = cleanString(gameData.developer);
      if (gameData.minPlayers !== undefined) cleanGameData.minPlayers = gameData.minPlayers;
      if (gameData.maxPlayers !== undefined) cleanGameData.maxPlayers = gameData.maxPlayers;
      if (gameData.durationMinutes !== undefined) cleanGameData.durationMinutes = gameData.durationMinutes;
      if (gameData.imageUrl !== undefined) cleanGameData.imageUrl = cleanString(gameData.imageUrl, true);
      if (gameData.thumbnailUrl !== undefined) cleanGameData.thumbnailUrl = cleanString(gameData.thumbnailUrl, true);
      if (gameData.videoUrl !== undefined) cleanGameData.videoUrl = cleanString(gameData.videoUrl, true);
      if (gameData.pdfUrl !== undefined) cleanGameData.pdfUrl = cleanString(gameData.pdfUrl, true);
      if (gameData.pdfFile !== undefined) cleanGameData.pdfFile = gameData.pdfFile; // Don't clean base64 data
      if (gameData.officialWebsite !== undefined) cleanGameData.officialWebsite = cleanString(gameData.officialWebsite, true);
      // Shop list master game ID (if this game should link to another game's shop items)
      const masterId = shopMasterGameId[gameId];
      if (masterId !== undefined && masterId !== gameId) {
        cleanGameData.shopListMasterGameId = masterId;
      } else if (masterId === null || masterId === gameId) {
        cleanGameData.shopListMasterGameId = null;
      }

      // Shop items
      const currentGame = games.find(g => g.id === gameId);
      const shopItems = editingShopItems[gameId] ?? currentGame?.shopItems ?? [];
      cleanGameData.shopItems = shopItems
        .filter(item => item && item.title && item.link)
        .map(item => ({
          title: item.title,
          imageUrl: cleanString(item.imageUrl, true),
          link: cleanString(item.link, true),
          order: item.order ?? 999
        }));
      if (gameData.fullDescription !== undefined) cleanGameData.fullDescription = cleanDescription(gameData.fullDescription);
      if (gameData.isExpansion !== undefined) cleanGameData.isExpansion = gameData.isExpansion;
      
      // Categories - parse comma-separated string
      if (gameData.categories !== undefined) {
        const categoryNames = gameData.categories
          .split(',')
          .map(cat => cat.trim())
          .filter(cat => cat.length > 0);
        cleanGameData.categories = categoryNames;
      }

      // If there's a PDF file (base64), upload it to Supabase Storage first
      if (cleanGameData.pdfFile) {
        try {
          // Convert base64 to File/Blob for upload
          const base64Data = cleanGameData.pdfFile.split(',')[1];
          if (base64Data) {
            // Convert base64 to blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const file = new File([blob], `game-${gameId}.pdf`, { type: 'application/pdf' });

            // Upload to Supabase Storage via the PDF upload endpoint
            const formData = new FormData();
            formData.append('pdf', file);

            const uploadResponse = await fetch(`/api/games/${gameId}/pdf`, {
              method: 'POST',
              body: formData
            });

            if (!uploadResponse.ok) {
              // Try to get a more specific error message
              const textResponse = await uploadResponse.text();
              let errorMessage = 'Failed to upload PDF';
              
              // Check for specific error types
              if (uploadResponse.status === 413 || textResponse.includes('Request Entity Too Large')) {
                errorMessage = 'PDF file is too large. Maximum allowed is 3MB. Please use a PDF URL instead.';
              } else {
                // Try to parse JSON error
                try {
                  const errorData = JSON.parse(textResponse);
                  errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                  errorMessage = textResponse.substring(0, 200) || errorMessage;
                }
              }
              
              throw new Error(errorMessage);
            }

            const uploadResult = await uploadResponse.json();
            
            // Replace pdfFile with pdfUrl from Supabase Storage
            cleanGameData.pdfUrl = uploadResult.game?.pdfUrl || uploadResult.pdfUrl;
            delete cleanGameData.pdfFile; // Remove base64 data
          }
        } catch (uploadError) {
          console.error('Error uploading PDF to storage:', uploadError);
          alert(`Error uploading PDF: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}. Please try using a PDF URL instead.`);
          return;
        }
      }

      // Debug: Log the data being sent
      console.log('Sending game data to API:', cleanGameData);

      const response = await fetch(`/api/boardgames/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanGameData)
      });
      
      // Use helper to safely parse response
      const responseData = await parseApiResponse(response);
      
      if (!response.ok) {
        if (response.status === 409) {
          alert(`❌ Juego duplicado: ${responseData.message}\n\nJuego existente:\n• Nombre: ${responseData.existingGame.nameEn}\n• Año: ${responseData.existingGame.yearRelease || 'N/A'}\n• ID: ${responseData.existingGame.id}`);
        } else if (response.status === 404) {
          // Game not found - refresh the games list and show helpful error
          alert(`❌ Error: ${responseData.message || `Game with ID ${gameId} not found`}\n\nThis may happen if:\n• The game was deleted\n• The games list is out of sync\n\nPlease refresh the page and try again.`);
          // Refresh games list to sync state
          await fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
        } else {
          throw new Error(responseData.message || 'Failed to update game properties');
        }
        return;
      }
      
      // Success message
      alert(`✅ Juego "${responseData.game.nameEn}" actualizado exitosamente!`);
      
      // Update local games list with new data (including shop items) and refetch to stay in sync
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...responseData.game } : g));
      setEditingGame(prev => ({ ...prev, [gameId]: false }));
      setEditingGameData(prev => ({ ...prev, [gameId]: {} }));
      setEditingShopItems(prev => ({
        ...prev,
        [gameId]: (responseData.game?.shopItems ?? []).map((item, idx) => ({
          ...item,
          order: item.order ?? idx + 1
        }))
      }));
      await fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
      
    } catch (error) {
      console.error('Error saving game properties:', error);
      alert(`Error al guardar las propiedades del juego: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSavingGame(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleGameClick = (game: Game) => {
    setSelectedGame(game);
  };

  const handleBackClick = () => {
    setSelectedGame(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchGames(newPage, searchTerm, showOnlyWithoutRules);
      setSelectedGame(null); // Reset selected game when changing pages
    }
  };

  const handleScrapeGame = async () => {
    if (!scraperUrls.gameUrl.trim()) {
      // Just return silently if no URL provided
      return;
    }

    setScrapingGame(true);
    try {
        const urls = [scraperUrls.gameUrl, scraperUrls.rulesUrl].filter(url => url.trim());
        const response = await fetch('/api/scraper/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check for duplicate before filling the form
        const gameName = data.data.combined.name || '';
        if (gameName) {
          const duplicateResponse = await fetch(`/api/boardgames?search=${encodeURIComponent(gameName)}&limit=1`);
          if (duplicateResponse.ok) {
            const duplicateData = await duplicateResponse.json();
            const exactMatch = duplicateData.games.find((game: any) => 
              game.nameEn?.toLowerCase() === gameName.toLowerCase() ||
              game.nameEs?.toLowerCase() === gameName.toLowerCase() ||
              game.name?.toLowerCase() === gameName.toLowerCase()
            );
            
            if (exactMatch) {
              // Game already exists - show error and don't fill the form
              showToast(
                `Cannot save: "${exactMatch.nameEn}" ${exactMatch.yearRelease ? `(${exactMatch.yearRelease})` : ''} already exists in the database!`,
                'error'
              );
              setScrapingGame(false);
              return;
            }
          }
        }
        
        // Fill the form with scraped data
        setNewGameForm({
          nameEn: data.data.combined.name || '',
          nameEs: data.data.combined.name || '', // Use same name for both languages
          yearRelease: data.data.combined.releaseYear || undefined,
          designer: data.data.combined.designer || '',
          developer: data.data.combined.publisher || '', // Use publisher as developer
          minPlayers: data.data.combined.minPlayers || undefined,
          maxPlayers: data.data.combined.maxPlayers || undefined,
          durationMinutes: data.data.combined.playTime || undefined,
          imageUrl: data.data.combined.imageUrl || '',
          thumbnailUrl: data.data.combined.imageUrl || '', // Use same image for thumbnail
          videoUrl: '', // Leave empty for manual entry
          pdfUrl: '', // Leave empty for manual entry
          officialWebsite: '', // Leave empty for manual entry
          fullDescription: data.data.combined.description || '',
          rulesText: data.data.combined.rules || ''
        });
        
        // Hide scraper form and show add game form
        setShowScraperForm(false);
        setShowAddGameForm(true);
        
        showToast(`Successfully scraped "${data.data.combined.name}"!`, 'success');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to scrape game data');
      }
    } catch (error) {
      console.error('Error scraping game:', error);
      showToast(`Error scraping game: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setScrapingGame(false);
    }
  };

  const handleAddGame = async () => {
    if (!newGameForm.nameEn.trim()) {
      showToast('Please enter a game name', 'error');
      return;
    }

    if (duplicateCheck.isDuplicate) {
      showToast(
        `Cannot save: "${duplicateCheck.existingGame.nameEn}" ${duplicateCheck.existingGame.yearRelease ? `(${duplicateCheck.existingGame.yearRelease})` : ''} already exists in the database!`,
        'error'
      );
      return;
    }

    setAddingGame(true);
    try {
      // Get the base64 content from the RichTextEditor
      const base64RulesText = newGameRulesEditorRef.current?.getBase64Content() || newGameForm.rulesText || '';
      
      // Convert base64 images to file references
      const imageResponse = await fetch('/api/rules/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: base64RulesText,
          gameId: 0 // Will be updated after game creation
        })
      });
      
      let processedRulesText = base64RulesText;
      if (imageResponse.ok) {
        const { content } = await imageResponse.json();
        processedRulesText = content;
      }
      
      const gameData = {
        ...newGameForm,
        rulesText: processedRulesText
      };

      const response = await fetch('/api/boardgames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });

      if (response.ok) {
        const newGame = await parseApiResponse(response);
        showToast(`Game "${newGame.game.nameEn}" added successfully!`, 'success');
        
        // Reset form
        setNewGameForm({
          nameEn: '',
          nameEs: '',
          yearRelease: undefined,
          designer: '',
          developer: '',
          minPlayers: undefined,
          maxPlayers: undefined,
          durationMinutes: undefined,
          imageUrl: '',
          thumbnailUrl: '',
          videoUrl: '',
          pdfUrl: '',
          pdfFile: '',
          officialWebsite: '',
          fullDescription: '',
          rulesText: '',
          isExpansion: false
        });
        
        // Clear scraper URLs after successful game addition
        setScraperUrls({
          gameUrl: '',
          rulesUrl: ''
        });
        
        setShowAddGameForm(false);
        
        // Refresh games list
        await fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
      } else {
        const error = await parseApiResponse(response);
        
        // Handle duplicate game error specifically
        if (response.status === 409) {
          showToast(`Duplicate Game: ${error.existingGame.nameEn} (${error.existingGame.yearRelease || 'N/A'}) already exists`, 'error');
        } else {
          throw new Error(error.message || 'Error adding game');
        }
      }
    } catch (error) {
      console.error('Error adding game:', error);
      showToast(`Error adding game: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setAddingGame(false);
    }
  };

  const confirmDeleteGame = (game: Game) => {
    setDeleteConfirm({
      gameId: game.id,
      gameName: game.nameEn || game.nameEs,
      isOpen: true
    });
  };

  const cancelDeleteGame = () => {
    setDeleteConfirm({
      gameId: null,
      gameName: '',
      isOpen: false
    });
  };

  const deleteGame = async (gameId: number) => {
    setDeletingGame(prev => ({ ...prev, [gameId]: true }));
    
    try {
      const response = await fetch(`/api/boardgames/${gameId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Remove the game from the local state
        setGames(prev => prev.filter(game => game.id !== gameId));
        showToast('Game deleted successfully!', 'success');
        
        // Close the confirmation modal
        cancelDeleteGame();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error deleting game');
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      showToast(`Error deleting game: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeletingGame(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const checkForDuplicate = async (gameName: string) => {
    if (!gameName.trim()) {
      setDuplicateCheck({ isChecking: false, isDuplicate: false, existingGame: null });
      return;
    }

    setDuplicateCheck(prev => ({ ...prev, isChecking: true }));
    
    try {
      const response = await fetch(`/api/boardgames?search=${encodeURIComponent(gameName)}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        const exactMatch = data.games.find((game: any) => 
          game.nameEn?.toLowerCase() === gameName.toLowerCase() ||
          game.nameEs?.toLowerCase() === gameName.toLowerCase() ||
          game.name?.toLowerCase() === gameName.toLowerCase()
        );
        
        if (exactMatch) {
          setDuplicateCheck({
            isChecking: false,
            isDuplicate: true,
            existingGame: exactMatch
          });
        } else {
          setDuplicateCheck({
            isChecking: false,
            isDuplicate: false,
            existingGame: null
          });
        }
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      setDuplicateCheck({ isChecking: false, isDuplicate: false, existingGame: null });
    }
  };

  const resetForm = () => {
    // Clear timeout if exists
    if (duplicateCheckTimeout) {
      clearTimeout(duplicateCheckTimeout);
      setDuplicateCheckTimeout(null);
    }
    
    setNewGameForm({
      nameEn: '',
      nameEs: '',
      yearRelease: undefined,
      designer: '',
      developer: '',
      minPlayers: undefined,
      maxPlayers: undefined,
      durationMinutes: undefined,
      imageUrl: '',
      thumbnailUrl: '',
      fullDescription: '',
      rulesText: '',
      isExpansion: false
    });
    setDuplicateCheck({ isChecking: false, isDuplicate: false, existingGame: null });
  };

  const getGameDescription = (game: Game) => {
    if (game.descriptions && game.descriptions.length > 0) {
      const englishDesc = game.descriptions.find(d => d.language === 'en');
      if (englishDesc) {
        const description = englishDesc.fullDescription || englishDesc.shortDescription || 'No description available';
        return cleanHtmlEntities(description);
      }
    }
    return 'No description available';
  };

  // Helper function to truncate description
  const truncateDescription = (text: string, maxLength: number = 300) => {
    if (!text || text.length <= maxLength) return text;
    
    // Find the last sentence ending before the max length
    const truncated = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.7) {
      return text.substring(0, lastSentenceEnd + 1);
    }
    
    // If no good sentence break, just truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return text.substring(0, lastSpace) + '...';
  };

  const getDisplayDescription = (game: Game) => {
    const fullDescription = getGameDescription(game);
    return showFullDescription ? fullDescription : truncateDescription(fullDescription);
  };

  const getGameRules = (game: Game) => {
    if (game.rules && game.rules.length > 0) {
      const englishRules = game.rules.find(r => r.language === 'en');
      if (englishRules) {
        const rules = englishRules.rulesText || englishRules.rulesHtml || 'No rules available';
        return cleanHtmlEntities(rules);
      }
    }
    return 'No rules available';
  };

  const cleanHtmlEntities = (text: string) => {
    if (!text) return text;
    return text
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '...')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '\r')
      .replace(/&#9;/g, '\t');
  };

  // Process markdown content and convert heading anchors to HTML elements with IDs
  const processMarkdownContent = (text: string): React.ReactNode => {
    if (!text) return text;
    
    // Split by lines to process headings with anchors
    const lines = text.split('\n');
    const processedLines: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      // Handle empty lines as paragraph breaks
      if (line.trim() === '') {
        processedLines.push(
          <div key={`break-${index}`} className="mb-4" />
        );
        return;
      }
      
      // Check if line is a heading with explicit anchor ID (e.g., "## Heading {#anchor-id}")
      const headingWithAnchor = line.match(/^(#{1,6})\s+(.+?)\s+\{#([^}]+)\}$/);
      
      if (headingWithAnchor) {
        const [, hashes, headingText, anchorId] = headingWithAnchor;
        const level = hashes.length;
        
        // Create heading element with explicit ID
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        processedLines.push(
          <HeadingTag
            key={`heading-${index}`}
            id={anchorId}
            className={`font-bold text-gray-900 mt-6 mb-3 ${
              level === 1 ? 'text-2xl' : 
              level === 2 ? 'text-xl' : 
              level === 3 ? 'text-lg' : 
              level === 4 ? 'text-base' : 
              'text-sm'
            }`}
          >
            {headingText}
          </HeadingTag>
        );
      } else {
        // Check if line is a regular heading without anchor (e.g., "## Heading")
        const regularHeading = line.match(/^(#{1,6})\s+(.+)$/);
        
        if (regularHeading) {
          const [, hashes, headingText] = regularHeading;
          const level = hashes.length;
          
          // Generate anchor ID from heading text
          const anchorId = headingText
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
          
          // Create heading element with auto-generated ID
          const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
          processedLines.push(
            <HeadingTag
              key={`heading-${index}`}
              id={anchorId}
              className={`font-bold text-gray-900 mt-6 mb-3 ${
                level === 1 ? 'text-2xl' : 
                level === 2 ? 'text-xl' : 
                level === 3 ? 'text-lg' : 
                level === 4 ? 'text-base' : 
                'text-sm'
              }`}
            >
              {headingText}
            </HeadingTag>
          );
        } else {
          // Regular line - process for markdown links
          processedLines.push(
            <div key={`line-${index}`} className="mb-2">
              {parseMarkdownLinks(line)}
            </div>
          );
        }
      }
    });
    
    return <div>{processedLines}</div>;
  };

  const parseMarkdownLinks = (text: string): React.ReactNode => {
    if (!text) return text;
    
    // Simply remove all markdown links and return plain text
    let processedText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    return <span style={{ whiteSpace: 'pre-line' }}>{processedText}</span>;
  };


  const renderRulesWithImages = (text: string) => {
    if (!text) return text;
    
    // Handle file references, base64 images, and image placeholders
    const parts = text.split(/(!\[.*?\]\(\/uploads\/rules-images\/[^)]+\)|!\[.*?\]\(data:image\/[^)]+\)|\[IMAGE:[^\]]+\])/g);
    
    return parts.map((part, index) => {
      // Check if this part is a file reference image
      const fileImageMatch = part.match(/!\[(.*?)\]\(\/uploads\/rules-images\/([^)]+)\)/);
      if (fileImageMatch) {
        const [, altText, filePath] = fileImageMatch;
        return (
          <img
            key={index}
            src={`/uploads/rules-images/${filePath}`}
            alt={altText}
            className="max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block"
            style={{ maxHeight: '400px' }}
          />
        );
      }
      
      // Check if this part is a base64 image
      const base64ImageMatch = part.match(/!\[(.*?)\]\((data:image\/[^)]+)\)/);
      if (base64ImageMatch) {
        const [, altText, imageData] = base64ImageMatch;
        return (
          <img
            key={index}
            src={imageData}
            alt={altText}
            className="max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block"
            style={{ maxHeight: '400px' }}
          />
        );
      }
      
      // Check if this part is an image placeholder
      const imagePlaceholderMatch = part.match(/\[IMAGE:([^\]]+)\]/);
      if (imagePlaceholderMatch) {
        // For display purposes, we'll show a placeholder since we don't have access to the image data
        return (
          <div key={index} className="bg-gray-200 rounded-lg p-4 my-4 text-center text-gray-500">
            [Image: {imagePlaceholderMatch[1]}]
          </div>
        );
      }
      
      // Regular text - check if it contains HTML formatting
      if (part.includes('<h2>') || part.includes('<strong>') || part.includes('<em>') || part.includes('•')) {
        return (
          <div 
            key={index} 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      }
      
      // Regular text - parse markdown links
      const parsedContent = parseMarkdownLinks(part);
      return (
        <span key={index} className="whitespace-pre-wrap">
          {parsedContent}
        </span>
      );
    });
  };

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Games List
          </button>

          {/* Game Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex items-start gap-6 mb-6">
              {selectedGame.thumbnailUrl && (
                <img
                  src={selectedGame.thumbnailUrl}
                  alt={selectedGame.nameEn}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {selectedGame.nameEn}
                </h1>
                <p className="text-xl text-gray-600 mb-2">
                  {selectedGame.nameEs}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  {selectedGame.yearRelease && (
                    <span>📅 {selectedGame.yearRelease}</span>
                  )}
                  {selectedGame.designer && (
                    <span>👨‍🎨 {selectedGame.designer}</span>
                  )}
                  {selectedGame.developer && (
                    <span>🏢 {selectedGame.developer}</span>
                  )}
                  {selectedGame.minPlayers && selectedGame.maxPlayers && (
                    <span>👥 {selectedGame.minPlayers}-{selectedGame.maxPlayers} players</span>
                  )}
                  {selectedGame.durationMinutes && (
                    <span>⏱️ {selectedGame.durationMinutes} min</span>
                  )}
                </div>
              </div>
            </div>

            {/* Categories and Mechanics */}
            {(selectedGame.gameCategories.length > 0 || selectedGame.gameMechanics.length > 0) && (
              <div className="mb-6">
                {selectedGame.gameCategories.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Categories:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedGame.gameCategories.map((gc) => (
                        <span
                          key={gc.category.id}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {locale === 'es' ? gc.category.nameEs : gc.category.nameEn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedGame.gameMechanics.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Mechanics:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedGame.gameMechanics.map((gm) => (
                        <span
                          key={gm.mechanic.id}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {locale === 'es' ? gm.mechanic.nameEs : gm.mechanic.nameEn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Description:</h3>
              <div className="prose max-w-none">
                <div className="text-gray-700 text-sm">
                  {processMarkdownContent(getDisplayDescription(selectedGame))}
                </div>
                
                {/* Show More/Less Button */}
                {selectedGame && getGameDescription(selectedGame).length > 300 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-3 inline-flex items-center text-[#fbae17] hover:text-[#fbae17]/80 font-medium transition-colors text-sm"
                  >
                    {showFullDescription ? (
                      <>
                        <span>Show Less</span>
                        <ChevronUp className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        <span>Show More</span>
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Rules */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Rules:</h3>
              <div className="prose max-w-none">
                <div className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {renderRulesWithImages(getGameRules(selectedGame))}
                </div>
              </div>
            </div>

            {/* Expansions */}
            {selectedGame.baseGameExpansions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Expansions:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedGame.baseGameExpansions.map((expansion) => (
                    <div
                      key={expansion.id}
                      className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <h4 className="font-medium text-yellow-800">{expansion.nameEn}</h4>
                      <p className="text-sm text-yellow-600">{expansion.nameEs}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col">
      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed top-20 right-4 z-[9999] max-w-md rounded-lg shadow-lg p-4 transition-all duration-300 transform ${
          toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-3">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <FileText className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              className="ml-auto text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎲 Board Game Database - Editor de Reglas
          </h1>
          <p className="text-lg text-gray-600">
            Total Games: {pagination.total.toLocaleString()} | 
            Page {pagination.page} of {pagination.totalPages}
          </p>
        </div>

        {/* Add New Game Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Add New Game to Database
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScraperForm(!showScraperForm)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showScraperForm 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>{showScraperForm ? 'Hide Scraper' : 'Web Scraper'}</span>
              </button>
              <button
                onClick={() => setShowAddGameForm(!showAddGameForm)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showAddGameForm 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-[#fbae17] text-white hover:bg-yellow-600'
                }`}
              >
                {showAddGameForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showAddGameForm ? 'Cancel' : 'Manual Add'}</span>
              </button>
            </div>
          </div>

          {/* Web Scraper Form */}
          {showScraperForm && (
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🕷️ Game Scraper (BGG + RulesPal)</h3>
                <p className="text-sm text-gray-600">
                  Extract game metadata from BoardGameGeek and rules from RulesPal
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BGG Game URL (Required) *
                  </label>
                  <input
                    type="url"
                    required
                    value={scraperUrls.gameUrl}
                    onChange={(e) => {
                      const gameUrl = e.target.value;
                      // Auto-generate rulesUrl by replacing the last part with /game-rules.php
                      let rulesUrl = '';
                      if (gameUrl.includes('/index.php')) {
                        rulesUrl = gameUrl.replace('/index.php', '/game-rules.php');
                      } else if (gameUrl.endsWith('.php')) {
                        // Replace any .php file at the end with /game-rules.php
                        rulesUrl = gameUrl.replace(/\/[^/]+\.php$/, '/game-rules.php');
                      }
                      setScraperUrls({ gameUrl, rulesUrl });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://boardgamegeek.com/boardgame/230802/azul"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    BoardGameGeek page with game metadata (name, year, players, designer, publisher, etc.)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RulesPal Rules URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={scraperUrls.rulesUrl}
                    onChange={(e) => setScraperUrls(prev => ({ ...prev, rulesUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                    placeholder="https://www.rulespal.com/azul/rulebook"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    RulesPal page with complete game rules and images (optional)
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <strong>Example URLs:</strong><br />
                    BGG: https://boardgamegeek.com/boardgame/230802/azul<br />
                    RulesPal: https://www.rulespal.com/azul/rulebook
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setScraperUrls({ gameUrl: '', rulesUrl: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleScrapeGame}
                      disabled={scrapingGame || !scraperUrls.gameUrl.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {scrapingGame ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Scraping...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Scrape Game Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showAddGameForm && (
            <div className="border-t border-gray-200 pt-6">
              <form onSubmit={(e) => { e.preventDefault(); handleAddGame(); }} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Game Name (English) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newGameForm.nameEn}
                        onChange={(e) => {
                          setNewGameForm(prev => ({ ...prev, nameEn: e.target.value }));
                          
                          // Clear existing timeout
                          if (duplicateCheckTimeout) {
                            clearTimeout(duplicateCheckTimeout);
                          }
                          
                          // Set new timeout for duplicate check
                          const timeoutId = setTimeout(() => {
                            checkForDuplicate(e.target.value);
                          }, 500);
                          setDuplicateCheckTimeout(timeoutId);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] ${
                          duplicateCheck.isDuplicate 
                            ? 'border-red-500 bg-red-50' 
                            : duplicateCheck.isChecking 
                            ? 'border-yellow-500 bg-yellow-50' 
                            : 'border-gray-300'
                        }`}
                        placeholder="e.g., Catan, Ticket to Ride"
                      />
                      {duplicateCheck.isChecking && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                        </div>
                      )}
                      {duplicateCheck.isDuplicate && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-red-500 text-xl">⚠️</span>
                        </div>
                      )}
                    </div>
                    {duplicateCheck.isDuplicate && duplicateCheck.existingGame && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium">
                          ⚠️ Game already exists in database!
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Existing game: <strong>{duplicateCheck.existingGame.nameEn}</strong>
                          {duplicateCheck.existingGame.yearRelease && (
                            <span> ({duplicateCheck.existingGame.yearRelease})</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Game Name (Spanish)
                    </label>
                    <input
                      type="text"
                      value={newGameForm.nameEs}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, nameEs: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., Catan, Ticket to Ride"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Release Year
                    </label>
                    <input
                      type="number"
                      value={newGameForm.yearRelease || ''}
                      onChange={(e) => setNewGameForm(prev => ({ 
                        ...prev, 
                        yearRelease: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., 1995"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designer
                    </label>
                    <input
                      type="text"
                      value={newGameForm.designer}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, designer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., Klaus Teuber"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publisher/Developer
                    </label>
                    <input
                      type="text"
                      value={newGameForm.developer}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, developer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., Catan Studio, Days of Wonder"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Official Website
                    </label>
                    <input
                      type="url"
                      value={newGameForm.officialWebsite}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, officialWebsite: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="https://www.catan.com/"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Players
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={newGameForm.minPlayers || ''}
                      onChange={(e) => setNewGameForm(prev => ({ 
                        ...prev, 
                        minPlayers: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Players
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={newGameForm.maxPlayers || ''}
                      onChange={(e) => setNewGameForm(prev => ({ 
                        ...prev, 
                        maxPlayers: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., 4"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={newGameForm.durationMinutes || ''}
                      onChange={(e) => setNewGameForm(prev => ({ 
                        ...prev, 
                        durationMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="e.g., 90"
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={newGameForm.imageUrl}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="https://example.com/game-image.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thumbnail URL
                    </label>
                    <input
                      type="url"
                      value={newGameForm.thumbnailUrl}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="https://example.com/game-thumbnail.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Tutorial URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={newGameForm.videoUrl}
                      onChange={(e) => setNewGameForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                      placeholder="https://youtube.com/watch?v=... or embedded URL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PDF Rules (Optional)
                    </label>
                    
                    {/* PDF URL Input */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Or enter PDF URL:
                      </label>
                      <input
                        type="url"
                        value={newGameForm.pdfUrl}
                        onChange={(e) => setNewGameForm(prev => ({ ...prev, pdfUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] text-sm"
                        placeholder="https://example.com/game-rules.pdf"
                      />
                    </div>

                    {/* PDF File Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#fbae17] transition-colors">
                      <label className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium text-[#fbae17]">Click to upload PDF</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF files only (max 16MB locally, 3MB on production)</p>
                          {newGameForm.pdfFile && (
                            <p className="text-xs text-green-600 mt-1">✓ PDF file ready to upload</p>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                showToast('Please select a PDF file', 'error');
                                return;
                              }
                              // Check if we're in production (Vercel) or local
                              const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
                              const maxFileSize = isProduction ? 3 * 1024 * 1024 : 16 * 1024 * 1024; // 3MB on Vercel, 16MB locally
                              
                              if (file.size > maxFileSize) {
                                const maxSizeMB = isProduction ? 3 : 16;
                                showToast(`File size must be less than ${maxSizeMB}MB. Please use a PDF URL for larger files.`, 'error');
                                return;
                              }
                              
                              // Convert to base64
                              const reader = new FileReader();
                              reader.onload = () => {
                                setNewGameForm(prev => ({ 
                                  ...prev, 
                                  pdfFile: reader.result as string,
                                  pdfUrl: '' // Clear URL if file is uploaded
                                }));
                                showToast('PDF file selected successfully', 'success');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Clear PDF File Button */}
                    {newGameForm.pdfFile && (
                      <button
                        type="button"
                        onClick={() => setNewGameForm(prev => ({ ...prev, pdfFile: '' }))}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Remove PDF file
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Description
              <span className="text-xs text-gray-500 ml-2">(Supports markdown: links [text](url), internal links [text](#anchor), images ![alt](url), bold **text**, etc.)</span>
            </label>
                  <textarea
                    rows={6}
                    value={newGameForm.fullDescription}
                    onChange={(e) => setNewGameForm(prev => ({ ...prev, fullDescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] font-mono text-sm"
                    placeholder="A detailed description of the game... 

You can use markdown formatting:
- Links: [Link Text](https://example.com)
- Internal links: [Jump to Section](#section-id)
- Images: ![Alt Text](https://example.com/image.jpg)
- Bold: **bold text**
- Lists: - item 1, - item 2"
                  />
                  {newGameForm.fullDescription && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1 font-medium">Preview:</p>
              <div className="text-xs text-gray-700">
                {parseMarkdownLinks(newGameForm.fullDescription)}
              </div>
            </div>
                  )}
                </div>

                {/* Rules */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Rules (Optional)
                  </label>
                  <RichTextEditor
                    ref={newGameRulesEditorRef}
                    value={newGameForm.rulesText || ''}
                    onChange={(value) => setNewGameForm(prev => ({ ...prev, rulesText: value }))}
                    placeholder="Write the game rules here... (You can add/edit rules later) (Ctrl+V to paste images)"
                    rows={6}
                  />
                </div>

                {/* Is Expansion Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isExpansion"
                    checked={newGameForm.isExpansion || false}
                    onChange={(e) => setNewGameForm(prev => ({ ...prev, isExpansion: e.target.checked }))}
                    className="h-4 w-4 text-[#fbae17] focus:ring-[#fbae17] border-gray-300 rounded"
                  />
                  <label htmlFor="isExpansion" className="text-sm font-medium text-gray-700">
                    This is an expansion (not a base game)
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={addingGame || duplicateCheck.isDuplicate}
                    className="flex items-center gap-2 px-6 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingGame ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding Game...
                      </>
                    ) : duplicateCheck.isDuplicate ? (
                      <>
                        <span className="text-lg">⚠️</span>
                        Cannot Save (Duplicate)
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-4 h-4" />
                        Add Game to Database
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar juegos por nombre..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleFilterToggle}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  showOnlyWithoutRules
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showOnlyWithoutRules ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showOnlyWithoutRules ? 'Solo Sin Reglas' : 'Ver Todos'}</span>
              </button>
              <div className="text-sm text-gray-600">
                {games.filter(g => g.rules && g.rules.length > 0).length} con reglas
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Cargando juegos...</p>
          </div>
        )}

        {/* Games Grid */}
        {!loading && (
          <>
            <div className="space-y-6">
              {games.map((game) => {
                const hasRules = game.rules && game.rules.length > 0;
                const currentRule = game.rules?.find(r => r.language === 'es');
                const isEditing = editingRules[game.id];
                const isSaving = savingRules[game.id];
                
                return (
                  <div
                    key={game.id}
                    className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                      hasRules ? 'border-green-500' : 'border-yellow-400'
                    }`}
                  >
                    {/* Game Header */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 flex-shrink-0">
                          {editingGame[game.id] ? (
                            <div className="space-y-2">
                              <input
                                type="url"
                                placeholder="Thumbnail URL"
                                value={editingGameData[game.id]?.thumbnailUrl || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], thumbnailUrl: e.target.value }
                                }))}
                                className="w-20 text-xs px-1 py-1 border border-gray-300 rounded"
                              />
                              <input
                                type="url"
                                placeholder="Image URL"
                                value={editingGameData[game.id]?.imageUrl || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], imageUrl: e.target.value }
                                }))}
                                className="w-20 text-xs px-1 py-1 border border-gray-300 rounded"
                              />
                            </div>
                          ) : (
                            <>
                              {(game.thumbnailUrl || game.imageUrl) ? (
                                <img
                                  src={game.thumbnailUrl || game.imageUrl}
                                  alt={game.nameEn}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              ) : (
                                <img
                                  src="/NoImageIcon.svg"
                                  alt="Sin imagen"
                                  className="w-20 h-20 object-contain rounded-lg bg-gray-100 p-2"
                                />
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingGame[game.id] ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Name (English)"
                                value={editingGameData[game.id]?.nameEn || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], nameEn: e.target.value }
                                }))}
                                className="w-full px-3 py-2 text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                              />
                              <input
                                type="text"
                                placeholder="Name (Spanish)"
                                value={editingGameData[game.id]?.nameEs || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], nameEs: e.target.value }
                                }))}
                                className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                              />
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <input
                                  type="number"
                                  placeholder="Year"
                                  value={editingGameData[game.id]?.yearRelease || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], yearRelease: e.target.value ? parseInt(e.target.value) : undefined }
                                  }))}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
                                <input
                                  type="text"
                                  placeholder="Designer"
                                  value={editingGameData[game.id]?.designer || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], designer: e.target.value }
                                  }))}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
                                <input
                                  type="number"
                                  placeholder="Min Players"
                                  min="1"
                                  max="20"
                                  value={editingGameData[game.id]?.minPlayers || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], minPlayers: e.target.value ? parseInt(e.target.value) : undefined }
                                  }))}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
                                <input
                                  type="number"
                                  placeholder="Max Players"
                                  min="1"
                                  max="20"
                                  value={editingGameData[game.id]?.maxPlayers || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], maxPlayers: e.target.value ? parseInt(e.target.value) : undefined }
                                  }))}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
                                <input
                                  type="number"
                                  placeholder="Duration (min)"
                                  min="1"
                                  max="480"
                                  value={editingGameData[game.id]?.durationMinutes || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], durationMinutes: e.target.value ? parseInt(e.target.value) : undefined }
                                  }))}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Publisher/Developer"
                                value={editingGameData[game.id]?.developer || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], developer: e.target.value }
                                }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                              />
                              <input
                                type="url"
                                placeholder="Official Website (optional)"
                                value={editingGameData[game.id]?.officialWebsite || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], officialWebsite: e.target.value }
                                }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                              />
                              <input
                                type="url"
                                placeholder="Video Tutorial URL (optional)"
                                value={editingGameData[game.id]?.videoUrl || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], videoUrl: e.target.value }
                                }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                              />
                              <input
                                type="text"
                                placeholder="Categories (comma-separated, e.g., Strategy Games, Economic, Negotiation)"
                                value={editingGameData[game.id]?.categories || ''}
                                onChange={(e) => setEditingGameData(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], categories: e.target.value }
                                }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                              />

                              {/* Shop Items (per-game shop section) */}
                              <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-800">Shop Cards for this Game</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentItems = editingShopItems[game.id] ?? game.shopItems ?? [];
                                      const maxOrder = currentItems.length > 0 
                                        ? Math.max(...currentItems.map(item => item.order ?? 0))
                                        : 0;
                                      setEditingShopItems(prev => ({
                                        ...prev,
                                        [game.id]: [ ...(prev[game.id] ?? game.shopItems ?? []), { title: '', imageUrl: '', link: '', order: maxOrder + 1 } ]
                                      }));
                                    }}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Add Card
                                  </button>
                                </div>

                                { (editingShopItems[game.id] ?? game.shopItems ?? []).length === 0 && (
                                  <p className="text-xs text-gray-500">No shop cards yet. Add one to show purchase options for this game.</p>
                                )}

                                <div className="space-y-3">
                                  {[...(editingShopItems[game.id] ?? game.shopItems ?? [])]
                                    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                                    .map((item, idx) => {
                                      const originalIdx = (editingShopItems[game.id] ?? game.shopItems ?? []).findIndex(i => i === item);
                                      return (
                                    <div key={originalIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="space-y-1">
                                        <label className="text-xs text-gray-600">Order</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.order ?? idx + 1}
                                          onChange={(e) => {
                                            const value = parseInt(e.target.value) || 1;
                                            setEditingShopItems(prev => {
                                              const list = [ ...(prev[game.id] ?? game.shopItems ?? []) ];
                                              list[originalIdx] = { ...list[originalIdx], order: value };
                                              return { ...prev, [game.id]: list };
                                            });
                                          }}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                          placeholder="1"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-xs text-gray-600">Title</label>
                                        <input
                                          type="text"
                                          value={item.title || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setEditingShopItems(prev => {
                                              const list = [ ...(prev[game.id] ?? game.shopItems ?? []) ];
                                              list[originalIdx] = { ...list[originalIdx], title: value };
                                              return { ...prev, [game.id]: list };
                                            });
                                          }}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                          placeholder="e.g., Catan Base Game"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-xs text-gray-600">Image URL</label>
                                        <input
                                          type="url"
                                          value={item.imageUrl || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setEditingShopItems(prev => {
                                              const list = [ ...(prev[game.id] ?? game.shopItems ?? []) ];
                                              list[originalIdx] = { ...list[originalIdx], imageUrl: value };
                                              return { ...prev, [game.id]: list };
                                            });
                                          }}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                          placeholder="https://m.media-amazon.com/..."
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <label className="text-xs text-gray-600">Link</label>
                                          <button
                                            type="button"
                                            onClick={() => setEditingShopItems(prev => {
                                              const list = [ ...(prev[game.id] ?? game.shopItems ?? []) ];
                                              list.splice(originalIdx, 1);
                                              return { ...prev, [game.id]: list };
                                            })}
                                            className="text-xs text-red-600 hover:text-red-800"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                        <input
                                          type="url"
                                          value={item.link || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setEditingShopItems(prev => {
                                              const list = [ ...(prev[game.id] ?? game.shopItems ?? []) ];
                                              list[originalIdx] = { ...list[originalIdx], link: value };
                                              return { ...prev, [game.id]: list };
                                            });
                                          }}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                          placeholder="Amazon link or other store link"
                                        />
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>

                                {/* Games linked to this Shop Card list */}
                                <div className="mt-4 pt-4 border-t border-gray-300">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-800">Games linked to this Shop Card list</span>
                                  </div>
                                <p className="text-xs text-gray-600">
                                  Games in this list share the same shop cards. Adding a game here will link its shop list to this game's shop cards.
                                </p>
                                <div className="space-y-2">
                                  {linkedShopGames[game.id] && linkedShopGames[game.id].length > 0 ? (
                                    linkedShopGames[game.id].map((linkedGame) => (
                                      <div key={linkedGame.id} className="flex items-center justify-between bg-white border border-gray-200 rounded p-2">
                                        <span className="text-sm text-gray-800">
                                          {linkedGame.nameEn}
                                          {linkedGame.isMaster && (
                                            <span className="ml-2 text-xs text-blue-600 font-medium">(Master)</span>
                                          )}
                                        </span>
                                        {!linkedGame.isMaster && (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              // Remove link by updating the linked game to have no master
                                              try {
                                                const response = await fetch(`/api/boardgames/${linkedGame.id}`, {
                                                  method: 'PUT',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ shopListMasterGameId: null })
                                                });
                                                if (response.ok) {
                                                  await fetchLinkedShopGames(game.id);
                                                  showToast('Game link removed successfully', 'success');
                                                } else {
                                                  const errorData = await response.json().catch(() => ({ message: 'Failed to remove link' }));
                                                  alert(`Failed to remove link: ${errorData.message || 'Unknown error'}`);
                                                }
                                              } catch (error) {
                                                console.error('Error removing link:', error);
                                                alert('Error removing link');
                                              }
                                            }}
                                            className="text-xs text-red-600 hover:text-red-800"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-gray-500">No linked games yet. The current game will appear as the master.</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowLinkGameModal(prev => ({ ...prev, [game.id]: true }))}
                                    className="text-xs px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Link Game
                                  </button>
                                </div>
                                <GameSearchModal
                                  isOpen={showLinkGameModal[game.id] || false}
                                  onClose={() => setShowLinkGameModal(prev => ({ ...prev, [game.id]: false }))}
                                  onSelectGame={async (selectedGame) => {
                                    try {
                                      const masterId = shopMasterGameId[game.id] || game.id;
                                      
                                      // Prevent linking a game to itself
                                      if (selectedGame.id === masterId) {
                                        showToast('A game cannot link to itself', 'error');
                                        return;
                                      }
                                      
                                      // Prevent linking if already linked
                                      const alreadyLinked = linkedShopGames[game.id]?.some(g => g.id === selectedGame.id);
                                      if (alreadyLinked) {
                                        showToast('This game is already linked', 'error');
                                        return;
                                      }
                                      
                                      // Link the selected game to the master
                                      const linkResponse = await fetch(`/api/boardgames/${selectedGame.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ shopListMasterGameId: masterId })
                                      });
                                      
                                      if (linkResponse.ok) {
                                        const responseData = await linkResponse.json();
                                        console.log('Link response:', responseData);
                                        
                                        // Manually add the linked game to the state immediately
                                        const masterId = shopMasterGameId[game.id] || game.id;
                                        const newLinkedGame = {
                                          id: selectedGame.id,
                                          nameEn: selectedGame.nameEn || selectedGame.name,
                                          nameEs: selectedGame.nameEs,
                                          isMaster: false
                                        };
                                        
                                        // Update the linked games list to include the new game
                                        setLinkedShopGames(prev => {
                                          const currentList = prev[game.id] || [];
                                          // Check if it's already in the list
                                          if (currentList.some(g => g.id === selectedGame.id)) {
                                            return prev;
                                          }
                                          // Add the new game to the list
                                          return {
                                            ...prev,
                                            [game.id]: [...currentList, newLinkedGame]
                                          };
                                        });
                                        
                                        // Try to refresh from the endpoint (but don't fail if it doesn't work)
                                        // Only refresh if endpoint is available, otherwise keep the manually added game
                                        try {
                                          const refreshResponse = await fetch(`/api/boardgames/${game.id}/linked-shop-games`);
                                          if (refreshResponse.ok) {
                                            await fetchLinkedShopGames(game.id);
                                          } else {
                                            // Endpoint not available, keep the manually added game
                                            console.warn('Linked shop games endpoint not available, keeping manually added game');
                                          }
                                        } catch (error) {
                                          console.warn('Could not refresh linked games from endpoint, using manual update:', error);
                                        }
                                        
                                        // Don't close the modal - allow adding multiple games
                                        // setShowLinkGameModal(prev => ({ ...prev, [game.id]: false }));
                                        showToast(`${selectedGame.nameEn || selectedGame.name} linked successfully`, 'success');
                                      } else {
                                        const errorData = await linkResponse.json().catch(() => ({ message: 'Failed to link game' }));
                                        console.error('Link error:', errorData);
                                        showToast(`Failed to link game: ${errorData.message || 'Unknown error'}`, 'error');
                                      }
                                    } catch (error) {
                                      console.error('Error linking game:', error);
                                      showToast('Error linking game', 'error');
                                    }
                                  }}
                                  existingGameIds={[
                                    game.id,
                                    ...(linkedShopGames[game.id]?.map(g => g.id) || [])
                                  ]}
                                />
                                </div>
                              </div>
                              {/* PDF Upload Section */}
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  PDF Rules (Optional)
                                </label>
                                
                                {/* PDF URL Input */}
                                <input
                                  type="url"
                                  placeholder="Or enter PDF URL..."
                                  value={editingGameData[game.id]?.pdfUrl || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], pdfUrl: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
                                
                                {/* PDF File Upload */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-[#fbae17] transition-colors">
                                  <label className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                      <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                      <p className="text-xs text-gray-600 mb-1">
                                        <span className="font-medium text-[#fbae17]">Upload PDF</span> or drag
                                      </p>
                                      <p className="text-xs text-gray-500">Max 16MB locally, 3MB on production</p>
                                      {editingGameData[game.id]?.pdfFile && (
                                        <p className="text-xs text-green-600 mt-1">✓ PDF ready</p>
                                      )}
                                    </div>
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.type !== 'application/pdf') {
                                            showToast('Please select a PDF file', 'error');
                                            return;
                                          }
                                          // Check if we're in production (Vercel) or local
                                          const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
                                          const maxFileSize = isProduction ? 3 * 1024 * 1024 : 16 * 1024 * 1024; // 3MB on Vercel, 16MB locally
                                          
                                          if (file.size > maxFileSize) {
                                            const maxSizeMB = isProduction ? 3 : 16;
                                            showToast(`File size must be less than ${maxSizeMB}MB. Please use a PDF URL for larger files.`, 'error');
                                            return;
                                          }
                                          
                                          // Show uploading state
                                          showToast('Uploading PDF file...', 'info');
                                          
                                          try {
                                            const reader = new FileReader();
                                            
                                            // Create a promise to handle the async file reading
                                            const fileData = await new Promise<string>((resolve, reject) => {
                                              reader.onload = () => resolve(reader.result as string);
                                              reader.onerror = () => reject(new Error('Failed to read file'));
                                              reader.readAsDataURL(file);
                                            });
                                            
                                            // Update the form data
                                            setEditingGameData(prev => ({
                                              ...prev,
                                              [game.id]: { 
                                                ...prev[game.id], 
                                                pdfFile: fileData,
                                                pdfUrl: '' 
                                              }
                                            }));
                                            
                                            // Show success message
                                            const fileSizeKB = Math.round(file.size / 1024);
                                            showToast(`PDF file uploaded successfully (${fileSizeKB} KB)`, 'success');
                                            
                                          } catch (error) {
                                            console.error('Error reading PDF file:', error);
                                            showToast('Failed to read PDF file', 'error');
                                          }
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                
                                {/* Clear PDF File Button */}
                                {editingGameData[game.id]?.pdfFile && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingGameData(prev => ({
                                      ...prev,
                                      [game.id]: { ...prev[game.id], pdfFile: '' }
                                    }))}
                                    className="text-xs text-red-600 hover:text-red-800 underline"
                                  >
                                    Remove PDF file
                                  </button>
                                )}
                              </div>
                              {/* Is Expansion Checkbox */}
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`isExpansion-${game.id}`}
                                  checked={editingGameData[game.id]?.isExpansion || false}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], isExpansion: e.target.checked }
                                  }))}
                                  className="h-4 w-4 text-[#fbae17] focus:ring-[#fbae17] border-gray-300 rounded"
                                />
                                <label htmlFor={`isExpansion-${game.id}`} className="text-sm font-medium text-gray-700">
                                  This is an expansion (not a base game)
                                </label>
                              </div>
                              <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Description
              <span className="text-xs text-gray-500 ml-2">(Supports markdown: links [text](url), internal links [text](#anchor), images ![alt](url), bold **text**, etc.)</span>
            </label>
                                <textarea
                                  rows={6}
                                  placeholder="Game description... 

You can use markdown formatting:
- Links: [Link Text](https://example.com)
- Images: ![Alt Text](https://example.com/image.jpg)
- Bold: **bold text**
- Lists: - item 1, - item 2"
                                  value={editingGameData[game.id]?.fullDescription || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], fullDescription: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] font-mono"
                                />
                                {editingGameData[game.id]?.fullDescription && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1 font-medium">Preview:</p>
              <div className="text-xs text-gray-700">
                {parseMarkdownLinks(editingGameData[game.id]?.fullDescription || '')}
              </div>
            </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {game.nameEn}
                              </h3>
                              {game.nameEs && (
                                <p className="text-gray-600 mb-2">{game.nameEs}</p>
                              )}
                              <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                {game.yearRelease && (
                                  <span>📅 {game.yearRelease}</span>
                                )}
                                {game.designer && (
                                  <span>👨‍🎨 {game.designer}</span>
                                )}
                                {game.minPlayers && game.maxPlayers && (
                                  <span>👥 {game.minPlayers}-{game.maxPlayers} jugadores</span>
                                )}
                                {game.durationMinutes && (
                                  <span>⏱️ {game.durationMinutes} min</span>
                                )}
                              </div>
                              
                              {/* Video and PDF Links */}
                              {(game.videoUrl || game.pdfUrl) && (
                                <div className="mt-3">
                                  {/* Video Links with Embedded Players */}
                                  {game.videoUrl && (
                                    <VideoLinks 
                                      videoUrls={game.videoUrl} 
                                      gameName={game.nameEn}
                                    />
                                  )}
                                  
                                  {/* Simple PDF Open Button */}
                                  {game.pdfUrl && (
                                    <div className="mb-4">
                                      <a
                                        href={game.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg text-sm font-medium hover:bg-[#e09915] transition-colors duration-200 shadow-md hover:shadow-lg"
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Open PDF Rules
                                      </a>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Direct link to PDF rules
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* PDF Handler */}
                                  <PDFHandler 
                                    pdfUrl={game.pdfUrl}
                                    pdfFile={game.pdfFile}
                                    gameName={game.nameEn}
                                    gameId={game.id}
                                    isAdmin={true}
                                    onPDFUploaded={() => {
                                      // Refresh the games list to show updated PDF
                                      fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
                                    }}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {editingGame[game.id] ? (
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => saveGameProperties(game.id)}
                                disabled={savingGame[game.id]}
                                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                              >
                                <Save className="w-4 h-4" />
                                <span>{savingGame[game.id] ? 'Guardando...' : 'Guardar'}</span>
                              </button>
                              <button
                                onClick={() => cancelEditingGame(game.id)}
                                className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                              >
                                <X className="w-4 h-4" />
                                <span>Cancelar</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => startEditingGame(game)}
                                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Editar Juego</span>
                              </button>
                              <button
                                onClick={() => confirmDeleteGame(game)}
                                disabled={deletingGame[game.id]}
                                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>{deletingGame[game.id] ? 'Eliminando...' : 'Eliminar Juego'}</span>
                              </button>
                              {hasRules ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                                  <FileText className="w-4 h-4 mr-1" />
                                  Tiene reglas
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                                  ⚠️ Sin reglas
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rules Section */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">Reglas del Juego</h4>
                        <div className="flex items-center space-x-2">
                          {!hasRules && (
                            <button
                              onClick={() => createRuleFromScrapped(game.id)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Importar</span>
                            </button>
                          )}
                          {!isEditing ? (
                            <button
                              onClick={() => startEditingRule(game.id, currentRule?.rulesText)}
                              className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>{hasRules ? 'Editar' : 'Crear'}</span>
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => saveRule(game.id)}
                                disabled={isSaving}
                                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                              >
                                <Save className="w-4 h-4" />
                                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                              </button>
                              <button
                                onClick={() => cancelEditingRule(game.id)}
                                className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                              >
                                <X className="w-4 h-4" />
                                <span>Cancelar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <RichTextEditor
                          ref={editingRulesEditorRef}
                          value={editingRuleContent[game.id] || ''}
                          onChange={(value) => setEditingRuleContent(prev => ({
                            ...prev,
                            [game.id]: value
                          }))}
                          placeholder="Escribe las reglas del juego aquí... (Puedes pegar imágenes con Ctrl+V)"
                          rows={10}
                        />
                      ) : hasRules ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="prose max-w-none">
                            <div className="text-gray-700 whitespace-pre-wrap">
                              {renderRulesWithImages(currentRule?.rulesText || 'No hay reglas disponibles')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                          <p className="text-yellow-800">
                            Este juego aún no tiene reglas. Haz clic en "Crear" para agregar reglas o "Importar" para usar reglas scrapeadas.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${pagination.hasPrev 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                ← Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(
                    pagination.totalPages - 4,
                    pagination.page - 2
                  )) + i;
                  
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`
                        px-3 py-2 rounded-lg font-medium transition-colors
                        ${pageNum === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${pagination.hasNext 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar Juego</h3>
                  <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  ¿Estás seguro de que quieres eliminar el juego{' '}
                  <span className="font-semibold text-gray-900">"{deleteConfirm.gameName}"</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Se eliminarán todas las reglas, descripciones y datos asociados.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelDeleteGame}
                  disabled={deletingGame[deleteConfirm.gameId || 0]}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteConfirm.gameId && deleteGame(deleteConfirm.gameId)}
                  disabled={deletingGame[deleteConfirm.gameId || 0]}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400"
                >
                  {deletingGame[deleteConfirm.gameId || 0] ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to Top Button */}
      {/* <BackToTopButton /> */}

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

export default function BoardGameDatabase() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div></div>}>
      <BoardGameDatabaseContent />
    </Suspense>
  );
}
