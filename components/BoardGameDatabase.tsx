'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Edit3, Save, X, Plus, FileText, Eye, EyeOff, Database, Gamepad2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor';
import Footer from './Footer';
import LazyList from './LazyList';
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
  fullDescription?: string;
  rulesText?: string;
}

export default function BoardGameDatabase() {
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRules, setEditingRules] = useState<{[key: number]: boolean}>({});
  const [editingRuleContent, setEditingRuleContent] = useState<{[key: number]: string}>({});
  const [savingRules, setSavingRules] = useState<{[key: number]: boolean}>({});
  const [editingGame, setEditingGame] = useState<{[key: number]: boolean}>({});
  const [editingGameData, setEditingGameData] = useState<{[key: number]: Partial<Game> & { fullDescription?: string }}>({});
  const [savingGame, setSavingGame] = useState<{[key: number]: boolean}>({});
  const [showOnlyWithoutRules, setShowOnlyWithoutRules] = useState(false);
  const [showAddGameForm, setShowAddGameForm] = useState(false);
  const [showScraperForm, setShowScraperForm] = useState(false);
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
    fullDescription: '',
    rulesText: ''
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
      
      const response = await fetch(`/api/boardgames?${params}`);
      const data = await response.json();
      
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
        
        if (!response.ok) throw new Error('Failed to update rule');
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
        
        if (!response.ok) throw new Error('Failed to create rule');
      }
      
      // Refresh the games list to show updated data
      await fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
      
      // Reset editing state
      setEditingRules(prev => ({ ...prev, [gameId]: false }));
      setEditingRuleContent(prev => ({ ...prev, [gameId]: '' }));
      
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Error al guardar las reglas. Por favor, inténtalo de nuevo.');
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
        fullDescription: currentDescription !== 'No description available' ? currentDescription : ''
      }
    }));
  };

  const cancelEditingGame = (gameId: number) => {
    setEditingGame(prev => ({ ...prev, [gameId]: false }));
    setEditingGameData(prev => ({ ...prev, [gameId]: {} }));
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

      // Validate year if provided
      if (gameData.yearRelease && (gameData.yearRelease < 1800 || gameData.yearRelease > 2030)) {
        alert('El año de lanzamiento debe estar entre 1800 y 2030');
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

      const response = await fetch(`/api/boardgames/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          alert(`❌ Juego duplicado: ${responseData.message}\n\nJuego existente:\n• Nombre: ${responseData.existingGame.nameEn}\n• Año: ${responseData.existingGame.yearRelease || 'N/A'}\n• ID: ${responseData.existingGame.id}`);
        } else {
          throw new Error(responseData.message || 'Failed to update game properties');
        }
        return;
      }
      
      // Success message
      alert(`✅ Juego "${responseData.game.nameEn}" actualizado exitosamente!`);
      
      // Refresh the games list to show updated data
      await fetchGames(pagination.page, searchTerm, showOnlyWithoutRules);
      
      // Reset editing state
      setEditingGame(prev => ({ ...prev, [gameId]: false }));
      setEditingGameData(prev => ({ ...prev, [gameId]: {} }));
      
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
      const response = await fetch('/api/scraper/ultraboardgames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scraperUrls)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Fill the form with scraped data
        setNewGameForm({
          nameEn: data.gameInfo.nameEn || '',
          nameEs: data.gameInfo.nameEs || '',
          yearRelease: data.gameInfo.yearRelease || undefined,
          designer: data.gameInfo.designer || '',
          developer: data.gameInfo.developer || '',
          minPlayers: data.gameInfo.minPlayers || undefined,
          maxPlayers: data.gameInfo.maxPlayers || undefined,
          durationMinutes: data.gameInfo.durationMinutes || undefined,
          imageUrl: data.gameInfo.imageUrl || '',
          thumbnailUrl: data.gameInfo.thumbnailUrl || '',
          fullDescription: data.gameInfo.fullDescription || '',
          rulesText: data.rulesContent || ''
        });
        
        // Hide scraper form and show add game form
        setShowScraperForm(false);
        setShowAddGameForm(true);
        
        showToast(`Successfully scraped "${data.gameInfo.nameEn}"!`, 'success');
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
      // Just return silently if no name provided
      return;
    }

    if (duplicateCheck.isDuplicate) {
      // Just return silently if duplicate detected
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
        const newGame = await response.json();
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
          fullDescription: '',
          rulesText: ''
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
        const error = await response.json();
        
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
      rulesText: ''
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
      
      // Regular text
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
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
                          {gc.category.nameEn}
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
                          {gm.mechanic.nameEn}
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
                <p className="text-gray-700 whitespace-pre-line">
                  {getGameDescription(selectedGame)}
                </p>
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
        <div className={`fixed top-4 right-4 z-50 max-w-md rounded-lg shadow-lg p-4 transition-all duration-300 transform ${
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🕷️ UltraBoardGames Scraper</h3>
                <p className="text-sm text-gray-600">
                  Automatically extract game information from UltraBoardGames.com
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Info URL (Required) *
                  </label>
                  <input
                    type="url"
                    required
                    value={scraperUrls.gameUrl}
                    onChange={(e) => setScraperUrls(prev => ({ ...prev, gameUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://www.ultraboardgames.com/azul/index.php"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Main game page with title, year, players, designer, etc.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Rules URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={scraperUrls.rulesUrl}
                    onChange={(e) => setScraperUrls(prev => ({ ...prev, rulesUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://www.ultraboardgames.com/azul/game-rules.php"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Rules page to extract game rules content
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <strong>Example URLs:</strong><br />
                    Game: https://www.ultraboardgames.com/azul/index.php<br />
                    Rules: https://www.ultraboardgames.com/azul/game-rules.php
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
                      min="1800"
                      max="2030"
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
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Description
                  </label>
                  <textarea
                    rows={4}
                    value={newGameForm.fullDescription}
                    onChange={(e) => setNewGameForm(prev => ({ ...prev, fullDescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                    placeholder="A detailed description of the game..."
                  />
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
                    disabled={addingGame}
                    className="flex items-center gap-2 px-6 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                  >
                    {addingGame ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding Game...
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
                                  min="1800"
                                  max="2030"
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
                              <div className="col-span-full">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Game Description
                                </label>
                                <textarea
                                  rows={4}
                                  placeholder="Game description..."
                                  value={editingGameData[game.id]?.fullDescription || ''}
                                  onChange={(e) => setEditingGameData(prev => ({
                                    ...prev,
                                    [game.id]: { ...prev[game.id], fullDescription: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17]"
                                />
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
