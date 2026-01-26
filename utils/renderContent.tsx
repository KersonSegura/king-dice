import React from 'react';

/**
 * Renders content with game mention links converted to clickable links
 * Converts markdown format [GameName](/game/id) to clickable links
 */
export const renderContentWithGameLinks = (
  content: string,
  isUserContent: boolean = false,
  options?: { renderImages?: boolean }
): React.ReactNode => {
  const renderImages = options?.renderImages ?? false;
  const parts: React.ReactNode[] = [];

  // Matches: ![alt](url) OR [text](url)
  const tokenRegex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  const isSafeUrl = (url: string) => {
    const u = url.trim();
    return /^https?:\/\//i.test(u) || u.startsWith('/') || u.startsWith('#');
  };

  // Convert markdown tokens to React nodes, keep other text as-is
  while ((match = tokenRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Image token
    if (match[0].startsWith('![')) {
      const alt = match[1] ?? '';
      const src = match[2] ?? '';
      if (renderImages && isSafeUrl(src)) {
        parts.push(
          <span key={`${src}-${match.index}`} className="block my-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-w-full h-auto rounded-lg border border-gray-200" />
          </span>
        );
      } else {
        // If images are disabled, drop it from previews (or keep as plain text if desired)
        parts.push('');
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // Link token
    const text = match[3] ?? '';
    const href = match[4] ?? '';
    if (!isSafeUrl(href)) {
      parts.push(match[0]);
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // Use yellow for links in user content (e.g., blue message bubbles), primary blue for other content
    const linkClassName = isUserContent
      ? 'underline text-yellow-300 hover:text-yellow-200 break-words font-medium'
      : 'underline text-primary-600 hover:text-primary-700 break-words font-medium';

    parts.push(
      <a
        key={`${href}-${match.index}`}
        href={href}
        className={linkClassName}
        target={href.startsWith('/') ? undefined : '_blank'}
        rel={href.startsWith('/') ? undefined : 'noreferrer'}
      >
        {text || href}
      </a>
    );

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : content;
};

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
  
  // Match *text* for bold (but not **text** which is standard markdown bold)
  // We want single asterisks to be bold, so we need to be careful
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
