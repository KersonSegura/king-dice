import { useState, useRef, useEffect } from 'react';

export const useGameMentions = (
  text: string,
  setText: (text: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) => {
  const MENTION_RESULT_LIMIT = 20;
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  // Text immediately after '@' in the textarea (used for replacement)
  const [mentionQuery, setMentionQuery] = useState('');
  // Query typed in the dropdown search input (can include spaces)
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [isMentionSearchDirty, setIsMentionSearchDirty] = useState(false);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [mentionSearchTimeout, setMentionSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Search games for mention dropdown
  const searchGamesForMention = async (query: string) => {
    if (!query.trim()) {
      setMentionResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=games&limit=${MENTION_RESULT_LIMIT}`);
      if (response.ok) {
        const data = await response.json();
        setMentionResults(data.games || []);
      }
    } catch (error) {
      console.error('Error searching games for mention:', error);
      setMentionResults([]);
    }
  };

  const scheduleMentionSearch = (query: string) => {
    if (mentionSearchTimeout) {
      clearTimeout(mentionSearchTimeout);
    }
    const timeout = setTimeout(() => {
      searchGamesForMention(query);
    }, 200);
    setMentionSearchTimeout(timeout);
  };

  const handleMentionSearchInputChange = (value: string) => {
    setMentionSearchQuery(value);
    setIsMentionSearchDirty(true);
    scheduleMentionSearch(value);
  };

  const insertGameMention = (game: any) => {
    const gameName = game.nameEn || game.name || mentionQuery;
    const beforeMention = text.substring(0, mentionStartPos);
    const afterMention = text.substring(mentionStartPos + 1 + mentionQuery.length);
    // Use cleaner format: 🔗GameName + ZWJ + gameId + ZWJ
    const ZWJ = '\u200D';
    const linkText = `🔗${gameName}${ZWJ}${game.id}${ZWJ}`;
    const newText = beforeMention + linkText + afterMention;
    
    setText(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionSearchQuery('');
    setIsMentionSearchDirty(false);
    setMentionResults([]);
    
    // Focus input and set cursor position after the inserted link
    setTimeout(() => {
      if (inputRef.current) {
        const visiblePart = `🔗${gameName}`;
        const newCursorPos = beforeMention.length + visiblePart.length;
        inputRef.current.focus();
        if ('setSelectionRange' in inputRef.current) {
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }
    }, 0);
  };

  // Convert the cleaner format back to markdown when sending
  const convertGameMentionsToMarkdown = (text: string): string => {
    const ZWJ = '\u200D';
    const linkEmoji = '🔗';
    
    // Use string methods instead of regex to avoid Turbopack parsing issues
    let result = text;
    let searchIndex = 0;
    
    while (true) {
      // Find the next link emoji
      const emojiIndex = result.indexOf(linkEmoji, searchIndex);
      if (emojiIndex === -1) break;
      
      // Find the first ZWJ after the emoji (end of game name)
      const afterEmoji = result.substring(emojiIndex + linkEmoji.length);
      const firstZWJIndex = afterEmoji.indexOf(ZWJ);
      if (firstZWJIndex === -1) {
        searchIndex = emojiIndex + linkEmoji.length;
        continue;
      }
      
      const gameName = afterEmoji.substring(0, firstZWJIndex);
      
      // Find the second ZWJ (end of game ID)
      const afterFirstZWJ = afterEmoji.substring(firstZWJIndex + ZWJ.length);
      const secondZWJIndex = afterFirstZWJ.indexOf(ZWJ);
      if (secondZWJIndex === -1) {
        searchIndex = emojiIndex + linkEmoji.length;
        continue;
      }
      
      const gameId = afterFirstZWJ.substring(0, secondZWJIndex);
      const linkEndIndex = emojiIndex + linkEmoji.length + firstZWJIndex + ZWJ.length + secondZWJIndex + ZWJ.length;
      
      // Replace the cleaner format with markdown
      const before = result.substring(0, emojiIndex);
      const after = result.substring(linkEndIndex);
      const markdownLink = `[${gameName}](/game/${gameId})`;
      result = before + markdownLink + after;
      
      // Continue searching from after the replacement
      searchIndex = emojiIndex + markdownLink.length;
    }
    
    return result;
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setText(value);

    // Check if we're in a mention context (@...)
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      // Check if there's a space, newline, or closing bracket after the @ (mention ended or already a link)
      const textAfterAt = textBeforeCursor.substring(lastAtPos + 1);
      // Allow spaces in game titles; only newline ends the mention context.
      const hasNewlineAfterAt = textAfterAt.includes('\n');
      // Check for both markdown format and new cleaner format
      const ZWJ = '\u200D';
      const isAlreadyLink = value.substring(lastAtPos, cursorPos).includes('](/game/') || 
                           value.substring(lastAtPos, cursorPos).includes(`🔗`) ||
                           (textAfterAt.includes(ZWJ) && textAfterAt.split(ZWJ).length > 1);
      
      if (!hasNewlineAfterAt && !isAlreadyLink) {
        // We're in a mention - extract the query (remove zero-width characters and link emoji)
        const query = textAfterAt.replace(new RegExp(ZWJ, 'g'), '').replace(new RegExp('🔗', 'g'), '');
        setMentionStartPos(lastAtPos);
        setMentionQuery(query);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);

        // Keep dropdown search synced to what user types after '@' until they type in the search bar.
        if (!isMentionSearchDirty) {
          setMentionSearchQuery(query);
          scheduleMentionSearch(query);
        }
      } else {
        // Mention ended or already a link
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionSearchQuery('');
        setIsMentionSearchDirty(false);
        setMentionResults([]);
      }
    } else {
      // No @ found
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionSearchQuery('');
      setIsMentionSearchDirty(false);
      setMentionResults([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (showMentionDropdown && mentionResults.length > 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertGameMention(mentionResults[selectedMentionIndex]);
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < mentionResults.length - 1 ? prev + 1 : prev
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionSearchQuery('');
        setIsMentionSearchDirty(false);
        setMentionResults([]);
        return;
      }
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (mentionSearchTimeout) {
        clearTimeout(mentionSearchTimeout);
      }
    };
  }, [mentionSearchTimeout]);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMentionDropdown &&
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionResults([]);
      }
    };

    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMentionDropdown, inputRef]);

  return {
    showMentionDropdown,
    mentionQuery,
    mentionSearchQuery,
    handleMentionSearchInputChange,
    mentionResults,
    selectedMentionIndex,
    mentionDropdownRef,
    handleTyping,
    handleKeyPress,
    insertGameMention,
    convertGameMentionsToMarkdown
  };
};

