'use client';

import { useState, useEffect } from 'react';
import { Check, X, HelpCircle, RotateCcw, Lightbulb, Type, Image, RectangleHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBoardleStats } from '@/hooks/useBoardleStats';


// Game data type
type BoardleGame = {
  name: string;
  imageUrl: string;
  clues: string[];
  zoomType?: 'upper' | 'middle' | 'bottom';
};

type GameMode = 'title' | 'image' | 'card';

interface BoardleGameProps {}

export function BoardleGame({}: BoardleGameProps) {
  // 🎯 DAILY GAME ROTATION: Each mode gets a new game every day at midnight
  // - Title Mode: New game daily (persistent across refreshes)
  // - Image Mode: New game daily (different from Title Mode, persistent across refreshes)
  // - Card Mode: New game daily (different from Title and Image Modes, persistent across refreshes)
  // - Games change automatically - no need to refresh or click "Play Again"
  // - Daily games are stored in localStorage and persist through page refreshes
  const [gameMode, setGameMode] = useState<GameMode>('title');
  const [availableGames, setAvailableGames] = useState<BoardleGame[]>([]);
  const [targetGameData, setTargetGameData] = useState<BoardleGame | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  
  // Separate game data for each mode to prevent carryover
  const [titleGame, setTitleGame] = useState<BoardleGame | null>(null);
  const [imageGame, setImageGame] = useState<BoardleGame | null>(null);
  const [cardGame, setCardGame] = useState<BoardleGame | null>(null);
  const [gamesLoaded, setGamesLoaded] = useState({ title: false, image: false, card: false });
  
  // Flag to track if this is initial load (don't load saved state) or mode switch (load saved state)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Separate game state for each mode to preserve progress
  const [titleGameState, setTitleGameState] = useState({
    guesses: [] as string[],
    currentGuess: '',
    correctLetters: [] as string[],
    gameOver: false,
    gameWon: false,
    revealedClues: [] as string[],
    letterInputs: [] as string[],
    imageGuesses: [] as string[],
    currentImageGuess: '',
    cardGuesses: [] as string[],
    currentCardGuess: ''
  });
  
  const [imageGameState, setImageGameState] = useState({
    guesses: [] as string[],
    currentGuess: '',
    correctLetters: [] as string[],
    gameOver: false,
    gameWon: false,
    revealedClues: [] as string[],
    letterInputs: [] as string[],
    imageGuesses: [] as string[],
    currentImageGuess: '',
    cardGuesses: [] as string[],
    currentCardGuess: ''
  });
  
  const [cardGameState, setCardGameState] = useState({
    guesses: [] as string[],
    currentGuess: '',
    correctLetters: [] as string[],
    gameOver: false,
    gameWon: false,
    revealedClues: [] as string[],
    letterInputs: [] as string[],
    imageGuesses: [] as string[],
    currentImageGuess: '',
    cardGuesses: [] as string[],
    currentCardGuess: ''
  });
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [correctLetters, setCorrectLetters] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  
  // Image mode specific states
  const [imageGuesses, setImageGuesses] = useState<string[]>([]);
  const [currentImageGuess, setCurrentImageGuess] = useState('');
  
  // Card mode states
  const [cardGuesses, setCardGuesses] = useState<string[]>([]);
  const [currentCardGuess, setCurrentCardGuess] = useState('');
  
  // Individual letter inputs state
  const [letterInputs, setLetterInputs] = useState<string[]>([]);
  
  // Image loading state to prevent flash of full image
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Flip animation state for letter tiles
  const [flippingTiles, setFlippingTiles] = useState<number[]>([]);
  const [flippedTiles, setFlippedTiles] = useState<Set<string>>(new Set());
  
  // Validation message state
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  
  // User authentication and statistics
  const { user, isAuthenticated } = useAuth();
  const { stats, updateStats, isLoading: statsLoading, error: statsError } = useBoardleStats();

  // 🎯 DAILY ROTATION SYSTEM: APIs now handle daily rotation directly
  // Each mode gets one game per day, rotating sequentially through the list
  // Once all games are used, the cycle restarts from the beginning

  // 🎯 DAILY ROTATION SYSTEM: APIs now handle daily rotation directly
  // No need for local storage or manual cleanup - each API call returns the daily game

  // Function to trigger flip animation for letter tiles
  const triggerFlipAnimation = () => {
    if (!targetGameData) return;
    
    // Get indices of regular letter inputs (not spaces or special chars)
    const regularLetterIndices: number[] = [];
    for (let i = 0; i < targetGameData.name.length; i++) {
      const targetChar = targetGameData.name[i];
      if (targetChar !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
        regularLetterIndices.push(i);
      }
    }
    
    // Start flip animation
    setFlippingTiles(regularLetterIndices);
    
    // Clear flip state after animation completes
    setTimeout(() => {
      setFlippingTiles([]);
    }, 600); // Match the CSS animation duration
  };

  // Initialize game - only run once on mount
  useEffect(() => {
    // Clear localStorage for all modes on initial load to ensure fresh start
    const today = new Date().toDateString();
    localStorage.removeItem(`boardle-title-state-${today}`);
    localStorage.removeItem(`boardle-image-state-${today}`);
    localStorage.removeItem(`boardle-card-state-${today}`);
    console.log('Cleared localStorage for all modes on initial load');
    
    loadAllGames(); // Load all games at once
  }, []);

  const loadAllGames = async () => {
    setIsLoadingGames(true);
    try {
      // Load all three modes in parallel
      const [titleResponse, imageResponse, cardResponse] = await Promise.all([
        fetch('/api/boardle/games'),
        fetch('/api/boardle/image-games'),
        fetch('/api/boardle/card-games')
      ]);

      const [titleData, imageData, cardData] = await Promise.all([
        titleResponse.json(),
        imageResponse.json(),
        cardResponse.json()
      ]);

      // Set each mode's game
      if (titleData.games && titleData.games.length > 0) {
        setTitleGame(titleData.games[0]);
        setGamesLoaded(prev => ({ ...prev, title: true }));
      }
      
      if (imageData.games && imageData.games.length > 0) {
        setImageGame(imageData.games[0]);
        setGamesLoaded(prev => ({ ...prev, image: true }));
      }
      
      if (cardData.games && cardData.games.length > 0) {
        setCardGame(cardData.games[0]);
        setGamesLoaded(prev => ({ ...prev, card: true }));
      }

      // Reset all game states on initial load
      resetAllModeStates();
      
      // Set the initial game for title mode
      if (titleData.games && titleData.games.length > 0) {
        setTargetGameData(titleData.games[0]);
        setAvailableGames([titleData.games[0]]);
        initializeGameForMode('title', titleData.games[0]);
      }
      
      // Image and Card mode states are already reset by resetAllModeStates()
      
      // Mark initial load as complete
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setIsLoadingGames(false);
    }
  };

  // Save game state whenever it changes
  useEffect(() => {
    // Only save if we have a valid game mode, not during initial load, and not loading games
    // Also ensure we have some actual game state to save (not just empty arrays)
    const hasGameState = guesses.length > 0 || 
                        letterInputs.some(input => input !== '') || 
                        imageGuesses.length > 0 || 
                        cardGuesses.length > 0 ||
                        revealedClues.length > 0;
    
    if (gameMode && (titleGame || imageGame || cardGame) && !isInitialLoad && !isLoadingGames && hasGameState) {
      console.log('Saving game state due to state change');
      saveGameState(gameMode);
    }
  }, [guesses, currentGuess, correctLetters, gameOver, gameWon, revealedClues, letterInputs, imageGuesses, currentImageGuess, cardGuesses, currentCardGuess, gameMode, isInitialLoad, isLoadingGames]);

  // Mode switching is now handled by switchGameMode function

  // Check for date changes and refresh games if needed
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date();
      const todayString = today.toDateString();
      const lastCheck = localStorage.getItem('boardle-last-date-check');
      
      // Check if date has changed (new day)
      if (lastCheck !== todayString) {
        // Date changed, refresh all games for new daily challenge
        localStorage.setItem('boardle-last-date-check', todayString);
        loadAllGames();
      }
    };

    // Check on mount and set up interval
    checkDateChange();
    const interval = setInterval(checkDateChange, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [gameMode]);

  // Add CSS keyframes for flip animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes tileFlip {
        0% {
          transform: rotateY(180deg);
        }
        100% {
          transform: rotateY(0deg);
        }
      }
      .tile-flip {
        animation: tileFlip 0.5s ease-in-out forwards;
      }
      .tile-flip-delay-1 { animation-delay: 0.1s; }
      .tile-flip-delay-2 { animation-delay: 0.2s; }
      .tile-flip-delay-3 { animation-delay: 0.3s; }
      .tile-flip-delay-4 { animation-delay: 0.4s; }
      .tile-flip-delay-5 { animation-delay: 0.5s; }
      .tile-flip-delay-6 { animation-delay: 0.6s; }
      .tile-flip-delay-7 { animation-delay: 0.7s; }
      .tile-flip-delay-8 { animation-delay: 0.8s; }
      .tile-flip-delay-9 { animation-delay: 0.9s; }
      .tile-flip-delay-10 { animation-delay: 1.0s; }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Block common shortcuts and right-click when in Image Mode to prevent image access
  useEffect(() => {
    if (gameMode !== 'image') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts that could reveal images
      if (
        (e.ctrlKey || e.metaKey) && (
          e.key === 's' || // Save
          e.key === 'o' || // Open
          e.key === 'u' || // View source
          e.key === 'i' || // Inspect
          e.key === 'j' || // Console
          (e.shiftKey && e.key === 'I') // Developer tools
        ) ||
        e.key === 'F12' || // Developer tools
        e.key === 'F5' || // Refresh
        (e.ctrlKey && e.key === 'r') || // Refresh
        (e.ctrlKey && e.shiftKey && e.key === 'R') // Hard refresh
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, [gameMode]);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/boardle/games');
      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        setTargetGameData(data.games[0]);
        setAvailableGames([data.games[0]]); // Only set the daily game
        
        // Reset game state for new game
        resetGame();
        
        // Initialize letter inputs array for the new game
        const nameLength = data.games[0].name.length;
        setLetterInputs(new Array(nameLength).fill(''));
        
        // Set initial clue if available
        if (data.games[0].clues && data.games[0].clues.length > 0) {
          setRevealedClues([data.games[0].clues[0]]);
        }
      }
    } catch (error) {
      console.error('Error fetching Title Mode games:', error);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchGamesForMode = async (mode: string) => {
    try {
      let endpoint = '';
      switch (mode) {
        case 'image':
          endpoint = '/api/boardle/image-games';
          break;
        case 'card':
          endpoint = '/api/boardle/card-games';
          break;
        default:
          return;
      }
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        setTargetGameData(data.games[0]);
        setAvailableGames([data.games[0]]); // Only set the daily game
        
        // Initialize letter inputs array for the new game
        const nameLength = data.games[0].name.length;
        setLetterInputs(new Array(nameLength).fill(''));
        
        // Set initial clue if available
        if (data.games[0].clues && data.games[0].clues.length > 0) {
          setRevealedClues([data.games[0].clues[0]]);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${mode} mode games:`, error);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const startNewGame = () => {
    if (availableGames.length === 0) {
      console.error('No games available to start new game');
      return;
    }
    
    const randomGameData = availableGames[Math.floor(Math.random() * availableGames.length)];
    setTargetGameData(randomGameData);
    
    // Reset all game state
    resetGame();
    
    // Set initial clue if available
    if (randomGameData.clues && randomGameData.clues.length > 0) {
      setRevealedClues([randomGameData.clues[0]]);
    }
    
    // Initialize letter inputs array for the new game
    const nameLength = randomGameData.name.length;
    setLetterInputs(new Array(nameLength).fill(''));
    
    // Auto-focus first available input after a short delay
    setTimeout(() => {
      for (let i = 0; i < nameLength; i++) {
        const char = randomGameData.name[i];
        if (char !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(char)) {
          const firstInput = document.getElementById(`letter-input-${i}`) as HTMLInputElement;
          if (firstInput) {
            firstInput.focus();
          }
          break;
        }
      }
    }, 100);
  };



  // Function to reset all game state
  const resetGame = () => {
    // Reset only the current mode's state
    const resetState = {
      guesses: [] as string[],
      currentGuess: '',
      correctLetters: [] as string[],
      gameOver: false,
      gameWon: false,
      revealedClues: [] as string[],
      letterInputs: [] as string[],
      imageGuesses: [] as string[],
      currentImageGuess: '',
      cardGuesses: [] as string[],
      currentCardGuess: ''
    };

    // Apply reset to current state
    setGuesses(resetState.guesses);
    setCurrentGuess(resetState.currentGuess);
    setCorrectLetters(resetState.correctLetters);
    setGameOver(resetState.gameOver);
    setGameWon(resetState.gameWon);
    setRevealedClues(resetState.revealedClues);
    setLetterInputs(resetState.letterInputs);
    setImageGuesses(resetState.imageGuesses);
    setCurrentImageGuess(resetState.currentImageGuess);
    setCardGuesses(resetState.cardGuesses);
    setCurrentCardGuess(resetState.currentCardGuess);
    setFlippedTiles(new Set());
    setFlippingTiles([]);
    setImageLoaded(false);

    // Save the reset state for current mode
    saveGameState(gameMode);
  };

  // Function to reset all mode states (used on initial load)
  const resetAllModeStates = () => {
    console.log('Resetting all mode states on initial load');
    console.log('Before reset - imageGuesses:', imageGuesses, 'cardGuesses:', cardGuesses);
    
    // Reset all current state variables
    setGuesses([]);
    setCurrentGuess('');
    setCorrectLetters([]);
    setGameOver(false);
    setGameWon(false);
    setRevealedClues([]);
    setLetterInputs([]);
    setImageGuesses([]);
    setCurrentImageGuess('');
    setCardGuesses([]);
    setCurrentCardGuess('');
    setFlippedTiles(new Set());
    setFlippingTiles([]);
    setImageLoaded(false);
    
    // Reset all mode-specific states
    setTitleGameState({
      guesses: [] as string[],
      currentGuess: '',
      correctLetters: [] as string[],
      gameOver: false,
      gameWon: false,
      revealedClues: [] as string[],
      letterInputs: [] as string[],
      imageGuesses: [] as string[],
      currentImageGuess: '',
      cardGuesses: [] as string[],
      currentCardGuess: ''
    });
    
    setImageGameState({
      guesses: [] as string[],
      currentGuess: '',
      correctLetters: [] as string[],
      gameOver: false,
      gameWon: false,
      revealedClues: [] as string[],
      letterInputs: [] as string[],
      imageGuesses: [] as string[],
      currentImageGuess: '',
      cardGuesses: [] as string[],
      currentCardGuess: ''
    });
    
    setCardGameState({
      guesses: [] as string[],
      currentGuess: '',
      correctLetters: [] as string[],
      gameOver: false,
      gameWon: false,
      revealedClues: [] as string[],
      letterInputs: [] as string[],
      imageGuesses: [] as string[],
      currentImageGuess: '',
      cardGuesses: [] as string[],
      currentCardGuess: ''
    });
    
    console.log('After reset - imageGuesses should be empty, cardGuesses should be empty');
  };

  const initializeGameForMode = (mode: GameMode, game: BoardleGame) => {
    // Initialize letter inputs array for the new game
    const nameLength = game.name.length;
    setLetterInputs(new Array(nameLength).fill(''));
    
    // Set initial clue if available
    if (game.clues && game.clues.length > 0) {
      setRevealedClues([game.clues[0]]);
    }
  };

  const saveGameState = (mode: GameMode) => {
    const currentState = {
      guesses,
      currentGuess,
      correctLetters,
      gameOver,
      gameWon,
      revealedClues,
      letterInputs: [...letterInputs], // Create a copy to ensure it's saved properly
      imageGuesses,
      currentImageGuess,
      cardGuesses,
      currentCardGuess
    };

    console.log(`Saving ${mode} state:`, { 
      letterInputs: currentState.letterInputs,
      guesses: currentState.guesses,
      gameOver: currentState.gameOver,
      gameWon: currentState.gameWon
    });

    // Save to React state
    switch (mode) {
      case 'title':
        setTitleGameState(currentState);
        break;
      case 'image':
        setImageGameState(currentState);
        break;
      case 'card':
        setCardGameState(currentState);
        break;
    }

    // Also save to localStorage for persistence
    const today = new Date().toDateString();
    localStorage.setItem(`boardle-${mode}-state-${today}`, JSON.stringify(currentState));
  };

  const loadGameState = (mode: GameMode, forceLoad: boolean = false) => {
    // Only load saved state if explicitly requested (not on initial load)
    if (!forceLoad && isInitialLoad) {
      console.log(`Skipping loadGameState for ${mode} - still in initial load`);
      return;
    }
    
    // First try to load from localStorage
    const today = new Date().toDateString();
    const savedState = localStorage.getItem(`boardle-${mode}-state-${today}`);
    
    let stateToLoad;
    
    if (savedState) {
      // Load from localStorage
      try {
        stateToLoad = JSON.parse(savedState);
        console.log(`Loading ${mode} state from localStorage:`, { letterInputs: stateToLoad.letterInputs });
      } catch (error) {
        console.error('Error parsing saved state:', error);
        // Fallback to React state
        switch (mode) {
          case 'title':
            stateToLoad = titleGameState;
            break;
          case 'image':
            stateToLoad = imageGameState;
            break;
          case 'card':
            stateToLoad = cardGameState;
            break;
          default:
            return;
        }
      }
    } else {
      // Fallback to React state
      switch (mode) {
        case 'title':
          stateToLoad = titleGameState;
          break;
        case 'image':
          stateToLoad = imageGameState;
          break;
        case 'card':
          stateToLoad = cardGameState;
          break;
        default:
          return;
      }
    }

    // Load the saved state
    console.log(`Loading ${mode} state:`, { 
      letterInputs: stateToLoad.letterInputs,
      guesses: stateToLoad.guesses,
      gameOver: stateToLoad.gameOver,
      gameWon: stateToLoad.gameWon
    });
    
    setGuesses(stateToLoad.guesses);
    setCurrentGuess(stateToLoad.currentGuess);
    setCorrectLetters(stateToLoad.correctLetters);
    setGameOver(stateToLoad.gameOver);
    setGameWon(stateToLoad.gameWon);
    setRevealedClues(stateToLoad.revealedClues);
    setLetterInputs([...stateToLoad.letterInputs]); // Create a copy to ensure it's loaded properly
    setImageGuesses(stateToLoad.imageGuesses);
    setCurrentImageGuess(stateToLoad.currentImageGuess);
    setCardGuesses(stateToLoad.cardGuesses);
    setCurrentCardGuess(stateToLoad.currentCardGuess);
    
    console.log(`State loaded for ${mode}, letterInputs should be:`, stateToLoad.letterInputs);
  };

  const switchGameMode = (mode: GameMode) => {
    // Save current game state before switching
    saveGameState(gameMode);
    
    setGameMode(mode);
    setIsInitialLoad(false); // Mark that we're no longer in initial load
    
    // Get the pre-loaded game for this mode
    let gameToLoad: BoardleGame | null = null;
    
    switch (mode) {
      case 'title':
        gameToLoad = titleGame;
        break;
      case 'image':
        gameToLoad = imageGame;
        break;
      case 'card':
        gameToLoad = cardGame;
        break;
    }
    
    if (gameToLoad) {
      setTargetGameData(gameToLoad);
      setAvailableGames([gameToLoad]);
      
      // Check if there's saved state for this mode first
      let hasSavedState = false;
      
      // First check localStorage for saved state
      const today = new Date().toDateString();
      const savedState = localStorage.getItem(`boardle-${mode}-state-${today}`);
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          hasSavedState = parsedState.guesses.length > 0 || 
                         parsedState.letterInputs.some((input: string) => input !== '') ||
                         parsedState.imageGuesses.length > 0 ||
                         parsedState.cardGuesses.length > 0 ||
                         parsedState.revealedClues.length > 0;
        } catch (error) {
          console.error('Error parsing saved state:', error);
          hasSavedState = false;
        }
      }
      
      // Fallback to React state check
      if (!hasSavedState) {
        switch (mode) {
          case 'title':
            hasSavedState = titleGameState.guesses.length > 0 || titleGameState.revealedClues.length > 0 || titleGameState.letterInputs.some(input => input !== '');
            break;
          case 'image':
            hasSavedState = imageGameState.imageGuesses.length > 0 || imageGameState.revealedClues.length > 0;
            break;
          case 'card':
            hasSavedState = cardGameState.cardGuesses.length > 0 || cardGameState.revealedClues.length > 0;
            break;
        }
      }
      
      if (hasSavedState && !isInitialLoad) {
        // Load the saved state for this mode (only when switching modes, not on initial load)
        console.log(`Loading saved state for ${mode} mode switch`);
        loadGameState(mode, true); // Force load when switching modes
      } else {
        // Initialize fresh if no saved state or if this is initial load
        console.log(`Initializing fresh game for ${mode} mode - hasSavedState: ${hasSavedState}, isInitialLoad: ${isInitialLoad}`);
        initializeGameForMode(mode, gameToLoad);
      }
    } else {
      // Fallback: load the game if not pre-loaded
      setIsLoadingGames(true);
      if (mode === 'title') {
        fetchGames();
      } else {
        fetchGamesForMode(mode);
      }
    }
  };

  // Temporary function to shuffle to a different random game for testing zoom
  const shuffleImageGame = async () => {
    if (gameMode !== 'image') return;
    
    setIsLoadingGames(true);
    try {
      // Force a new random game by adding a random offset to the current time
      const randomOffset = Math.floor(Math.random() * 10000);
      const response = await fetch(`/api/boardle/image-games?shuffle=${randomOffset}`);
      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        setTargetGameData(data.games[0]);
        setAvailableGames([data.games[0]]);
        
        // Reset game state for new game
        resetGame();
        
        // Set initial clue if available
        if (data.games[0].clues && data.games[0].clues.length > 0) {
          setRevealedClues([data.games[0].clues[0]]);
        }
        
        // Initialize letter inputs array for the new game
        const nameLength = data.games[0].name.length;
        setLetterInputs(new Array(nameLength).fill(''));
      }
    } catch (error) {
      console.error('Error shuffling Image Mode game:', error);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const startNewGameWithoutFocus = () => {
    if (availableGames.length === 0) {
      console.error('No games available to start new game');
      return;
    }
    
    const randomGameData = availableGames[Math.floor(Math.random() * availableGames.length)];
    setTargetGameData(randomGameData);
    
    // Reset all game state
    resetGame();
    
    // Set initial clue if available
     if (randomGameData.clues && randomGameData.clues.length > 0) {
       setRevealedClues([randomGameData.clues[0]]);
     }
    
    // Initialize letter inputs array for the new game
    const nameLength = randomGameData.name.length;
    setLetterInputs(new Array(nameLength).fill(''));
  };

  const handleImageGuess = () => {
    if (!currentImageGuess.trim() || !targetGameData || gameOver) return;

    const upperGuess = currentImageGuess.toUpperCase();
    const newImageGuesses = [...imageGuesses, upperGuess];
    setImageGuesses(newImageGuesses);
    setCurrentImageGuess('');

    // Extract correct letters from this guess (with normalization) - same as Word Mode
    const guessLetters = upperGuess.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const targetLetters = targetGameData.name.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const newCorrectLetters = [...correctLetters];
    
    guessLetters.forEach(guessLetter => {
      const normalizedGuessLetter = normalizeText(guessLetter);
      targetLetters.forEach(targetLetter => {
        const normalizedTargetLetter = normalizeText(targetLetter);
        if (normalizedGuessLetter === normalizedTargetLetter && !newCorrectLetters.includes(targetLetter)) {
          newCorrectLetters.push(targetLetter);
        }
      });
    });
    
    setCorrectLetters(newCorrectLetters);

    // Add a new clue if available (same as Word Mode)
    if (targetGameData.clues && revealedClues.length < targetGameData.clues.length) {
      setRevealedClues([...revealedClues, targetGameData.clues[revealedClues.length]]);
    }

    // Check if won (with normalization)
    if (normalizeText(upperGuess) === normalizeText(targetGameData.name)) {
      setGameWon(true);
      setGameOver(true);
      updateStats('image', true, newImageGuesses.length);
    } else if (newImageGuesses.length >= 6) {
      setGameOver(true);
      updateStats('image', false, 0);
    }
  };

  const handleCardGuess = () => {
    if (!currentCardGuess.trim() || !targetGameData || gameOver) return;

    const upperGuess = currentCardGuess.toUpperCase();
    const newCardGuesses = [...cardGuesses, upperGuess];
    setCardGuesses(newCardGuesses);
    setCurrentCardGuess('');

    // Extract correct letters from this guess (with normalization) - same as Word/Image Mode
    const guessLetters = upperGuess.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const targetLetters = targetGameData.name.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const newCorrectLetters = [...correctLetters];
    
    guessLetters.forEach(guessLetter => {
      const normalizedGuessLetter = normalizeText(guessLetter);
      targetLetters.forEach(targetLetter => {
        const normalizedTargetLetter = normalizeText(targetLetter);
        if (normalizedGuessLetter === normalizedTargetLetter && !newCorrectLetters.includes(targetLetter)) {
          newCorrectLetters.push(targetLetter);
        }
      });
    });
    
    setCorrectLetters(newCorrectLetters);

    // Add a new clue if available (same as Word/Image Mode)
    if (targetGameData.clues && revealedClues.length < targetGameData.clues.length) {
      setRevealedClues([...revealedClues, targetGameData.clues[revealedClues.length]]);
    }

    // Check if won (with normalization)
    if (normalizeText(upperGuess) === normalizeText(targetGameData.name)) {
      setGameWon(true);
      setGameOver(true);
      updateStats('card', true, newCardGuesses.length);
    } else if (newCardGuesses.length >= 6) {
      setGameOver(true);
      updateStats('card', false, 0);
    }
  };

  const handleGuess = () => {
    if (!currentGuess || !targetGameData) return;
    
    const upperGuess = currentGuess.toUpperCase();
    const newGuesses = [...guesses, upperGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    // Extract correct letters from this guess (with normalization)
    const guessLetters = upperGuess.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const targetLetters = targetGameData.name.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const newCorrectLetters = [...correctLetters];
    
    guessLetters.forEach(guessLetter => {
      const normalizedGuessLetter = normalizeText(guessLetter);
      targetLetters.forEach(targetLetter => {
        const normalizedTargetLetter = normalizeText(targetLetter);
        if (normalizedGuessLetter === normalizedTargetLetter && !newCorrectLetters.includes(targetLetter)) {
          newCorrectLetters.push(targetLetter);
        }
      });
    });
    
    setCorrectLetters(newCorrectLetters);

    // Add a new clue if available
    if (targetGameData.clues && revealedClues.length < targetGameData.clues.length) {
      setRevealedClues([...revealedClues, targetGameData.clues[revealedClues.length]]);
    }

    // Check if won (with normalization)
    if (normalizeText(upperGuess) === normalizeText(targetGameData.name)) {
      setGameWon(true);
      setGameOver(true);
      updateStats('title', true, newGuesses.length);
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      updateStats('title', false, 0);
    }
  };



  // Function to render the game name with revealed letters
  // Function to render the revealed letters for Title Mode (alphabetically ordered with colors)
  const renderRevealedLetters = () => {
    if (!targetGameData || !guesses.length) return null;

    // Collect all letters that have been guessed with their status
    const letterStatusMap = new Map<string, 'correct' | 'present'>();
    
    guesses.forEach(guess => {
      const upperGuess = guess.toUpperCase();
      const letters = upperGuess.padEnd(targetGameData.name.length, ' ').split('').slice(0, targetGameData.name.length);
      
      letters.forEach((letter, letterIndex) => {
        if (/[A-Z0-9]/.test(letter)) {
          const status = getLetterStatus(letter, letterIndex, upperGuess);
          if (status === 'correct') {
            letterStatusMap.set(letter, 'correct'); // Correct position takes priority
          } else if (status === 'present' && !letterStatusMap.has(letter)) {
            letterStatusMap.set(letter, 'present'); // Only set if not already correct
          }
        }
      });
    });

    // Convert to array and sort alphabetically
    const revealedLetters = Array.from(letterStatusMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    if (revealedLetters.length === 0) {
      return (
        <div className="text-center text-gray-500 italic">
          No letters revealed yet
        </div>
      );
    }

    return revealedLetters.map(([letter, status]) => (
      <div
        key={letter}
        className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded ${
          status === 'correct' 
            ? 'bg-green-500 text-white border-green-500' 
            : 'bg-yellow-500 text-white border-yellow-500'
        }`}
      >
        {letter}
      </div>
    ));
  };

  // Function to render the revealed letters for Image Mode
  const renderImageRevealedLetters = () => {
    if (!targetGameData || !imageGuesses.length) return null;

    // Collect all letters that have been guessed with their status
    const letterStatusMap = new Map<string, 'correct' | 'present'>();
    
    imageGuesses.forEach(guess => {
      const upperGuess = guess.toUpperCase();
      const letters = upperGuess.padEnd(targetGameData.name.length, ' ').split('').slice(0, targetGameData.name.length);
      
      letters.forEach((letter, letterIndex) => {
        if (/[A-Z0-9]/.test(letter)) {
          const status = getLetterStatus(letter, letterIndex, upperGuess);
          if (status === 'correct') {
            letterStatusMap.set(letter, 'correct'); // Correct position takes priority
          } else if (status === 'present' && !letterStatusMap.has(letter)) {
            letterStatusMap.set(letter, 'present'); // Only set if not already correct
          }
        }
      });
    });

    // Convert to array and sort alphabetically
    const revealedLetters = Array.from(letterStatusMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    if (revealedLetters.length === 0) {
      return (
        <div className="text-center text-gray-500 italic">
          No letters revealed yet
        </div>
      );
    }

    return revealedLetters.map(([letter, status]) => (
      <div
        key={letter}
        className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded ${
          status === 'correct' 
            ? 'bg-green-500 text-white border-green-500' 
            : 'bg-yellow-500 text-white border-yellow-500'
        }`}
      >
        {letter}
      </div>
    ));
  };

  // Function to render the revealed letters for Card Mode
  const renderCardRevealedLetters = () => {
    if (!targetGameData || !cardGuesses.length) return null;

    // Collect all letters that have been guessed with their status
    const letterStatusMap = new Map<string, 'correct' | 'present'>();
    
    cardGuesses.forEach(guess => {
      const upperGuess = guess.toUpperCase();
      const letters = upperGuess.padEnd(targetGameData.name.length, ' ').split('').slice(0, targetGameData.name.length);
      
      letters.forEach((letter, letterIndex) => {
        if (/[A-Z0-9]/.test(letter)) {
          const status = getLetterStatus(letter, letterIndex, guess);
          if (status === 'correct') {
            letterStatusMap.set(letter, 'correct'); // Correct position takes priority
          } else if (status === 'present' && !letterStatusMap.has(letter)) {
            letterStatusMap.set(letter, 'present'); // Only set if not already correct
          }
        }
      });
    });

    // Convert to array and sort alphabetically
    const revealedLetters = Array.from(letterStatusMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    if (revealedLetters.length === 0) {
      return (
        <div className="text-center text-gray-500 italic">
          No letters revealed yet
        </div>
      );
    }

    return revealedLetters.map(([letter, status]) => (
      <div
        key={letter}
        className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded ${
          status === 'correct' 
            ? 'bg-green-500 text-white border-green-500' 
            : 'bg-yellow-500 text-white border-yellow-500'
        }`}
      >
        {letter}
      </div>
    ));
  };

  // Function to normalize letters (remove accents, tildes, etc.)
  const normalizeText = (text: string) => {
    return text
      .normalize('NFD') // Decompose characters with accents
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .toUpperCase();
  };

  // Function to calculate image zoom level based on guesses in Image Mode
  const getImageZoomLevel = () => {
    if (gameMode !== 'image') return 100; // Full zoom for other modes
    
    // If game is won, show full image (no zoom)
    if (gameWon) return 100;
    
    const guessCount = imageGuesses.length;
    const maxGuesses = 6;
    
    // Start at 400% zoom (very zoomed in), end at 100% (full image)
    // Each guess reduces zoom by 50%
    const startZoom = 400;
    const endZoom = 100;
    const zoomReduction = (startZoom - endZoom) / maxGuesses;
    
    const currentZoom = startZoom - (guessCount * zoomReduction);
    return Math.max(currentZoom, endZoom);
  };

  // Function to get image transform based on zoom level
  const getImageTransform = () => {
    const zoom = getImageZoomLevel();
    if (zoom === 100) return {}; // No transform for full image
    
    // Determine zoom focus point based on game's zoomType
    let transformOrigin = 'center center'; // Default middle zoom
    
    if (targetGameData?.zoomType === 'upper') {
      transformOrigin = 'center 35%'; // Zoom focuses above center (Y: 350px in 1000px space)
    } else if (targetGameData?.zoomType === 'bottom') {
      transformOrigin = 'center 65%'; // Zoom focuses below center (Y: 650px in 1000px space)
    }
    // 'middle' uses default 'center center' (Y: 500px in 1000px space)
    
    return {
      transform: `scale(${zoom / 100})`,
      transformOrigin,
      // Only add transition if image is already loaded to prevent flash
      transition: imageLoaded ? 'transform 0.5s ease-in-out' : 'none'
    };
  };

  // Function to handle individual letter input changes
  const handleLetterInputChange = (index: number, value: string) => {
    if (!targetGameData) return;
    
    const targetChar = targetGameData.name[index];
    
    // Skip spaces and special characters - they're auto-filled
    if (targetChar === ' ' || ['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
      return;
    }
    
    // Only allow letters and numbers, filter out special characters
    const filteredValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    
    const newInputs = [...letterInputs];
    newInputs[index] = filteredValue;
    setLetterInputs(newInputs);
    
    // Auto-focus next available input whenever a letter is typed (even if replacing)
    if (filteredValue) {
      // Find next input that's not a space or special character
      for (let i = index + 1; i < targetGameData.name.length; i++) {
        const nextChar = targetGameData.name[i];
        if (nextChar !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(nextChar)) {
          // Use setTimeout to ensure the state update completes first
          setTimeout(() => {
            const nextInput = document.getElementById(`letter-input-${i}`) as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
              nextInput.select(); // Select any existing text for easy replacement
            }
          }, 0);
          break;
        }
      }
    }
  };

  // Function to handle backspace navigation and other keys
  const handleLetterInputKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (!targetGameData) return;
    
    if (e.key === 'Backspace' && !letterInputs[index]) {
      // Find previous input that's not a space or special character
      for (let i = index - 1; i >= 0; i--) {
        const prevChar = targetGameData.name[i];
        if (prevChar !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(prevChar)) {
          setTimeout(() => {
            const prevInput = document.getElementById(`letter-input-${i}`) as HTMLInputElement;
            if (prevInput) {
              prevInput.focus();
              prevInput.select();
            }
          }, 0);
          break;
        }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      // Move to next available input
      for (let i = index + 1; i < targetGameData.name.length; i++) {
        const nextChar = targetGameData.name[i];
        if (nextChar !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(nextChar)) {
          const nextInput = document.getElementById(`letter-input-${i}`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
          break;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      // Move to previous available input
      for (let i = index - 1; i >= 0; i--) {
        const prevChar = targetGameData.name[i];
        if (prevChar !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(prevChar)) {
          const prevInput = document.getElementById(`letter-input-${i}`) as HTMLInputElement;
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
          }
          break;
        }
      }
    } else if (e.key === 'Enter') {
      handleLetterGuess();
    }
  };

  // Function to submit guess from letter inputs
  const handleLetterGuess = () => {
    if (!targetGameData || gameOver) return;
    
    // Check if all required tiles are filled
    if (!areAllTilesFilled()) {
      showValidationPopup();
      return;
    }
    
    // Build guess from letter inputs, preserving spaces and special characters
    let guess = '';
    for (let i = 0; i < targetGameData.name.length; i++) {
      const targetChar = targetGameData.name[i];
      if (targetChar === ' ' || ['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
        guess += targetChar;
      } else {
        guess += letterInputs[i] || ' ';
      }
    }
    
    // Don't submit empty guesses (this check is now redundant but kept for safety)
    if (!guess.trim() || guess.replace(/[\s\-:&'.,!?,]/g, '').length === 0) {
      return;
    }
    
    // Trigger flip animation for the current row tiles
    const currentRowIndex = gameMode === 'title' ? guesses.length : 
                           gameMode === 'image' ? imageGuesses.length : 
                           cardGuesses.length;
    
    // Trigger flip animation for each tile in the current row with staggered delay
    for (let j = 0; j < targetGameData.name.length; j++) {
      const tileKey = getTileKey(currentRowIndex, j);
      setTimeout(() => {
        triggerTileFlip(tileKey);
      }, j * 100); // 100ms delay per column for staggered effect
    }
    
    // Clear letter inputs
    console.log('handleGuess: Clearing letter inputs after processing guess');
    setLetterInputs(new Array(targetGameData.name.length).fill(''));
    
    // Process guess directly based on game mode
     if (gameMode === 'title') {
      processWordGuess(guess);
    } else if (gameMode === 'image') {
      processImageGuess(guess);
    } else if (gameMode === 'card') {
      processCardGuess(guess);
    }
    
    // Auto-focus first input for next guess (if game not over)
    setTimeout(() => {
      if (!gameOver) {
        for (let i = 0; i < targetGameData.name.length; i++) {
          const char = targetGameData.name[i];
          if (char !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(char)) {
            const firstInput = document.getElementById(`letter-input-${i}`) as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
            break;
          }
        }
      }
    }, 100);
  };

  // Process word mode guess
  const processWordGuess = (guess: string) => {
    if (!targetGameData) return;
    
    const upperGuess = guess.toUpperCase();
    const newGuesses = [...guesses, upperGuess];
    setGuesses(newGuesses);

    // Extract correct letters from this guess (with normalization)
    const guessLetters = upperGuess.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const targetLetters = targetGameData.name.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const newCorrectLetters = [...correctLetters];
    
    guessLetters.forEach(guessLetter => {
      const normalizedGuessLetter = normalizeText(guessLetter);
      targetLetters.forEach(targetLetter => {
        const normalizedTargetLetter = normalizeText(targetLetter);
        if (normalizedGuessLetter === normalizedTargetLetter && !newCorrectLetters.includes(targetLetter)) {
          newCorrectLetters.push(targetLetter);
        }
      });
    });
    
    setCorrectLetters(newCorrectLetters);

    // Add a new clue if available
    if (targetGameData.clues && revealedClues.length < targetGameData.clues.length) {
      setRevealedClues([...revealedClues, targetGameData.clues[revealedClues.length]]);
    }

    // Check if won (with normalization)
    if (normalizeText(upperGuess) === normalizeText(targetGameData.name)) {
      setGameWon(true);
      setGameOver(true);
      updateStats('title', true, newGuesses.length);
      // Don't reset flip state when game is won - keep tiles revealed with correct colors
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      updateStats('title', false, 0);
      // Reset flip state when game is lost
      setTimeout(() => setFlippedTiles(new Set()), 2000);
    }
  };

  // Process image mode guess
  const processImageGuess = (guess: string) => {
    if (!targetGameData) return;
    
    const upperGuess = guess.toUpperCase();
    const newImageGuesses = [...imageGuesses, upperGuess];
    setImageGuesses(newImageGuesses);

    // Extract correct letters from this guess (with normalization) - same as Word Mode
    const guessLetters = upperGuess.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const targetLetters = targetGameData.name.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const newCorrectLetters = [...correctLetters];
    
    guessLetters.forEach(guessLetter => {
      const normalizedGuessLetter = normalizeText(guessLetter);
      targetLetters.forEach(targetLetter => {
        const normalizedTargetLetter = normalizeText(targetLetter);
        if (normalizedGuessLetter === normalizedTargetLetter && !newCorrectLetters.includes(targetLetter)) {
          newCorrectLetters.push(targetLetter);
        }
      });
    });
    
    setCorrectLetters(newCorrectLetters);

    // Add a new clue if available (same as Word Mode)
    if (targetGameData.clues && revealedClues.length < targetGameData.clues.length) {
      setRevealedClues([...revealedClues, targetGameData.clues[revealedClues.length]]);
    }

    // Check if won (with normalization)
    if (normalizeText(upperGuess) === normalizeText(targetGameData.name)) {
      setGameWon(true);
      setGameOver(true);
      updateStats('image', true, newImageGuesses.length);
      // Don't reset flip state when game is won - keep tiles revealed with correct colors
    } else if (newImageGuesses.length >= 6) {
      setGameOver(true);
      updateStats('image', false, 0);
      // Reset flip state when game is lost
      setTimeout(() => setFlippedTiles(new Set()), 2000);
    }
  };

  // Process card mode guess
  const processCardGuess = (guess: string) => {
    if (!targetGameData) return;
    
    const upperGuess = guess.toUpperCase();
    const newCardGuesses = [...cardGuesses, upperGuess];
    setCardGuesses(newCardGuesses);

    // Extract correct letters from this guess (with normalization) - same as Word/Image Mode
    const guessLetters = upperGuess.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const targetLetters = targetGameData.name.replace(/[^A-ZÀ-ÿ0-9]/g, '').split('');
    const newCorrectLetters = [...correctLetters];
    
    guessLetters.forEach(guessLetter => {
      const normalizedGuessLetter = normalizeText(guessLetter);
      targetLetters.forEach(targetLetter => {
        const normalizedTargetLetter = normalizeText(targetLetter);
        if (normalizedGuessLetter === normalizedTargetLetter && !newCorrectLetters.includes(targetLetter)) {
          newCorrectLetters.push(targetLetter);
        }
      });
    });
    
    setCorrectLetters(newCorrectLetters);

    // Add a new clue if available (same as Word/Image Mode)
    if (targetGameData.clues && revealedClues.length < targetGameData.clues.length) {
      setRevealedClues([...revealedClues, targetGameData.clues[revealedClues.length]]);
    }

    // Check if won (with normalization)
    if (normalizeText(upperGuess) === normalizeText(targetGameData.name)) {
      setGameWon(true);
      setGameOver(true);
      updateStats('card', true, newCardGuesses.length);
      // Don't reset flip state when game is won - keep tiles revealed with correct colors
    } else if (newCardGuesses.length >= 6) {
      setGameOver(true);
      updateStats('card', false, 0);
      // Reset flip state when game lost
      setTimeout(() => setFlippedTiles(new Set()), 2000);
    }
  };

  // Function to get letter status in a guess (like Wordle)
  const getLetterStatus = (letter: string, position: number, guess: string) => {
    if (!targetGameData) return 'absent';
    
    const targetName = targetGameData.name;
    const normalizedLetter = normalizeText(letter);
    const normalizedTargetName = normalizeText(targetName);
    const normalizedTargetChar = normalizeText(targetName[position]);
    
    if (normalizedLetter === normalizedTargetChar) return 'correct';
    if (normalizedTargetName.includes(normalizedLetter)) return 'present';
    return 'absent';
  };

  // Function to render a guess row (like Wordle)
  const renderGuessRow = (guess: string, index: number) => {
    if (!targetGameData) return null;

    const maxLength = targetGameData.name.length;
    const letters = guess.padEnd(maxLength, ' ').split('').slice(0, maxLength);

    return (
      <div key={index} className="flex items-center gap-3 mb-2">
        {/* Guess number */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
          {index + 1}
        </div>
        {/* Guess row */}
        <div className="flex gap-1 justify-center flex-wrap flex-1">
          {letters.map((letter, letterIndex) => {
            const targetChar = targetGameData.name[letterIndex];
            let status = 'absent';
            let displayChar = letter;
            
            // Always show special characters and spaces in their correct positions
            if (targetChar === ' ') {
              // Space in target - always show as space
              displayChar = '';
              status = 'space';
            } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
              // Special character in target - always show the special character
              displayChar = targetChar;
              status = 'special';
            } else if (letter === ' ') {
              // Empty cell in guess
              displayChar = '';
              status = 'empty';
            } else {
              // Regular letter - check Wordle status
              status = getLetterStatus(letter, letterIndex, guess);
            }

            return (
              <div
                key={letterIndex}
                className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded ${
                  status === 'correct' ? 'bg-green-500 text-white border-green-500' :
                  status === 'present' ? 'bg-yellow-500 text-white border-yellow-500' :
                  status === 'space' ? 'bg-gray-300 border-gray-400' :
                  status === 'special' ? 'bg-blue-200 text-blue-800 border-blue-400' :
                  status === 'empty' ? 'bg-white border-gray-300' :
                  'bg-gray-200 text-gray-700 border-gray-400'
                }`}
              >
                {displayChar}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to render empty rows (Word Mode)
  const renderEmptyRows = () => {
    if (!targetGameData) return null;

    const remainingGuesses = 6 - guesses.length;
    const rows = [];

    for (let i = 0; i < remainingGuesses; i++) {
      rows.push(
        <div key={`empty-${i}`} className="flex items-center gap-3 mb-2">
          {/* Empty guess number */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-400 border-2 border-gray-300 shrink-0">
            {guesses.length + i + 1}
          </div>
          {/* Empty guess row */}
          <div className="flex gap-1 justify-center flex-wrap flex-1">
            {Array(targetGameData.name.length).fill('').map((_, j) => {
            const targetChar = targetGameData.name[j];
            
            return (
              <div 
                key={j} 
                className={`w-8 h-8 border-2 rounded flex items-center justify-center ${
                  targetChar === ' ' ? 'bg-gray-300 border-gray-400' :
                  ['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar) ? 'bg-blue-200 text-blue-800 border-blue-400 text-sm font-bold' :
                  'bg-white border-gray-300'
                }`}
              >
                {['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar) ? targetChar : ''}
              </div>
            );
          })}
          </div>
        </div>
      );
    }

    return rows;
  };

  // Function to render a guess row for Image Mode (similar to Word Mode)
  const renderImageGuessRow = (guess: string, index: number) => {
    if (!targetGameData) return null;

    const maxLength = targetGameData.name.length;
    const letters = guess.padEnd(maxLength, ' ').split('').slice(0, maxLength);

    return (
      <div key={index} className="flex items-center gap-3 mb-2">
        {/* Guess number */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
          {index + 1}
        </div>
        {/* Guess row */}
        <div className="flex gap-1 justify-center flex-wrap flex-1">
          {letters.map((letter, letterIndex) => {
            const targetChar = targetGameData.name[letterIndex];
            let status = 'absent';
            let displayChar = letter;
            
            // Always show special characters and spaces in their correct positions
            if (targetChar === ' ') {
              // Space in target - always show as space
              displayChar = '';
              status = 'space';
            } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
              // Special character in target - always show the special character
              displayChar = targetChar;
              status = 'special';
            } else if (letter === ' ') {
              // Empty cell in guess
              displayChar = '';
              status = 'empty';
            } else {
              // Regular letter - check Wordle status
              status = getLetterStatus(letter, letterIndex, guess);
            }

            return (
              <div
                key={letterIndex}
                className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded ${
                  status === 'correct' ? 'bg-green-500 text-white border-green-500' :
                  status === 'present' ? 'bg-yellow-500 text-white border-yellow-500' :
                  status === 'space' ? 'bg-gray-300 border-gray-400' :
                  status === 'special' ? 'bg-blue-200 text-blue-800 border-blue-400' :
                  status === 'empty' ? 'bg-white border-gray-300' :
                  'bg-gray-200 text-gray-700 border-gray-400'
                }`}
              >
                {displayChar}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to render empty rows for Image Mode
  const renderImageEmptyRows = () => {
    if (!targetGameData) return null;

    const remainingGuesses = 6 - imageGuesses.length;
    const rows = [];

    for (let i = 0; i < remainingGuesses; i++) {
      rows.push(
        <div key={`empty-${i}`} className="flex items-center gap-3 mb-2">
          {/* Empty guess number */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-400 border-2 border-gray-300 shrink-0">
            {imageGuesses.length + i + 1}
          </div>
          {/* Empty guess row */}
          <div className="flex gap-1 justify-center flex-wrap flex-1">
            {Array(targetGameData.name.length).fill('').map((_, j) => {
            const targetChar = targetGameData.name[j];
            
            return (
              <div 
                key={j} 
                className={`w-8 h-8 border-2 rounded flex items-center justify-center ${
                  targetChar === ' ' ? 'bg-gray-300 border-gray-400' :
                  ['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar) ? 'bg-blue-200 text-blue-800 border-blue-400 text-sm font-bold' :
                  'bg-white border-gray-300'
                }`}
              >
                {['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar) ? targetChar : ''}
              </div>
            );
          })}
          </div>
        </div>
      );
    }

    return rows;
  };

  // Function to render a guess row for Card Mode (similar to Word/Image Mode)
  const renderCardGuessRow = (guess: string, index: number) => {
    if (!targetGameData) return null;

    const maxLength = targetGameData.name.length;
    const letters = guess.padEnd(maxLength, ' ').split('').slice(0, maxLength);

    return (
      <div key={index} className="flex items-center gap-3 mb-2">
        {/* Guess number */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
          {index + 1}
        </div>
        {/* Guess row */}
        <div className="flex gap-1 justify-center flex-wrap flex-1">
          {letters.map((letter, letterIndex) => {
            const targetChar = targetGameData.name[letterIndex];
            let status = 'absent';
            let displayChar = letter;
            
            // Always show special characters and spaces in their correct positions
            if (targetChar === ' ') {
              // Space in target - always show as space
              displayChar = '';
              status = 'space';
            } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
              // Special character in target - always show the special character
              displayChar = targetChar;
              status = 'special';
            } else if (letter === ' ') {
              // Empty cell in guess
              displayChar = '';
              status = 'empty';
            } else {
              // Regular letter - check Wordle status
              status = getLetterStatus(letter, letterIndex, guess);
            }

            return (
              <div
                key={letterIndex}
                className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded ${
                  status === 'correct' ? 'bg-green-500 text-white border-green-500' :
                  status === 'present' ? 'bg-yellow-500 text-white border-yellow-500' :
                  status === 'space' ? 'bg-gray-300 border-gray-400' :
                  status === 'special' ? 'bg-blue-200 text-blue-800 border-blue-400' :
                  status === 'empty' ? 'bg-white border-gray-300' :
                  'bg-gray-200 text-gray-700 border-gray-400'
                }`}
              >
                {displayChar}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to render empty rows for Card Mode
  const renderCardEmptyRows = () => {
    if (!targetGameData) return null;

    const remainingGuesses = 6 - cardGuesses.length;
    const rows = [];

    for (let i = 0; i < remainingGuesses; i++) {
      rows.push(
        <div key={`empty-${i}`} className="flex items-center gap-3 mb-2">
          {/* Empty guess number */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-400 border-2 border-gray-300 shrink-0">
            {cardGuesses.length + i + 1}
          </div>
          {/* Empty guess row */}
          <div className="flex gap-1 justify-center flex-wrap flex-1">
            {Array(targetGameData.name.length).fill('').map((_, j) => {
            const targetChar = targetGameData.name[j];
            
            return (
              <div 
                key={j} 
                className={`w-8 h-8 border-2 rounded flex items-center justify-center ${
                  targetChar === ' ' ? 'bg-gray-300 border-gray-400' :
                  ['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar) ? 'bg-blue-200 text-blue-800 border-blue-400 text-sm font-bold' :
                  'bg-white border-gray-300'
                }`}
              >
                {['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar) ? targetChar : ''}
              </div>
            );
          })}
          </div>
        </div>
      );
    }

    return rows;
  };

  // Function to render individual letter inputs
  const renderLetterInputs = () => {
    if (!targetGameData) return null;

    return (
      <div className="flex gap-1 justify-center flex-wrap mb-4">
        {Array.from({ length: targetGameData.name.length }).map((_, index) => {
          const targetChar = targetGameData.name[index];
          const isSpace = targetChar === ' ';
          const isSpecialChar = ['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar);
          const isFlipping = flippingTiles.includes(index);
          
          if (isSpace) {
            // Render a space indicator
            return (
              <div
                key={index}
                className="w-8 h-8 bg-gray-300 border-2 border-gray-400 rounded flex items-center justify-center"
              />
            );
          } else if (isSpecialChar) {
            // Render special character (non-editable)
            return (
              <div
                key={index}
                className="w-8 h-8 bg-blue-200 text-blue-800 border-2 border-blue-400 rounded flex items-center justify-center text-sm font-bold"
              >
                {targetChar}
              </div>
            );
          } else {
            // Render input for regular letters with flip animation
            return (
              <div key={index} className="relative">
                <input
                  id={`letter-input-${index}`}
                  type="text"
                  maxLength={1}
                  value={letterInputs[index] || ''}
                  onChange={(e) => handleLetterInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleLetterInputKeyDown(index, e)}
                  className={`w-8 h-8 border-2 border-gray-300 rounded text-center text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                    isFlipping ? 'scale-95 opacity-75' : ''
                  }`}
                  style={{ '--tw-ring-color': '#4B86FE' } as React.CSSProperties}
                />
                {/* Flip animation overlay */}
                {isFlipping && (
                  <div 
                    className="absolute inset-0 w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-bold text-white animate-flip"
                    style={{
                      backgroundColor: getFlipTileColor(index, letterInputs[index] || ''),
                      borderColor: getFlipTileColor(index, letterInputs[index] || '')
                    }}
                  >
                    {letterInputs[index] || ''}
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>
    );
  };



  // Simple unified game board function
  const renderUnifiedGameBoard = () => {
    try {
      // Safety check - return loading state if no data
      if (!targetGameData || !targetGameData.name) {
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading game board...</p>
            </div>
          </div>
        );
      }
    
    const maxLength = targetGameData.name.length;
    
    // Safety check for maxLength
    if (maxLength === 0) {
      return (
        <div className="text-center p-8 text-red-600">
          Error: Invalid game data
        </div>
      );
    }
    
    const currentRow = gameMode === 'title' ? guesses.length : 
                      gameMode === 'image' ? imageGuesses.length : 
                      cardGuesses.length;
    
    return (
      <div className="space-y-2 flex flex-col items-center">
        {/* Show completed guesses */}
        {gameMode === 'title' && guesses && guesses.map((guess, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 w-6 text-right">{index + 1}</span>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: maxLength }).map((_, j) => {
                const targetChar = targetGameData.name[j];
                const guessChar = guess[j] || '';
                
                if (targetChar === ' ') {
                  return <div key={j} className="w-8 h-8 bg-gray-300 border-2 border-gray-400 rounded" />;
                } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
                  return (
                    <div key={j} className="w-8 h-8 bg-blue-200 text-blue-800 border-2 border-blue-400 rounded flex items-center justify-center text-sm font-bold">
                      {targetChar}
                    </div>
                  );
                } else {
                  const isCorrect = guessChar === targetChar;
                  const isPresent = targetGameData.name.toUpperCase().includes(guessChar);
                  const finalBgColor = isCorrect ? 'bg-green-500' : isPresent ? 'bg-yellow-500' : 'bg-gray-200';
                  const finalTextColor = isCorrect ? 'text-white' : isPresent ? 'text-white' : 'text-gray-700';
                  const tileKey = getTileKey(index, j);
                  const isFlipped = isTileFlipped(tileKey);
                  
                  return (
                    <div 
                      key={j} 
                      className={`w-8 h-8 border-2 border-transparent rounded flex items-center justify-center text-sm font-bold ${
                        isFlipped ? `${finalBgColor} ${finalTextColor} tile-flip` : `${finalBgColor} ${finalTextColor}`
                      }`}
                    >
                      {guessChar}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
        
        {gameMode === 'image' && imageGuesses && imageGuesses.map((guess, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 w-6 text-right">{index + 1}</span>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: maxLength }).map((_, j) => {
                const targetChar = targetGameData.name[j];
                const guessChar = guess[j] || '';
                
                if (targetChar === ' ') {
                  return <div key={j} className="w-8 h-8 bg-gray-300 border-2 border-gray-400 rounded" />;
                } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
                  return (
                    <div key={j} className="w-8 h-8 bg-blue-200 text-blue-800 border-2 border-blue-400 rounded flex items-center justify-center text-sm font-bold">
                      {targetChar}
                    </div>
                  );
                } else {
                  const isCorrect = guessChar === targetChar;
                  const isPresent = targetGameData.name.toUpperCase().includes(guessChar);
                  const finalBgColor = isCorrect ? 'bg-green-500' : isPresent ? 'bg-yellow-500' : 'bg-gray-200';
                  const finalTextColor = isCorrect ? 'text-white' : isPresent ? 'text-white' : 'text-gray-700';
                  const tileKey = getTileKey(index, j);
                  const isFlipped = isTileFlipped(tileKey);
                  
                  return (
                    <div 
                      key={j} 
                      className={`w-8 h-8 border-2 border-transparent rounded flex items-center justify-center text-sm font-bold ${
                        isFlipped ? `${finalBgColor} ${finalTextColor} tile-flip` : `${finalBgColor} ${finalTextColor}`
                      }`}
                    >
                      {guessChar}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
        
        {gameMode === 'card' && cardGuesses && cardGuesses.map((guess, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 w-6 text-right">{index + 1}</span>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: maxLength }).map((_, j) => {
                const targetChar = targetGameData.name[j];
                const guessChar = guess[j] || '';
                
                if (targetChar === ' ') {
                  return <div key={j} className="w-8 h-8 bg-gray-300 border-2 border-gray-400 rounded" />;
                } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
                  return (
                    <div key={j} className="w-8 h-8 bg-blue-200 text-blue-800 border-2 border-blue-400 rounded flex items-center justify-center text-sm font-bold">
                      {targetChar}
                    </div>
                  );
                } else {
                  const isCorrect = guessChar === targetChar;
                  const isPresent = targetGameData.name.toUpperCase().includes(guessChar);
                  const finalBgColor = isCorrect ? 'bg-green-500' : isPresent ? 'bg-yellow-500' : 'bg-gray-200';
                  const finalTextColor = isCorrect ? 'text-white' : isPresent ? 'text-white' : 'text-gray-700';
                  const tileKey = getTileKey(index, j);
                  const isFlipped = isTileFlipped(tileKey);
                  
                  return (
                    <div 
                      key={j} 
                      className={`w-8 h-8 border-2 border-transparent rounded flex items-center justify-center text-sm font-bold ${
                        isFlipped ? `${finalBgColor} ${finalTextColor} tile-flip` : `${finalBgColor} ${finalTextColor}`
                      }`}
                    >
                      {guessChar}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
        
                 {/* Show current input row - only if game is not over */}
         {currentRow < 6 && !gameOver && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-600 w-6 text-right font-bold">{currentRow + 1}</span>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: maxLength }).map((_, index) => {
                const targetChar = targetGameData.name[index];
                
                if (targetChar === ' ') {
                  return <div key={index} className="w-8 h-8 bg-gray-300 border-2 border-gray-400 rounded" />;
                } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
                  return (
                    <div key={index} className="w-8 h-8 bg-blue-200 text-blue-800 border-2 border-blue-400 rounded flex items-center justify-center text-sm font-bold">
                      {targetChar}
                    </div>
                  );
                } else {
            return (
              <input
                key={index}
                id={`letter-input-${index}`}
                type="text"
                maxLength={1}
                   pattern="[A-Za-z0-9]*"
                   inputMode="text"
                value={letterInputs[index] || ''}
                onChange={(e) => handleLetterInputChange(index, e.target.value)}
                onKeyDown={(e) => handleLetterInputKeyDown(index, e)}
                   className={`w-8 h-8 border-2 rounded text-center text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:border-transparent bg-white ${
                     !letterInputs[index] || letterInputs[index].trim() === '' 
                       ? 'border-red-300 focus:border-red-500' 
                       : 'border-gray-300 focus:border-blue-500'
                   }`}
                style={{ '--tw-ring-color': '#4B86FE' } as React.CSSProperties}
              />
            );
          }
        })}
            </div>
          </div>
        )}
        
        {/* Show empty rows */}
        {Array.from({ length: 6 - currentRow - 1 }).map((_, index) => (
          <div key={`empty-${index}`} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-400 w-6 text-right">{currentRow + index + 2}</span>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: maxLength }).map((_, j) => {
                const targetChar = targetGameData.name[j];
                
                if (targetChar === ' ') {
                  return <div key={j} className="w-8 h-8 bg-gray-200 border-2 border-gray-300 rounded" />;
                } else if (['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
                  return (
                    <div key={j} className="w-8 h-8 bg-blue-100 text-blue-600 border-2 border-blue-300 rounded flex items-center justify-center text-sm font-bold">
                      {targetChar}
      </div>
    );
                } else {
                  return <div key={j} className="w-8 h-8 border-2 border-gray-200 rounded bg-gray-50" />;
                }
              })}
            </div>
          </div>
        ))}
      </div>
    );
    } catch (error) {
      console.error('Error rendering unified game board:', error);
      return (
        <div className="text-center p-8 text-red-600">
          Error rendering game board. Please refresh the page.
        </div>
      );
    }
  };

  // Get the color for flip tiles based on letter status
  const getFlipTileColor = (position: number, letter: string): string => {
    if (!targetGameData || !letter) return '#6B7280'; // Default gray
    
    const targetName = targetGameData.name;
    const normalizedLetter = normalizeText(letter);
    const normalizedTargetName = normalizeText(targetName);
    const normalizedTargetChar = normalizeText(targetName[position]);
    
    if (normalizedLetter === normalizedTargetChar) {
      return '#10B981'; // Green for correct position
    } else if (normalizedTargetName.includes(normalizedLetter)) {
      return '#F59E0B'; // Yellow for present but wrong position
    } else {
      return '#6B7280'; // Gray for absent
    }
  };

  // Show loading state while fetching games
  if (isLoadingGames) {
    return (
      <div className="max-w-full mx-auto px-4 py-8">
        <div className="text-center">
          <img 
            src="/BoardleLoadingIcon.svg" 
            alt="Loading..." 
            className="inline-block w-16 h-16"
          />
          <p className="mt-4 text-gray-600">Loading games from database...</p>
        </div>
      </div>
    );
  }

  // Show error state if no games available
  if (!isLoadingGames && availableGames.length === 0) {
    return (
      <div className="max-w-full mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">No games available for Boardle. Please try again later.</p>
          <button
            onClick={fetchGames}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Function to trigger flip animation for a specific tile
  const triggerTileFlip = (tileKey: string) => {
    if (!flippedTiles.has(tileKey)) {
      setFlippedTiles(prev => new Set(Array.from(prev).concat(tileKey)));
    }
  };

  // Function to get tile key for tracking flip state
  const getTileKey = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`;

  // Function to check if tile should be flipped
  const isTileFlipped = (tileKey: string) => flippedTiles.has(tileKey);
  
  // Function to check if all required tiles are filled
  const areAllTilesFilled = () => {
    if (!targetGameData) return false;
    
    for (let i = 0; i < targetGameData.name.length; i++) {
      const targetChar = targetGameData.name[i];
      // Only check regular letter tiles (not spaces or special characters)
      if (targetChar !== ' ' && !['-', ':', '&', "'", '.', '!', '?', ','].includes(targetChar)) {
        if (!letterInputs[i] || letterInputs[i].trim() === '') {
          return false;
        }
      }
    }
    return true;
  };
  
  // Function to show validation message
  const showValidationPopup = () => {
    setShowValidationMessage(true);
    setTimeout(() => setShowValidationMessage(false), 3000); // Hide after 3 seconds
  };

  return (
    <div className="mx-auto px-4 w-full">
      {/* Game Mode Tabs */}
      <div className="mb-8">
        <div className="flex justify-center space-x-1 bg-gray-100 p-1 rounded-lg max-w-lg mx-auto">
          <button
            onClick={() => switchGameMode('title')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              gameMode === 'title'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={gameMode === 'title' ? { backgroundColor: '#4B86FE' } : {}}
          >
            <Type className="w-4 h-4" />
            <span>Title Mode</span>
          </button>
          <button
            onClick={() => switchGameMode('image')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              gameMode === 'image'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={gameMode === 'image' ? { backgroundColor: '#4B86FE' } : {}}
          >
            <Image className="w-4 h-4" />
            <span>Image Mode</span>
          </button>
          <button
            onClick={() => switchGameMode('card')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              gameMode === 'card'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={gameMode === 'card' ? { backgroundColor: '#4B86FE' } : {}}
          >
            <RectangleHorizontal className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} />
            <span>Card Mode</span>
          </button>
        </div>
      </div>

       {/* Validation Message Popup */}
       {showValidationMessage && (
         <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
           <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
             <X className="w-5 h-5" />
             <span className="font-medium">Please fill all letter tiles before submitting your guess!</span>
           </div>
         </div>
       )}

                     

                                                                                                                                                                                                                               <div className="flex justify-center">
                                                                                                                  <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side - Game Board */}
           <div className="flex-shrink-0" style={{
             width: targetGameData?.name ? `${Math.max(280, Math.min(900, targetGameData.name.length * 32 + 120))}px` : '400px'
           }}>
                      {gameMode === 'title' ? (
              <>
                {/* Title Mode - Unified Game Board */}
      <div className="mb-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold mb-3">Guess the Board Game</h3>
                    {renderUnifiedGameBoard()}
                    <button
                      onClick={handleLetterGuess}
                       disabled={gameOver || !areAllTilesFilled()}
                      className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed mt-4"
                      style={{ backgroundColor: '#4B86FE' }}
                    >
                      Submit Guess
                    </button>
      </div>
                  <p className="text-center text-sm text-gray-600 mt-2">
                    Attempts: {guesses.length} / 6
                  </p>
              </div>

                                 {/* Title Mode - Revealed Letters Section */}
               <div className="mb-6">
                   <div>
                     <h3 className="text-lg font-semibold mb-4 text-center">Revealed Letters</h3>
                 <div className="flex gap-1 justify-center flex-wrap">
                   {renderRevealedLetters()}
                 </div>
               </div>
                 </div>

                {/* Title Mode - Game Over Message */}
                {gameOver && (
                  <div className="mb-6 text-center">
                    {gameWon ? (
                      <div className="text-green-600 font-bold text-xl mb-2">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-2">
                            <img src="/PartyIcon.svg" alt="Party" className="w-10 h-10" />
                            Congratulations, you found {targetGameData?.name}!
                          </div>
                          <p className="text-sm text-green-600">Come back tomorrow for a new challenge!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600 font-bold text-xl mb-2">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div>Game Over! The answer was {targetGameData?.name}</div>
                          <p className="text-sm text-red-600">Come back tomorrow to try again!</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </>
          ) : gameMode === 'image' ? (
            <>
                {/* Image Mode - Unified Game Board */}
              <div className="mb-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold mb-3">Guess the Board Game</h3>
                    {renderUnifiedGameBoard()}
                    <button
                      onClick={handleLetterGuess}
                       disabled={gameOver || !areAllTilesFilled()}
                      className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed mt-4"
                      style={{ backgroundColor: '#4B86FE' }}
                    >
                      Submit Guess
                    </button>
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-2">
                    Attempts: {imageGuesses.length} / 6
                  </p>
                </div>

                                 {/* Image Mode - Revealed Letters Section */}
                 <div className="mb-6">
                   <div>
                     <h3 className="text-lg font-semibold mb-4 text-center">Revealed Letters</h3>
                     <div className="flex gap-1 justify-center flex-wrap">
                       {renderImageRevealedLetters()}
                     </div>
                   </div>
                 </div>

                {/* Image Mode - Game Over Message */}
                {gameOver && (
                  <div className="mb-6 text-center">
                    {gameWon ? (
                      <div className="text-green-600 font-bold text-xl mb-2">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-2">
                            <img src="/PartyIcon.svg" alt="Party" className="w-10 h-10" />
                            Congratulations, you found {targetGameData?.name}!
                          </div>
                          <p className="text-sm text-green-600">Come back tomorrow for a new challenge!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600 font-bold text-xl mb-2">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div>Game Over! The answer was {targetGameData?.name}</div>
                          <p className="text-sm text-red-600">Come back tomorrow to try again!</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
           ) : gameMode === 'card' ? (
             <>
                              {/* Card Mode - Unified Game Board */}
               <div className="mb-6">
                 <div className="text-center mb-4">
                   <h3 className="text-lg font-semibold mb-3">Guess the Board Game</h3>
                   {renderUnifiedGameBoard()}
                   <button
                     onClick={handleLetterGuess}
                      disabled={gameOver || !areAllTilesFilled()}
                     className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed mt-4"
                       style={{ backgroundColor: '#4B86FE' }}
                     >
                       Submit Guess
                     </button>
                   </div>
                   <p className="text-center text-sm text-gray-600 mt-2">
                     Attempts: {cardGuesses.length} / 6
                   </p>
                 </div>

                                   {/* Card Mode - Revealed Letters Section */}
                  <div className="mb-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-center">Revealed Letters</h3>
                      <div className="flex gap-1 justify-center flex-wrap">
                        {renderCardRevealedLetters()}
                      </div>
                    </div>
                  </div>

                 {/* Card Mode - Game Over Message */}
               {gameOver && (
                 <div className="mb-6 text-center">
                   {gameWon ? (
                     <div className="text-green-600 font-bold text-xl mb-2">
                       <div className="flex flex-col items-center justify-center gap-2">
                         <div className="flex items-center gap-2">
                           <img src="/PartyIcon.svg" alt="Party" className="w-10 h-10" />
                           Congratulations, you found {targetGameData?.name}!
                         </div>
                         <p className="text-sm text-green-600">Come back tomorrow for a new challenge!</p>
                       </div>
                     </div>
                   ) : (
                     <div className="text-red-600 font-bold text-xl mb-2">
                       <div className="flex flex-col items-center justify-center gap-2">
                         <div>Game Over! The answer was {targetGameData?.name}</div>
                         <p className="text-sm text-red-600">Come back tomorrow to try again!</p>
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </>
                      ) : null}
           </div>

                                             {/* Title Mode - Right Column (Clues Only) */}
                       {gameMode === 'title' && (
                         <div className="flex-shrink-0 w-80 space-y-6">
                          {/* Title Mode - Clues Section */}
                          <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                              <Lightbulb className="w-6 h-6 text-yellow-500" />
                              <h3 className="text-xl font-semibold">Clues</h3>
                            </div>
                            
                            <div className="space-y-4">
                              {revealedClues.map((clue, index) => (
                                <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                  <div className="flex items-start gap-3">
                                    <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full min-w-[32px] text-center">
                                      {index + 1}
                                    </span>
                                    <p className="text-base text-gray-700 flex-1 leading-relaxed">{clue}</p>
                                  </div>
                                </div>
                              ))}
                              
                              {!gameOver && revealedClues.length < (targetGameData?.clues.length || 0) && (
                                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                                  <div className="flex items-center gap-3">
                                    <span className="bg-gray-400 text-white text-sm font-bold px-3 py-1 rounded-full min-w-[32px] text-center">
                                      {revealedClues.length + 1}
                                    </span>
                                    <p className="text-base text-gray-500 italic">
                                      Make a guess to reveal the next clue
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                                             {/* Image Mode - Middle Column with Image and Revealed Letters */}
                       {gameMode === 'image' && (
                         <div className="flex-shrink-0 space-y-6" style={{ width: '500px' }}>
                          {/* Image Mode - Progressive Zoom Image */}
                          <div className="bg-white p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-3 text-center">Guess the Board Game by Image</h3>
                <div className="flex justify-center">
                  {targetGameData?.imageUrl ? (
                                                                 <div 
                                   className="relative overflow-hidden rounded-lg shadow-lg bg-gray-100 select-none" 
                                   style={{ width: '500px', height: '400px' }}
                                  onContextMenu={(e) => e.preventDefault()}
                                  onDragStart={(e) => e.preventDefault()}
                                  onDrop={(e) => e.preventDefault()}
                                >
                      {!imageLoaded && (
                        <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
                          <div className="flex flex-col items-center space-y-2">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-600">Loading image...</span>
                          </div>
                        </div>
                      )}
                      <img
                        src={targetGameData.imageUrl}
                        alt="Board game to guess"
                                    className="w-full h-full object-contain pointer-events-none"
                        style={{
                          ...getImageTransform(),
                                      opacity: imageLoaded ? 1 : 0,
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none',
                                      WebkitTouchCallout: 'none'
                        }}
                        onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageLoaded(true)}
                                    onContextMenu={(e) => e.preventDefault()}
                                    onDragStart={(e) => e.preventDefault()}
                                    draggable={false}
                                    unselectable="on"
                      />
                      {/* Zoom indicator */}
                      {imageLoaded && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                      {gameWon ? 'Full Image' : `Zoom: ${Math.round(getImageZoomLevel())}%`}
                        </div>
                      )}
                    </div>
                  ) : (
                                <div className="w-full h-[450px] bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">No image available</span>
                    </div>
                  )}
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Each guess reveals more of the image and a new clue!
                </p>
                 

              </div>


                </div>
                      )}

                      {/* Image Mode - Right Column with Clues */}
                      {gameMode === 'image' && (
                        <div className="flex-shrink-0 w-80 space-y-6">
                          {/* Image Mode - Clues Section */}
                          <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                              <Lightbulb className="w-6 h-6 text-yellow-500" />
                              <h3 className="text-xl font-semibold">Clues</h3>
              </div>

                            <div className="space-y-4">
                              {revealedClues.map((clue, index) => (
                                <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                  <div className="flex items-start gap-3">
                                    <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full min-w-[32px] text-center">
                                      {index + 1}
                                    </span>
                                    <p className="text-base text-gray-700 flex-1 leading-relaxed">{clue}</p>
                </div>
              </div>
                              ))}
                              
                              {!gameOver && revealedClues.length < (targetGameData?.clues.length || 0) && (
                                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                                  <div className="flex items-center gap-3">
                                    <span className="bg-gray-400 text-white text-sm font-bold px-3 py-1 rounded-full min-w-[32px] text-center">
                                      {revealedClues.length + 1}
                                    </span>
                                    <p className="text-base text-gray-500 italic">
                                      Make a guess to zoom out and reveal the next clue
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                                             {/* Card Mode - Middle Column with Card Image and Revealed Letters */}
                       {gameMode === 'card' && (
                         <div className="flex-shrink-0 space-y-6" style={{ width: '500px' }}>
              {/* Card Mode - Game Card Image */}
                          <div className="bg-white p-4 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold mb-3 text-center">Guess which game this card comes from</h3>
                <div className="flex justify-center">
                  {targetGameData?.imageUrl ? (
                                                                 <div className="relative overflow-hidden rounded-lg shadow-lg bg-gray-100" style={{ width: '500px', height: '400px' }}>
                      <img
                        src={targetGameData.imageUrl}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{ objectFit: 'contain' }}
                        loading="lazy"
                        decoding="async"
                      />

                    </div>
                  ) : (
                                <div className="w-full h-[450px] bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">No card image available</span>
                    </div>
                  )}
                </div>
              </div>


        </div>
      )}

                      {/* Card Mode - Right Column with Clues */}
                      {gameMode === 'card' && (
                        <div className="flex-shrink-0 w-80 space-y-6">
                          {/* Card Mode - Clues Section */}
                          <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-semibold">Clues</h3>
            </div>
            
            <div className="space-y-4">
              {revealedClues.map((clue, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full min-w-[32px] text-center">
                      {index + 1}
                    </span>
                    <p className="text-base text-gray-700 flex-1 leading-relaxed">{clue}</p>
                  </div>
                </div>
              ))}
              
              {!gameOver && revealedClues.length < (targetGameData?.clues.length || 0) && (
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                  <div className="flex items-center gap-3">
                    <span className="bg-gray-400 text-white text-sm font-bold px-3 py-1 rounded-full min-w-[32px] text-center">
                      {revealedClues.length + 1}
                    </span>
                    <p className="text-base text-gray-500 italic">
                                      Make a guess to reveal the next clue
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
                      )}
                                                                                                                  </div>
                                                                                                                </div>

             {/* Stats */}
       <div className="mb-6 mt-8 flex justify-center">
         <div className="bg-white p-4 rounded-lg shadow" style={{ width: '600px' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Statistics</h3>
            <div className="text-sm text-gray-500">
              {isAuthenticated && user ? (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {user.username}
                </span>
              ) : (
                <span className="text-gray-400">Guest Mode</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Games Played</div>
              <div className="font-bold">{stats.gamesPlayed}</div>
            </div>
            <div>
              <div className="text-gray-600">Win Rate</div>
              <div className="font-bold">
                {stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">Current Streak</div>
              <div className="font-bold">{stats.currentStreak}</div>
            </div>
            <div>
              <div className="text-gray-600">Max Streak</div>
              <div className="font-bold">{stats.maxStreak}</div>
            </div>
          </div>
          
          {/* Guess Distribution */}
          <div className="mt-4">
            <div className="text-gray-600 mb-2">Guess Distribution</div>
            <div className="space-y-1">
              {stats.guessDistribution.map((count, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-4 text-xs">{index + 1}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div 
                      className="h-4 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: '#4B86FE',
                        width: `${Math.max(count, 1) * 20}px` 
                      }}
                    />
                  </div>
                  <span className="w-8 text-xs text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Guest mode message */}
          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">💡 Tip:</span> Create an account to save your statistics permanently and access them from any device!
              </p>
            </div>
          )}
          
          {/* Loading or error states */}
          {statsLoading && (
            <div className="mt-4 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Syncing statistics...
            </div>
          )}
          
          {statsError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                ⚠️ {statsError}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rules Button */}
      <div className="text-center">
        <button
          onClick={() => setShowRules(!showRules)}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2 mx-auto"
        >
          <HelpCircle className="w-4 h-4" />
          How to Play
        </button>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">How to Play Boardle</h3>
            <div className="space-y-3 text-sm">
                                                           <p><strong>Title Mode:</strong></p>
              <p>• Guess the board game name in 6 tries</p>
              <p>• Type letters in individual boxes - cursor automatically advances</p>
              <p>• Use arrow keys, backspace, or click to navigate between boxes</p>
              <p>• Each guess reveals a new clue and collects correct letters</p>
               <p>• Clues are generated based on the game's genre and characteristics</p>
              
              <p><strong>Image Mode:</strong></p>
              <p>• Start with a very zoomed-in image of the game</p>
              <p>• Each guess zooms out the image and reveals a new clue</p>
                              <p>• Letters from your guesses are collected just like Title Mode</p>
              
              <p><strong>Card Mode:</strong></p>
              <p>• See the full game card/box image from the start</p>
              <p>• Each guess reveals a new clue and collects correct letters</p>
              <p>• Same letter tracking and grid system as other modes</p>
              
              <p><strong>Letter Colors:</strong></p>
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs">A</div>
                <span>Letter is in the correct position</span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-white text-xs">A</div>
                <span>Letter is in the game name but wrong position</span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center text-white text-xs">A</div>
                <span>Letter is not in the game name</span>
              </div>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="mt-4 w-full px-4 py-2 text-white rounded hover:opacity-90"
              style={{ backgroundColor: '#4B86FE' }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}