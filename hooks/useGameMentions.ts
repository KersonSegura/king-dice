import { useState, useRef, useEffect } from 'react';

export const useGameMentions = (
  text: string,
  setText: (text: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) => {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
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
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=games&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setMentionResults(data.games || []);
      }
    } catch (error) {
      console.error('Error searching games for mention:', error);
      setMentionResults([]);
    }
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
    return text.replace(new RegExp(`🔗([^${ZWJ}]+)${ZWJ}(\\d+)${ZWJ}`, 'g'), (match, gameName, gameId) => {
      return `[${gameName}](/game/${gameId})`;
    });
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
      const hasSpaceAfterAt = textAfterAt.includes(' ') || textAfterAt.includes('\n');
      // Check for both markdown format and new cleaner format
      const ZWJ = '\u200D';
      const isAlreadyLink = value.substring(lastAtPos, cursorPos).includes('](/game/') || 
                           value.substring(lastAtPos, cursorPos).includes(`🔗`) ||
                           (textAfterAt.includes(ZWJ) && textAfterAt.split(ZWJ).length > 1);
      
      if (!hasSpaceAfterAt && !isAlreadyLink) {
        // We're in a mention - extract the query (remove zero-width characters)
        const query = textAfterAt.replace(new RegExp(ZWJ, 'g'), '').replace(/🔗/g, '');
        setMentionStartPos(lastAtPos);
        setMentionQuery(query);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);

        // Debounce the search
        if (mentionSearchTimeout) {
          clearTimeout(mentionSearchTimeout);
        }
        const timeout = setTimeout(() => {
          searchGamesForMention(query);
        }, 200);
        setMentionSearchTimeout(timeout);
      } else {
        // Mention ended or already a link
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionResults([]);
      }
    } else {
      // No @ found
      setShowMentionDropdown(false);
      setMentionQuery('');
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
    mentionResults,
    selectedMentionIndex,
    mentionDropdownRef,
    handleTyping,
    handleKeyPress,
    insertGameMention,
    convertGameMentionsToMarkdown
  };
};

