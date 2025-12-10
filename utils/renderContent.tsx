import React from 'react';

/**
 * Renders content with game mention links converted to clickable links
 * Converts markdown format [GameName](/game/id) to clickable links
 */
export const renderContentWithGameLinks = (
  content: string,
  isUserContent: boolean = false
): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((\/game\/[^\)]+)\)/g;
  let lastIndex = 0;
  let match;

  // Convert markdown links to anchor tags, keep other text as-is
  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    // Use yellow for links in user content (e.g., blue message bubbles), blue for other content
    const linkClassName = isUserContent
      ? 'underline text-yellow-300 hover:text-yellow-200 break-words'
      : 'underline text-blue-600 hover:text-blue-700 break-words';
    parts.push(
      <a
        key={`${match[2]}-${match.index}`}
        href={match[2]}
        className={linkClassName}
        target="_blank"
        rel="noreferrer"
      >
        {match[1]}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : content;
};

