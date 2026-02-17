'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Users, Clock, Calendar, User, Building2, Star, Eye, Home, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileText, Play, Download, Globe, X, ExternalLink } from 'lucide-react';
import VideoLinks from '@/components/VideoLinks';
import PDFHandler from '@/components/PDFHandler';
import { useState, useEffect, useRef, useCallback } from 'react';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout

interface Game {
  id: number;
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
  hasPdfFile?: boolean;
  officialWebsite?: string;
  shopUrl?: string;
  amazonUrl?: string;
  shopItems?: Array<{
    id?: number;
    title: string;
    imageUrl?: string;
    link: string;
    order?: number;
  }>;
  shopListMasterGameId?: number | null;
  bggId?: number;
  bggRanking?: number;
  bggRating?: number;
  bggVotes?: number;
  userRating?: number;
  userVotes?: number;
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
}

async function getGame(id: string): Promise<Game | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    const isEmbed =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('embed') === '1';
    const response = await fetch(`/api/games/${id}${isEmbed ? '?embed=1' : ''}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('[GamePage] API returned', response.status, await response.text().catch(() => ''));
      return null;
    }
    
    const data = await response.json();
    return data.game ?? null;
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
}

function cleanHtmlEntities(text: string) {
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
}


// Process markdown content and convert heading anchors to HTML elements with IDs
function processMarkdownContent(text: string): React.ReactNode {
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
        // Add more bottom margin to create better paragraph spacing
        const isLastLine = index === lines.length - 1;
        const nextLineIsEmpty = index < lines.length - 1 && lines[index + 1]?.trim() === '';
        processedLines.push(
          <div key={`line-${index}`} className={nextLineIsEmpty ? "mb-2" : "mb-3"}>
            {parseMarkdownLinks(line)}
          </div>
        );
      }
    }
  });
  
  return <div>{processedLines}</div>;
}

function parseMarkdownLinks(text: string): React.ReactNode {
  if (!text) return text;
  
  // Simply remove all markdown links and return plain text
  let processedText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  return <span style={{ whiteSpace: 'pre-line' }}>{processedText}</span>;
}

function renderRulesWithImages(text: string) {
  if (!text) return null;

  // Helper function to check if a heading text contains "Game Rules"
  const isGameRulesHeading = (headingText: string): boolean => {
    const normalized = headingText.toLowerCase().trim();
    // Remove any HTML tags for comparison
    const textOnly = normalized.replace(/<[^>]+>/g, '').trim();
    // Check for variations: "Game Rules", "Catan Game Rules", etc.
    // Match patterns like "Game Rules", "Catan Game Rules", "Rules", etc.
    return textOnly.includes('game rules') || 
           (textOnly.includes('rules') && textOnly.split(/\s+/).length <= 3);
  };

  // Remove the first "Game Rules" heading from the text before processing
  // This handles both markdown and HTML formats
  let processedText = text;
  
  // Find the position of the first markdown heading and first HTML heading
  const markdownMatch = processedText.match(/^(#{1,6})\s*(.+?)(\n|$)/m);
  const htmlHeadingMatch = processedText.match(/<h([1-6])>(.*?)<\/h[1-6]>/i);
  
  let markdownPosition = markdownMatch ? processedText.indexOf(markdownMatch[0]) : -1;
  let htmlPosition = htmlHeadingMatch ? processedText.indexOf(htmlHeadingMatch[0]) : -1;
  
  // Determine which heading comes first and check if it's a "Game Rules" heading
  if (markdownPosition >= 0 && (htmlPosition < 0 || markdownPosition < htmlPosition)) {
    // Markdown heading comes first
    const [, hashes, headerText] = markdownMatch!;
    if (isGameRulesHeading(headerText)) {
      // Remove this line including the newline
      processedText = processedText.replace(/^(#{1,6})\s*.+?(\n|$)/m, '').trimStart();
    }
  } else if (htmlPosition >= 0) {
    // HTML heading comes first (or is the only one)
    const fullMatch = htmlHeadingMatch![0];
    const [, level, content] = htmlHeadingMatch!;
    const cleanContent = content.replace(/<[^>]+>/g, '').trim();
    if (isGameRulesHeading(cleanContent)) {
      // Remove the HTML heading and any surrounding whitespace/newlines
      const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedText = processedText.replace(new RegExp(`\\s*${escapedMatch}\\s*`, 'i'), '').trimStart();
    }
  }

  // Process the entire content to handle mixed HTML, markdown, and images
  const processContentPart = (contentText: string): React.ReactNode[] => {
    if (!contentText) return [];

    // First, handle images by splitting and processing them
    const imageParts = contentText.split(/(\[IMAGE:[^\]]+\]|!\[.*?\]\(data:image\/[^)]+\)|!\[.*?\]\(\/uploads\/rules-images\/[^)]+\))/g);
    
    return imageParts.map((part, partIndex) => {
      // Handle image placeholders
      const imageMatch = part.match(/\[IMAGE:([^\]]+)\]/);
      if (imageMatch) {
        return (
          <div key={`img-placeholder-${partIndex}`} className="bg-gray-200 rounded-lg p-4 my-4 text-center text-gray-500">
            [Image: {imageMatch[1]}]
          </div>
        );
      }
      
      // Handle file reference images
      const fileImageMatch = part.match(/!\[(.*?)\]\(\/uploads\/rules-images\/([^)]+)\)/);
      if (fileImageMatch) {
        const [, altText, filePath] = fileImageMatch;
        return (
          <img
            key={`file-img-${partIndex}`}
            src={`/uploads/rules-images/${filePath}`}
            alt={altText}
            className="max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block"
            style={{ maxHeight: '400px' }}
          />
        );
      }
      
      // Handle base64 images
      const base64ImageMatch = part.match(/!\[(.*?)\]\((data:image\/[^)]+)\)/);
      if (base64ImageMatch) {
        const [, altText, imageData] = base64ImageMatch;
        return (
          <img
            key={`b64-img-${partIndex}`}
            src={imageData}
            alt={altText}
            className="max-w-full h-auto rounded-lg shadow-sm my-4 mx-auto block"
            style={{ maxHeight: '400px' }}
          />
        );
      }

      // Process text content for HTML and markdown
      return processTextContent(part, partIndex);
    }).filter(Boolean);
  };

  const processTextContent = (text: string, partIndex: number): React.ReactNode => {
    if (!text.trim()) return null;

    // Process line by line to handle both markdown headers and HTML
    const lines = text.split('\n');
    const processedLines: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check for markdown headers first
      const headerMatch = trimmedLine.match(/^(#{1,6})\s*(.*)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        
        const headerClasses = {
          1: 'text-2xl font-bold text-gray-900 mt-6 mb-4',
          2: 'text-xl font-bold text-gray-800 mt-5 mb-3',
          3: 'text-lg font-semibold text-gray-800 mt-4 mb-3',
          4: 'text-base font-semibold text-gray-700 mt-3 mb-2',
          5: 'text-sm font-semibold text-gray-700 mt-3 mb-2',
          6: 'text-sm font-medium text-gray-600 mt-2 mb-2'
        };
        
        processedLines.push(
          <HeaderTag 
            key={`header-${partIndex}-${i}`} 
            className={headerClasses[level as keyof typeof headerClasses] || headerClasses[6]}
          >
            {headerText || '\u00A0'}
          </HeaderTag>
        );
        continue;
      }

      // Check for HTML content in the line
      if (line.includes('<') && line.includes('>')) {
        const processedHtml = processHtmlTags(line);
        processedLines.push(
          <div 
            key={`html-${partIndex}-${i}`} 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        );
        continue;
      }

      // Regular text line - parse markdown links
      if (line.length > 0 || i < lines.length - 1) {
        const textWithNewline = line + (i < lines.length - 1 ? '\n' : '');
        const parsedContent = parseMarkdownLinks(textWithNewline);
        
        processedLines.push(
          <span key={`text-${partIndex}-${i}`} className="whitespace-pre-wrap">
            {parsedContent}
          </span>
        );
      }
    }

    return processedLines.length === 1 ? processedLines[0] : (
      <div key={`content-${partIndex}`}>
        {processedLines}
      </div>
    );
  };

  const processHtmlTags = (text: string): string => {
    return text
      // Headers
      .replace(/<h([1-6])>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
        const displayContent = content.trim() || '\u00A0';
        const classes = {
          1: 'text-2xl font-bold text-gray-900 mt-6 mb-4',
          2: 'text-xl font-bold text-gray-800 mt-5 mb-3',
          3: 'text-lg font-semibold text-gray-800 mt-4 mb-3',
          4: 'text-base font-semibold text-gray-700 mt-3 mb-2',
          5: 'text-sm font-semibold text-gray-700 mt-3 mb-2',
          6: 'text-sm font-medium text-gray-600 mt-2 mb-2'
        };
        const className = classes[level as keyof typeof classes] || classes[6];
        return `<h${level} class="${className}">${displayContent}</h${level}>`;
      })
      // Strong/Bold
      .replace(/<strong>(.*?)<\/strong>/gi, (match, content) => {
        const displayContent = content.trim() || '\u00A0';
        return `<strong class="font-bold text-gray-900">${displayContent}</strong>`;
      })
      .replace(/<b>(.*?)<\/b>/gi, (match, content) => {
        const displayContent = content.trim() || '\u00A0';
        return `<b class="font-bold text-gray-900">${displayContent}</b>`;
      })
      // Italic/Em
      .replace(/<em>(.*?)<\/em>/gi, (match, content) => {
        const displayContent = content.trim() || '\u00A0';
        return `<em class="italic text-gray-700">${displayContent}</em>`;
      })
      .replace(/<i>(.*?)<\/i>/gi, (match, content) => {
        const displayContent = content.trim() || '\u00A0';
        return `<i class="italic text-gray-700">${displayContent}</i>`;
      })
      // Other tags
      .replace(/<u>(.*?)<\/u>/gi, (match, content) => {
        const displayContent = content.trim() || '\u00A0';
        return `<u class="underline text-gray-700">${displayContent}</u>`;
      })
      .replace(/<p>(.*?)<\/p>/gi, (match, content) => {
        const displayContent = content.trim() || '\u00A0';
        return `<p class="mb-3 text-gray-700">${displayContent}</p>`;
      })
      .replace(/<br\s*\/?>/gi, '<br class="my-1">');
  };

  return (
    <div>
      {processContentPart(processedText)}
    </div>
  );
}

export default function GamePage() {
  const params = useParams<{ id?: string }>();
  const id = Array.isArray(params?.id) ? params?.id?.[0] : params?.id;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [showAllDesigners, setShowAllDesigners] = useState(false);
  const [showAllPublishers, setShowAllPublishers] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullDesigner, setShowFullDesigner] = useState(false);
  const [showFullPublisher, setShowFullPublisher] = useState(false);
  const [designerNeedsMore, setDesignerNeedsMore] = useState(false);
  const [publisherNeedsMore, setPublisherNeedsMore] = useState(false);
  const [designerTruncatedText, setDesignerTruncatedText] = useState(''); // unused after simplifying clamp
  const [publisherTruncatedText, setPublisherTruncatedText] = useState(''); // unused after simplifying clamp
  const designerRef = useRef<HTMLDivElement>(null);
  const publisherRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'video' | 'pdf' | 'shop'>('video');
  const [isDesktop, setIsDesktop] = useState(false);

  // Mobile tab overflow indicators
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsCanScrollLeft, setTabsCanScrollLeft] = useState(false);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);
  
  // Ranking button state
  const [showTooltip, setShowTooltip] = useState(false);
  const starButtonRef = useRef<HTMLButtonElement>(null);
  
  // Rating modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [existingUserRatingStars, setExistingUserRatingStars] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [localUserRating, setLocalUserRating] = useState<number | null>(game?.userRating ?? null);
  const [localUserVotes, setLocalUserVotes] = useState<number>(game?.userVotes ?? 0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [hasUserVoted, setHasUserVoted] = useState<boolean>(false);
  const [userVoteStars, setUserVoteStars] = useState<number | null>(null);
  
  // Auth and toast hooks
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  
  // Translation hooks
  const t = useTranslations('common');
  const tGame = useTranslations('game');
  const locale = useLocale();
  const retryLoad = () => setRetryToken((t) => t + 1);

  // Check if desktop view and calculate available width
  useEffect(() => {
    const checkDesktop = () => {
      const isDesktopView = window.innerWidth >= 768;
      // Only enforce min-width if viewport is actually wide enough
      // Account for padding (px-4 sm:px-6 lg:px-8 = roughly 32-64px total)
      const availableWidth = window.innerWidth - 128; // Conservative padding estimate
      setIsDesktop(isDesktopView && availableWidth >= 1000);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const updateTabsScrollIndicators = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const canScroll = scrollWidth > clientWidth + 1;
    setTabsCanScrollLeft(canScroll && scrollLeft > 1);
    setTabsCanScrollRight(canScroll && scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Show left/right arrows on mobile when tab headers overflow horizontally
  useEffect(() => {
    updateTabsScrollIndicators();
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', updateTabsScrollIndicators);
    return () => window.removeEventListener('resize', updateTabsScrollIndicators);
  }, [updateTabsScrollIndicators]);

  // Helper function to clean up URL for display
  const getCleanUrlDisplay = (url: string): string => {
    try {
      const urlObj = new URL(url);
      let cleanUrl = urlObj.hostname;
      
      // Remove 'www.' prefix if present
      if (cleanUrl.startsWith('www.')) {
        cleanUrl = cleanUrl.substring(4);
      }
      
      return cleanUrl;
    } catch {
      // If URL parsing fails, return the original URL
      return url;
    }
  };

  // Calculate combined rating (BGG + users)
  const combinedRating = game?.bggRating && localUserRating 
    ? ((game.bggRating * (game.bggVotes || 0)) + (localUserRating * (localUserVotes || 0))) / 
      ((game.bggVotes || 0) + (localUserVotes || 0))
    : game?.bggRating || (localUserRating ? localUserRating : null);

  // Ranking button handlers
  const handleStarMouseEnter = () => {
    if (starButtonRef.current) {
      const rect = starButtonRef.current.getBoundingClientRect();
      setShowTooltip(true);
    }
  };

  const handleStarMouseLeave = () => {
    setShowTooltip(false);
  };

  const closeRatingModal = () => {
    setIsRatingModalOpen(false);
    setHoveredRating(null);
    if (existingUserRatingStars) {
      setSelectedStars(existingUserRatingStars);
    } else {
      setSelectedStars(0);
    }
  };

  const openRatingModal = async () => {
    if (!game) return;
    console.log('Opening rating modal for game:', game.id);
    setIsRatingModalOpen(true);
    setModalLoading(true);
    setModalError(null);

    const queryParam = user ? `?userId=${user.id}` : '';

    try {
      const response = await fetch(`/api/games/${game.id}/vote${queryParam}`);
      
      if (!response.ok) {
        console.warn('Could not load previous vote data, continuing without it');
        setExistingUserRatingStars(null);
        setSelectedStars(0);
        setModalLoading(false);
        return;
      }

      const data = await response.json();
      const previousRating =
        typeof data.userRatingStars === 'number' ? data.userRatingStars : null;
      setExistingUserRatingStars(previousRating);
      setSelectedStars(previousRating ?? 0);
      
      // Track if user has voted
      setHasUserVoted(data.hasVoted || false);
      setUserVoteStars(previousRating);

      if (typeof data.averageUserRatingRaw === 'number') {
        setLocalUserRating(data.averageUserRatingRaw);
      }

      if (typeof data.totalVotes === 'number') {
        setLocalUserVotes(data.totalVotes);
      }
    } catch (error) {
      console.error('Error loading rating modal data:', error);
      setExistingUserRatingStars(null);
      setSelectedStars(0);
    } finally {
      setModalLoading(false);
    }
  };

  const submitRating = async () => {
    if (!game) return;
    
    console.log('submitRating called with selectedStars:', selectedStars);
    
    if (!selectedStars || selectedStars < 0.5 || selectedStars > 5.0) {
      console.warn('Invalid rating selected:', selectedStars);
      showToast('Please select a star rating to vote', 'info');
      return;
    }

    if (!isAuthenticated || !user) {
      showToast('Please sign in to vote', 'info');
      return;
    }
    
    if (!user.id) {
      console.error('User ID is missing');
      showToast('User authentication error. Please try again.', 'error');
      return;
    }

    setIsSubmittingVote(true);
    setModalError(null);

    try {
      const response = await fetch(`/api/games/${game.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: selectedStars,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'An unexpected error occurred. Please try again later.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          }
        } catch (parseError) {
          errorMessage = 'An unexpected error occurred. Please try again later.';
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error('An unexpected error occurred. Please try again later.');
      }

      setLocalUserRating(result.userRating ?? localUserRating);
      setLocalUserVotes(result.userVotes ?? localUserVotes);
      setExistingUserRatingStars(selectedStars);
      setHasUserVoted(true);
      setUserVoteStars(selectedStars);
      console.log(`[GamePage] Vote submitted for game ${game.id}:`, {
        hasUserVoted: true,
        userVoteStars: selectedStars,
        result
      });
      const successMessage = result.message || (result.isNewVote ? 'Thanks for your vote!' : 'Rating updated!');
      showToast(successMessage, 'success');
      closeRatingModal();
    } catch (error) {
      console.error('Error voting:', error);
      const userFriendlyMessage = error instanceof Error 
        ? (error.message.includes('Unexpected token') || error.message.includes('<!DOCTYPE')
          ? 'An unexpected error occurred. Please try again later.'
          : error.message.includes('Database error')
          ? 'Database connection issue. Please try again later.'
          : error.message)
        : 'An unexpected error occurred. Please try again later.';
      setModalError(userFriendlyMessage);
      showToast('Failed to submit vote', 'error');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Star button clicked, opening modal...');
    openRatingModal();
  };

  const getDisplayRating = () => {
    if (hoveredRating !== null) return hoveredRating;
    return selectedStars;
  };

  const displayRating = getDisplayRating();

  const handleRatingStarClick = (starIndex: number, isLeftHalf: boolean) => {
    const rating = starIndex + (isLeftHalf ? 0.5 : 1.0);
    setSelectedStars(rating);
    setHoveredRating(null);
  };

  const handleStarHover = (starIndex: number, isLeftHalf: boolean) => {
    const rating = starIndex + (isLeftHalf ? 0.5 : 1.0);
    setHoveredRating(rating);
  };

  // Update local rating state when game data changes
  useEffect(() => {
    if (game) {
      setLocalUserRating(game.userRating ?? null);
      setLocalUserVotes(game.userVotes ?? 0);
    }
  }, [game?.id, game?.userRating, game?.userVotes]);

  // Simple overflow check for 2-line clamp (mobile only)
  useEffect(() => {
    const checkOverflow = () => {
      if (window.innerWidth >= 768) {
        setDesignerNeedsMore(false);
        setPublisherNeedsMore(false);
        return;
      }

      if (designerRef.current && game?.designer && !showFullDesigner) {
        const el = designerRef.current;
        // Check if text overflows 1 line
        setDesignerNeedsMore(el.scrollHeight > el.clientHeight + 1);
      } else {
        setDesignerNeedsMore(false);
      }

      if (publisherRef.current && game?.developer && !showFullPublisher) {
        const el = publisherRef.current;
        // Check if text overflows 1 line
        setPublisherNeedsMore(el.scrollHeight > el.clientHeight + 1);
      } else {
        setPublisherNeedsMore(false);
      }
    };

    const timeoutId = setTimeout(checkOverflow, 50);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [game?.designer, game?.developer, showFullDesigner, showFullPublisher]);

  // Check if user has voted when component mounts or user changes
  useEffect(() => {
    if (!game || !isAuthenticated || !user?.id) {
      setHasUserVoted(false);
      setUserVoteStars(null);
      return;
    }

    const checkUserVote = async () => {
      try {
        const response = await fetch(`/api/games/${game.id}/vote?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[GamePage] Vote check for game ${game.id}:`, data);
          setHasUserVoted(data.hasVoted || false);
          setUserVoteStars(data.userRatingStars || null);
        } else {
          console.warn(`[GamePage] Failed to check vote for game ${game.id}:`, response.status);
          // If API fails, assume no vote
          setHasUserVoted(false);
          setUserVoteStars(null);
        }
      } catch (error) {
        console.error('[GamePage] Error checking user vote:', error);
        // If error, assume no vote
        setHasUserVoted(false);
        setUserVoteStars(null);
      }
    };

    checkUserVote();
  }, [game?.id, user?.id, isAuthenticated]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isRatingModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRatingModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRatingModalOpen]);

  // Fetch game data
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!id) {
      setLoading(false);
      setGame(null);
      setError('missing_id');
      return () => {
        isCancelled = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const fetchGame = async () => {
      setLoading(true);
      setError(null);
      timeoutId = setTimeout(() => {
        if (isCancelled) return;
        setError('timeout');
        setLoading(false);
      }, 25000);
      try {
        const fetchedGame = await getGame(id);
        if (isCancelled) return;
        setGame(fetchedGame);
        if (!fetchedGame) {
          setError('not_found');
        }
      } catch (error) {
        console.error('Error fetching game:', error);
        if (!isCancelled) {
          setGame(null);
          setError('fetch_failed');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    fetchGame();
    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [id, retryToken]);

  // Set active tab to first available tab when game loads
  useEffect(() => {
    if (!game || loading) return;
    
    // Use the same logic as the render to find rules
    const rules = game.rules?.find(r => r.language === 'es') || game.rules?.find(r => r.language === 'en');
    const hasRules = !!rules?.rulesText;
    // Check videoUrl - it might be a string or array
    const hasVideo = !!(game.videoUrl && (Array.isArray(game.videoUrl) ? game.videoUrl.length > 0 : game.videoUrl));
    const hasPdf = !!(game.pdfUrl || game.pdfFile);
    // Show shop tab if game has shop items, shop URLs, OR if it's linked to a master game's shop list
    const hasShop = !!(game.shopUrl || game.amazonUrl || (game.shopItems && game.shopItems.length > 0) || game.shopListMasterGameId);
    
    console.log('Setting active tab:', { hasRules, hasVideo, hasPdf, hasShop, videoUrl: game.videoUrl, shopItems: game.shopItems });
    
    // Set to first available tab in order: video > shop > pdf > rules
    if (hasVideo) {
      setActiveTab('video');
    } else if (hasShop) {
      setActiveTab('shop');
    } else if (hasPdf) {
      setActiveTab('pdf');
    } else if (hasRules) {
      setActiveTab('rules');
    }
    // If no tabs available, the section won't render anyway due to the conditional
  }, [game, loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            <Image 
              src="/DiceLogo.svg" 
              alt="Loading..." 
              width={64} 
              height={64} 
              className="opacity-60 mx-auto mb-4"
            />
            <p className="text-gray-600">{t('loadingGame')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error === 'not_found'
        ? (tGame('gameNotFound') || 'Game not found.')
        : error === 'timeout'
          ? 'Game took too long to load. Please try again.'
          : error === 'missing_id'
            ? 'Missing game id.'
            : 'Unable to load game. Please try again.';
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">{errorMessage}</h2>
            <div className="space-x-4">
              <button
                type="button"
                onClick={retryLoad}
                className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/90 transition-colors"
              >
                Retry
              </button>
              <Link
                href="/boardgames"
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {tGame('browseGames') || t('browseGames', {ns: 'header'}) || 'Browse Games'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">{t('gameNotFound')}</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {tGame('gameNotFoundDescription') || "Sorry, we couldn't find the game you're looking for. It might have been removed or doesn't exist."}
            </p>
            <div className="space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/90 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                {t('goBackHome')}
              </Link>
              <Link
                href="/boardgames"
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {tGame('browseGames') || t('browseGames', {ns: 'header'}) || 'Browse Games'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get description based on current locale, fallback to English
  const description = game.descriptions?.find(d => d.language === locale) || 
                     game.descriptions?.find(d => d.language === 'en');
  // Get rules based on current locale, fallback to English
  const rules = game.rules?.find(r => r.language === locale) || 
                game.rules?.find(r => r.language === 'en');

  // Helper function to truncate description
  const truncateDescription = (text: string, maxLength: number = 500) => {
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

  const getDisplayDescription = () => {
    if (!description?.fullDescription) return '';
    const cleanDesc = cleanHtmlEntities(description.fullDescription);
    return showFullDescription ? cleanDesc : truncateDescription(cleanDesc);
  };

  // Star rating UI
  const starButtons = (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const fullRating = starIndex + 1;
          const halfRating = starIndex + 0.5;
          const isHalfFilled = displayRating >= halfRating && displayRating < fullRating;
          const isFilled = displayRating >= fullRating;
          
          return (
            <div
              key={starIndex}
              className="relative cursor-pointer"
              onMouseLeave={() => setHoveredRating(null)}
            >
              <div className="relative w-10 h-10">
                {/* Left half (0.5) */}
                <div
                  className="absolute left-0 top-0 w-1/2 h-full z-10"
                  onMouseEnter={() => handleStarHover(starIndex, true)}
                  onClick={() => handleRatingStarClick(starIndex, true)}
                  title={`${halfRating} stars`}
                />
                {/* Right half (1.0) */}
                <div
                  className="absolute right-0 top-0 w-1/2 h-full z-10"
                  onMouseEnter={() => handleStarHover(starIndex, false)}
                  onClick={() => handleRatingStarClick(starIndex, false)}
                  title={`${fullRating} star${fullRating === 1 ? '' : 's'}`}
                />
                {/* Star icon */}
                <div className="relative w-full h-full">
                  {/* Background star (always visible) */}
                  <Star
                    className="w-10 h-10 absolute"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth={2}
                  />
                  {/* Filled portion */}
                  {isFilled ? (
                    <Star
                      className="w-10 h-10 absolute"
                      fill="#fbae17"
                      stroke="#fbae17"
                      strokeWidth={2}
                    />
                  ) : isHalfFilled ? (
                    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                      <Star
                        className="w-10 h-10"
                        fill="#fbae17"
                        stroke="#fbae17"
                        strokeWidth={2}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-2">
        <p className="text-sm font-medium text-gray-700">
          {displayRating > 0 ? `${displayRating.toFixed(1)} / 5.0` : 'Select your rating'}
        </p>
      </div>
    </div>
  );

  // Rating modal
  const ratingModal = !isRatingModalOpen || !game ? null : (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={closeRatingModal}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
          onClick={closeRatingModal}
          aria-label="Close rating modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{tGame('rate')} {game.nameEn}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {existingUserRatingStars 
              ? `${tGame('yourCurrentRating')} ${existingUserRatingStars.toFixed(1)}/5. ${tGame('youCanChangeIt')}`
              : tGame('shareYourRating')}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{tGame('overallRating')}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {combinedRating ? `${combinedRating.toFixed(1)}/10` : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            {((game.bggVotes || 0) + (localUserVotes || 0)) > 0 
              ? `${((game.bggVotes || 0) + (localUserVotes || 0)).toLocaleString()} ${((game.bggVotes || 0) + (localUserVotes || 0)) === 1 ? tGame('votePlural') : tGame('votesPlural')}`
              : tGame('noVotesYet')}
          </p>
        </div>

        {modalLoading ? (
          <div className="py-8 text-center text-gray-500">{tGame('loading')}</div>
        ) : (
          <>
            {starButtons}
            {!isAuthenticated && (
              <p className="text-sm text-gray-500 text-center">
                {tGame('signInToSave')}
              </p>
            )}
            {modalError && <p className="text-sm text-red-500 text-center">{modalError}</p>}
            <button
              type="button"
              onClick={submitRating}
              disabled={isSubmittingVote || !isAuthenticated || !selectedStars}
              className="mt-4 w-full rounded-xl bg-[#fbae17] py-3 text-white font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {isSubmittingVote 
                ? tGame('saving')
                : selectedStars 
                  ? `${existingUserRatingStars ? tGame('update') : tGame('submit')} ${selectedStars.toFixed(1)} ★` 
                  : tGame('selectAStar')}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {ratingModal}
      <div className="w-full px-0 md:px-4 lg:px-6 xl:px-8 py-8 overflow-x-hidden">
        {/* Game Header */}
        <div className="bg-white rounded-none shadow-lg overflow-hidden mb-8 mx-auto w-full" style={{ minWidth: isDesktop ? '1000px' : '0', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="md:flex">
            {/* Game Image */}
            <div className="w-full max-w-[300px] mx-auto md:w-1/3 md:max-w-none lg:w-1/4" style={{ minWidth: isDesktop ? '304.01px' : '0' }}>
              <div className="aspect-square relative bg-gray-100" style={{ minWidth: isDesktop ? '304.01px' : '0', minHeight: isDesktop ? '311.89px' : '0' }}>
                {game.imageUrl || game.thumbnailUrl ? (
                  <Image
                    src={game.imageUrl || game.thumbnailUrl || ''}
                    alt={game.nameEn}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Eye className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p>{tGame('noImageAvailable')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Game Info */}
            <div className="md:w-2/3 lg:w-3/4 p-8">
              <div className="flex flex-col h-full">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    {game.nameEn}
                  </h1>
                  {game.nameEs && game.nameEs !== game.nameEn && (
                    <h2 className="text-2xl text-gray-600 mb-4">
                      {game.nameEs}
                    </h2>
                  )}

                  {/* Game Stats and Vote Button - Mobile: side by side, Desktop: stacked */}
                  <div className="flex flex-col md:block mt-6 md:mt-0 mb-3 md:mb-4">
                    {/* Mobile Layout: Stats left, Vote right */}
                    <div className="flex md:hidden items-start justify-between gap-4 mb-2">
                      {/* Stats on left */}
                      <div className="flex flex-col gap-2 flex-1">
                        {game.yearRelease && (
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-5 h-5 mr-2 text-[#fbae17] flex-shrink-0" />
                            <span className="font-medium">{game.yearRelease}</span>
                          </div>
                        )}
                        {game.minPlayers && game.maxPlayers && (
                          <div className="flex items-center text-gray-600">
                            <Users className="w-5 h-5 mr-2 text-[#fbae17] flex-shrink-0" />
                            <span className="font-medium">
                              {game.minPlayers === game.maxPlayers 
                                ? `${game.minPlayers} ${tGame('players')}`
                                : `${game.minPlayers}-${game.maxPlayers} ${tGame('players')}`
                              }
                            </span>
                          </div>
                        )}
                        {game.durationMinutes && (
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-5 h-5 mr-2 text-[#fbae17] flex-shrink-0" />
                            <span className="font-medium">{game.durationMinutes} {tGame('min')}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Vote button on right */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <button 
                            type="button"
                            ref={starButtonRef}
                            className="p-3 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center space-x-2 text-white"
                            style={{ backgroundColor: '#fbae17' }}
                            onMouseEnter={handleStarMouseEnter}
                            onMouseLeave={handleStarMouseLeave}
                            onClick={handleStarClick}
                            title={hasUserVoted ? `You voted ${userVoteStars?.toFixed(1)}/5 stars` : 'Rate this game'}
                          >
                            <Star 
                              className={`w-5 h-5 text-white`} 
                              fill={hasUserVoted ? 'white' : 'none'}
                              stroke="white"
                              strokeWidth={hasUserVoted ? 1 : 2}
                            />
                            <span className="font-medium text-white">
                              {hasUserVoted ? 'Update Vote' : 'Vote'}
                            </span>
                          </button>
                          
                          {/* Tooltip */}
                          {showTooltip && (
                            <div 
                              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50"
                              style={{
                                transform: 'translateX(-50%)'
                              }}
                            >
                              <div className="flex flex-col items-start space-y-1">
                                <div className="flex items-center space-x-1">
                                  <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                                  <span>Rank #{game.bggRanking || 'N/A'} • Rating: {game.bggRating ? `${game.bggRating.toFixed(1)}/10` : 'N/A'}</span>
                                </div>
                                {hasUserVoted && userVoteStars && (
                                  <div className="text-xs text-green-300">
                                    Your vote: {userVoteStars.toFixed(1)}/5 ⭐
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout: Grid stats, then vote button */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {game.yearRelease && (
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-5 h-5 mr-2 text-[#fbae17]" />
                            <span className="font-medium">{game.yearRelease}</span>
                          </div>
                        )}
                        {game.minPlayers && game.maxPlayers && (
                          <div className="flex items-center text-gray-600">
                            <Users className="w-5 h-5 mr-2 text-[#fbae17]" />
                            <span className="font-medium">
                              {game.minPlayers === game.maxPlayers 
                                ? `${game.minPlayers} ${tGame('players')}`
                                : `${game.minPlayers}-${game.maxPlayers} ${tGame('players')}`
                              }
                            </span>
                          </div>
                        )}
                        {game.durationMinutes && (
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-5 h-5 mr-2 text-[#fbae17]" />
                            <span className="font-medium">{game.durationMinutes} {tGame('min')}</span>
                          </div>
                        )}
                      </div>

                      {/* Ranking Button */}
                      <div className="mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <button 
                              type="button"
                              ref={starButtonRef}
                              className="p-3 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center space-x-2 text-white"
                              style={{ backgroundColor: '#fbae17' }}
                              onMouseEnter={handleStarMouseEnter}
                              onMouseLeave={handleStarMouseLeave}
                              onClick={handleStarClick}
                              title={hasUserVoted ? `${tGame('youVoted')} ${userVoteStars?.toFixed(1)}/5 ${tGame('stars')}` : tGame('rateThisGame')}
                            >
                              <Star 
                                className={`w-5 h-5 text-white`} 
                                fill={hasUserVoted ? 'white' : 'none'}
                                stroke="white"
                                strokeWidth={hasUserVoted ? 1 : 2}
                              />
                              <span className="font-medium text-white">
                                {hasUserVoted ? tGame('updateVote') : tGame('vote')}
                              </span>
                            </button>
                            
                            {/* Tooltip */}
                            {showTooltip && (
                              <div 
                                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50"
                                style={{
                                  transform: 'translateX(-50%)'
                                }}
                              >
                                <div className="flex flex-col items-start space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                                    <span>{tGame('rank')} #{game.bggRanking || 'N/A'} • {tGame('rating')}: {game.bggRating ? `${game.bggRating.toFixed(1)}/10` : 'N/A'}</span>
                                  </div>
                                  {hasUserVoted && userVoteStars && (
                                    <div className="text-xs text-green-300">
                                      {tGame('yourVote')}: {userVoteStars.toFixed(1)}/5 ⭐
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {game.bggVotes && (
                              <span>{tGame('basedOn')} {game.bggVotes.toLocaleString()} {game.bggVotes === 1 ? tGame('votePlural') : tGame('votesPlural')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Designer & Publisher */}
                  <div className="space-y-2 md:mb-6 md:mt-0 -mt-1 mb-3">
                    {game.designer && (() => {
                      const designers = game.designer.split(',').map(d => d.trim()).filter(d => d);
                      const hasMore = designers.length > 3;
                      const displayedDesigners = showAllDesigners ? designers : designers.slice(0, 3);
                      const designerText = displayedDesigners.join(', ');
                      
                      return (
                        <div className="flex items-start text-gray-600">
                          <User className="w-5 h-5 mr-2 text-[#fbae17] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {/* Desktop: show with +X more button if needed */}
                            <div className="hidden md:block">
                              <span className="font-medium">{tGame('designer')}:</span>
                              <span className="ml-2">
                                {designerText}
                                {hasMore && !showAllDesigners && (
                                  <button
                                    onClick={() => setShowAllDesigners(true)}
                                    className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                  >
                                    +{designers.length - 3} {tGame('more')}
                                  </button>
                                )}
                                {hasMore && showAllDesigners && (
                                  <button
                                    onClick={() => setShowAllDesigners(false)}
                                    className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                  >
                                    {tGame('showLess')}
                                  </button>
                                )}
                              </span>
                            </div>
                            {/* Mobile: single-line text; See more button on next line if overflow */}
                            <div className="md:hidden">
                              {showFullDesigner ? (
                                <div className="flex flex-wrap items-start">
                                  <span className="font-medium">{tGame('designer')}:</span>
                                  <span className="ml-2 break-words">{game.designer}</span>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowFullDesigner(false);
                                    }}
                                    className="ml-1 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                  >
                                    {tGame('seeLess')}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div
                                    ref={designerRef}
                                    className="break-words"
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: '1.5em',
                                      maxHeight: '1.5em',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    <span className="font-medium">{tGame('designer')}:</span>
                                    <span className="ml-1">{game.designer}</span>
                                  </div>
                                  {designerNeedsMore && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowFullDesigner(true);
                                      }}
                                      className="mt-1 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                    >
                                      {tGame('seeMore')}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {game.developer && (() => {
                      const publishers = game.developer.split(',').map(p => p.trim()).filter(p => p);
                      const hasMore = publishers.length > 3;
                      const displayedPublishers = showAllPublishers ? publishers : publishers.slice(0, 3);
                      const publisherText = displayedPublishers.join(', ');
                      
                      return (
                        <div className="flex items-start text-gray-600">
                          <Building2 className="w-5 h-5 mr-2 text-[#fbae17] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {/* Desktop: show with +X more button if needed */}
                            <div className="hidden md:block">
                              <span className="font-medium">{tGame('publisher')}:</span>
                              <span className="ml-2">
                                {publisherText}
                                {hasMore && !showAllPublishers && (
                                  <button
                                    onClick={() => setShowAllPublishers(true)}
                                    className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                  >
                                    +{publishers.length - 3} {tGame('more')}
                                  </button>
                                )}
                                {hasMore && showAllPublishers && (
                                  <button
                                    onClick={() => setShowAllPublishers(false)}
                                    className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                  >
                                    {tGame('showLess')}
                                  </button>
                                )}
                              </span>
                            </div>
                            {/* Mobile: single-line text; See more button on next line if overflow */}
                            <div className="md:hidden">
                              {showFullPublisher ? (
                                <div className="flex flex-wrap items-start">
                                  <span className="font-medium">{tGame('publisher')}:</span>
                                  <span className="ml-2 break-words">{game.developer}</span>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowFullPublisher(false);
                                    }}
                                    className="ml-1 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                  >
                                    {tGame('seeLess')}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div
                                    ref={publisherRef}
                                    className="break-words"
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: '1.5em',
                                      maxHeight: '1.5em',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    <span className="font-medium">{tGame('publisher')}:</span>
                                    <span className="ml-1">{game.developer}</span>
                                  </div>
                                  {publisherNeedsMore && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowFullPublisher(true);
                                      }}
                                      className="mt-1 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                    >
                                      {tGame('seeMore')}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {game.officialWebsite && (
                      <div className="flex items-start text-gray-600">
                        <Globe className="w-5 h-5 mr-2 text-[#fbae17] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{tGame('officialLink')}:</span>
                          <a
                            href={game.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 underline break-all"
                          >
                            {getCleanUrlDisplay(game.officialWebsite)}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories and Mechanics */}
                <div className="mt-auto">
                  {game.gameCategories.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{tGame('categories')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {game.gameCategories.map((gc) => (
                          <span
                            key={gc.category.id}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {locale === 'es' ? gc.category.nameEs : gc.category.nameEn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {game.gameMechanics.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{tGame('mechanics')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {game.gameMechanics.map((gm) => (
                          <span
                            key={gm.mechanic.id}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                          >
                            {locale === 'es' ? gm.mechanic.nameEs : gm.mechanic.nameEn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        {description?.fullDescription && (
          <div className="bg-white rounded-none shadow-lg p-8 mb-8 mx-auto w-full" style={{ minWidth: isDesktop ? '1000px' : '0', maxWidth: '100%', boxSizing: 'border-box' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Star className="w-6 h-6 mr-2 text-[#fbae17]" />
              {tGame('aboutThisGame')}
            </h2>
            <div className="prose max-w-none">
              <div 
                className="text-gray-700 text-sm leading-relaxed"
                style={{
                  display: showFullDescription ? 'block' : '-webkit-box',
                  WebkitLineClamp: showFullDescription ? 'none' : 3,
                  WebkitBoxOrient: showFullDescription ? 'horizontal' : 'vertical',
                  overflow: showFullDescription ? 'visible' : 'hidden',
                  lineHeight: '1.75em',
                  maxHeight: showFullDescription ? 'none' : '5.25em' // 3 lines * 1.75em
                }}
              >
                {processMarkdownContent(getDisplayDescription())}
              </div>
              
              {/* Show More/Less Button */}
              {description.fullDescription && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-4 inline-flex items-center text-[#fbae17] hover:text-[#fbae17]/80 font-medium transition-colors"
                >
                  {showFullDescription ? (
                    <>
                      <span>{tGame('showLess')}</span>
                      <ChevronUp className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <span>{tGame('showMore')}</span>
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Game Resources Section with Tabs */}
        {(rules?.rulesText || game?.videoUrl || game?.pdfUrl || game?.pdfFile || game?.shopUrl || game?.amazonUrl || (game?.shopItems && game.shopItems.length > 0) || game?.shopListMasterGameId) && (
          <div className="bg-white rounded-none shadow-lg overflow-hidden mx-auto w-full" style={{ minWidth: isDesktop ? '1000px' : '0', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Tab Headers */}
            <div className="relative border-b border-gray-200" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div
                ref={tabsScrollRef}
                className="overflow-x-auto"
                onScroll={updateTabsScrollIndicators}
              >
                <nav className="flex space-x-2 sm:space-x-4 md:space-x-8 px-4 sm:px-6 md:px-8 pt-6 min-w-max" aria-label="Tabs">
                  {game?.videoUrl && (
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`py-3 sm:py-4 px-3 sm:px-4 md:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'video'
                          ? 'border-[#fbae17] text-[#fbae17]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                      {tGame('videoTutorial')}
                    </button>
                  )}

                  {(game?.shopUrl || game?.amazonUrl || (game?.shopItems && game.shopItems.length > 0) || game?.shopListMasterGameId) && (
                    <button
                      onClick={() => setActiveTab('shop')}
                      className={`py-3 sm:py-4 px-3 sm:px-4 md:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'shop'
                          ? 'border-[#fbae17] text-[#fbae17]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src="/ShopIcon.svg"
                        alt="Shop"
                        className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2"
                        style={{
                          filter:
                            activeTab === 'shop'
                              ? 'brightness(0) saturate(100%) invert(67%) sepia(93%) saturate(1352%) hue-rotate(1deg) brightness(102%) contrast(101%)'
                              : 'brightness(0) saturate(100%) invert(42%) sepia(8%) saturate(414%) hue-rotate(169deg) brightness(96%) contrast(89%)',
                        }}
                      />
                      {tGame('shop')}
                    </button>
                  )}

                  {(game?.pdfUrl || game?.pdfFile) && (
                    <button
                      onClick={() => setActiveTab('pdf')}
                      className={`py-3 sm:py-4 px-3 sm:px-4 md:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'pdf'
                          ? 'border-[#fbae17] text-[#fbae17]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                      {tGame('pdf')}
                    </button>
                  )}

                  {rules?.rulesText && (
                    <button
                      onClick={() => setActiveTab('rules')}
                      className={`py-3 sm:py-4 px-3 sm:px-4 md:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'rules'
                          ? 'border-[#fbae17] text-[#fbae17]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                      {tGame('gameRules')}
                    </button>
                  )}
                </nav>
              </div>

              {/* Mobile scroll indicators */}
              {tabsCanScrollLeft && (
                <button
                  type="button"
                  aria-label="Scroll tabs left"
                  onClick={() => {
                    const el = tabsScrollRef.current;
                    if (!el) return;
                    el.scrollBy({ left: -220, behavior: 'smooth' });
                  }}
                  className="md:hidden absolute left-0 top-0 h-full px-2 flex items-center justify-center bg-gradient-to-r from-white via-white/95 to-transparent"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
              )}
              {tabsCanScrollRight && (
                <button
                  type="button"
                  aria-label="Scroll tabs right"
                  onClick={() => {
                    const el = tabsScrollRef.current;
                    if (!el) return;
                    el.scrollBy({ left: 220, behavior: 'smooth' });
                  }}
                  className="md:hidden absolute right-0 top-0 h-full px-2 flex items-center justify-center bg-gradient-to-l from-white via-white/95 to-transparent"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="p-8 w-full" style={{ minWidth: isDesktop ? '1000px' : '0', maxWidth: '100%', boxSizing: 'border-box' }}>
              {activeTab === 'rules' && rules?.rulesText && (
                <div className="w-full">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-[#fbae17]" />
                    {tGame('gameRules')}
                  </h2>
                  <div className="prose max-w-none w-full">
                    <div className="text-gray-700 leading-relaxed w-full">
                      {renderRulesWithImages(cleanHtmlEntities(rules.rulesText))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'video' && game?.videoUrl && (
                <div className="w-full">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Play className="w-6 h-6 mr-2 text-[#fbae17]" />
                    {tGame('videoTutorials')}
                  </h2>
                  <div className="prose max-w-none w-full">
                    <div className="text-gray-700 leading-relaxed w-full">
                      <VideoLinks 
                        videoUrls={game.videoUrl} 
                        gameName={game.nameEn}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pdf' && (game?.pdfUrl || game?.pdfFile || game?.hasPdfFile) && (
                <div className="w-full">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Download className="w-6 h-6 mr-2 text-[#fbae17]" />
                    {tGame('pdfRules')}
                  </h2>
                  <div className="prose max-w-none w-full">
                    <div className="text-gray-700 leading-relaxed w-full">
                      <PDFHandler 
                        pdfUrl={game.pdfUrl}
                        pdfFile={game.pdfFile}
                        hasPdfFile={game.hasPdfFile}
                        gameName={game.nameEn}
                        gameId={game.id}
                        isAdmin={false}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'shop' && (game?.shopItems?.length || game?.shopUrl || game?.amazonUrl || game?.shopListMasterGameId) && (
                <div className="w-full">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center px-8 sm:px-6 md:px-0">
                    <img 
                      src="/ShopIcon.svg" 
                      alt="Shop" 
                      className="w-6 h-6 mr-2"
                      style={{
                        filter: 'brightness(0) saturate(100%) invert(67%) sepia(93%) saturate(1352%) hue-rotate(1deg) brightness(102%) contrast(101%)'
                      }}
                    />
                    {tGame('shop')}
                  </h2>
                  {/* Shop cards list - full width on mobile, normal on desktop */}
                  {(() => {
                    const shopItemsList = [...(game.shopItems && game.shopItems.length > 0 ? game.shopItems : [{
                      title: game.nameEn,
                      imageUrl: game.imageUrl || game.thumbnailUrl,
                      link: game.amazonUrl || game.shopUrl,
                      order: 999
                    }])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

                    const renderItem = (item: any, idx: number) => {
                      return (
                        <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                          <div className="relative w-full aspect-square bg-white overflow-hidden flex items-center justify-center">
                            {item.imageUrl ? (
                              item.imageUrl.startsWith('https://m.media-amazon.com') ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.title}
                                  fill
                                  className="object-contain"
                                  sizes="(max-width: 768px) 100vw, 400px"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    const svgPlaceholder = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#e5e7e9"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${item.title}</text></svg>`;
                                    target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder)}`;
                                  }}
                                />
                              ) : (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="max-w-full max-h-full object-contain"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    const svgPlaceholder = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#e5e7e9"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${item.title}</text></svg>`;
                                    target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder)}`;
                                  }}
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white">
                                <div className="text-center p-4">
                                  <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2">
                                    <rect width="200" height="200" fill="#e5e7e9" rx="8"/>
                                    <text x="50%" y="50%" fontFamily="Arial, sans-serif" fontSize="14" fill="#9ca3af" textAnchor="middle" dominantBaseline="middle">
                                      {item.title}
                                    </text>
                                  </svg>
                                  <p className="text-xs text-gray-500">{tGame('imageComingSoon')}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex flex-col flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{item.title}</h3>
                            <a
                              href={item.link || '#'}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className="w-full inline-flex items-center justify-center bg-[#fbae17] hover:bg-[#fbae17] text-white font-medium py-1.5 px-3 rounded-lg transition-colors space-x-1.5 text-xs mt-auto"
                            >
                              <span>{tGame('buyOnAmazon')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {/* Mobile version - breaks out of container */}
                        <div className="md:hidden" style={{
                          width: '100vw',
                          marginLeft: 'calc(-50vw + 50%)',
                          marginRight: 'calc(-50vw + 50%)'
                        }}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-4 mb-8 px-5">
                            {shopItemsList.map((item, idx) => renderItem(item, idx))}
                          </div>
                        </div>
                        {/* Desktop version - normal container, no breaking out */}
                        <div className="hidden md:block w-full">
                          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8 w-full">
                            {shopItemsList.map((item, idx) => renderItem(item, idx))}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Amazon Associates Disclosure - Full width, breaks out of padding */}
                  <div className="mt-8 pt-6 border-t border-gray-200 -mx-8 bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800 mb-1">
                            {tGame('amazonAssociatesDisclosure')}
                          </h3>
                          <p className="text-sm text-blue-700">
                            {tGame('amazonAssociatesDescription')}
                          </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No content available message */}
              {activeTab === 'rules' && !rules?.rulesText && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tGame('noRulesAvailable')}</h3>
                  <p className="text-gray-600">{tGame('noRulesAvailableDescription')}</p>
                </div>
              )}

              {activeTab === 'video' && !game?.videoUrl && (
                <div className="text-center py-12">
                  <Play className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tGame('noVideoAvailable')}</h3>
                  <p className="text-gray-600">{tGame('noVideoAvailableDescription')}</p>
                </div>
              )}

              {activeTab === 'pdf' && !game?.pdfUrl && !game?.pdfFile && (
                <div className="text-center py-12">
                  <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tGame('noPdfAvailable')}</h3>
                  <p className="text-gray-600">{tGame('noPdfAvailableDescription')}</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Back to Top Button */}
      {/* <BackToTopButton /> */}

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
