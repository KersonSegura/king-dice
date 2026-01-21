import React from 'react';

/**
 * Renders text with simple markdown-like formatting
 * Supports:
 * - *text* for bold
 * - Can be extended for other formatting (italic, etc.)
 */
export const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match *text* for bold
  // Pattern: *text* where text doesn't contain asterisks
  const boldRegex = /\*([^*]+)\*/g;
  let match;
  let keyCounter = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add bold text
    parts.push(
      <strong key={`bold-${keyCounter++}`} className="font-bold">
        {match[1]}
      </strong>
    );
    
    lastIndex = boldRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no matches, return original text
  if (parts.length === 0) {
    return text;
  }

  // Preserve whitespace and line breaks
  return <span style={{ whiteSpace: 'pre-wrap' }}>{parts}</span>;
};
