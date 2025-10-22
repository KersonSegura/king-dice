'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Users, Clock, Calendar, User, Building2, Star, Eye, Home, ChevronDown, ChevronUp, FileText, Play, Download, Globe } from 'lucide-react';
import VideoLinks from '@/components/VideoLinks';
import PDFHandler from '@/components/PDFHandler';
import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
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
  officialWebsite?: string;
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
    const response = await fetch(`/api/games/${id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.game;
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
}

function parseMarkdownLinks(text: string): React.ReactNode {
  if (!text) return text;
  
  // Simply remove all markdown links and return plain text
  let processedText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  return <span style={{ whiteSpace: 'pre-line' }}>{processedText}</span>;
}

function renderRulesWithImages(text: string) {
  if (!text) return null;

  // Process the entire content to handle mixed HTML, markdown, and images
  const processContentPart = (text: string): React.ReactNode[] => {
    if (!text) return [];

    // First, handle images by splitting and processing them
    const imageParts = text.split(/(\[IMAGE:[^\]]+\]|!\[.*?\]\(data:image\/[^)]+\)|!\[.*?\]\(\/uploads\/rules-images\/[^)]+\))/g);
    
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
      {processContentPart(text)}
    </div>
  );
}

export default function GamePage({ params }: { params: { id: string } }) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllDesigners, setShowAllDesigners] = useState(false);
  const [showAllPublishers, setShowAllPublishers] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'video' | 'pdf'>('rules');

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

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const fetchedGame = await getGame(params.id);
        setGame(fetchedGame);
      } catch (error) {
        console.error('Error fetching game:', error);
        setGame(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [params.id]);


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
            <p className="text-gray-600">Loading game...</p>
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
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">Game Not Found</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Sorry, we couldn't find the game you're looking for. It might have been removed or doesn't exist.
            </p>
            <div className="space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/90 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
              <Link
                href="/boardgames"
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Games
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const description = game.descriptions?.find(d => d.language === 'en');
  const rules = game.rules?.find(r => r.language === 'es') || game.rules?.find(r => r.language === 'en');

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Games
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="md:flex">
            {/* Game Image */}
            <div className="md:w-1/3 lg:w-1/4">
              <div className="aspect-square relative bg-gray-100">
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
                      <p>No Image Available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Game Info */}
            <div className="md:w-2/3 lg:w-3/4 p-8">
              <div className="flex flex-col h-full">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {game.nameEn}
                  </h1>
                  {game.nameEs && game.nameEs !== game.nameEn && (
                    <h2 className="text-2xl text-gray-600 mb-4">
                      {game.nameEs}
                    </h2>
                  )}

                  {/* Game Stats */}
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
                            ? `${game.minPlayers} players`
                            : `${game.minPlayers}-${game.maxPlayers} players`
                          }
                        </span>
                      </div>
                    )}
                    {game.durationMinutes && (
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-5 h-5 mr-2 text-[#fbae17]" />
                        <span className="font-medium">{game.durationMinutes} min</span>
                      </div>
                    )}
                  </div>

                  {/* Designer & Publisher */}
                  <div className="space-y-2 mb-6">
                    {game.designer && (() => {
                      const designers = game.designer.split(',').map(d => d.trim()).filter(d => d);
                      const hasMore = designers.length > 3;
                      const displayedDesigners = showAllDesigners ? designers : designers.slice(0, 3);
                      
                      return (
                        <div className="flex items-start text-gray-600">
                          <User className="w-5 h-5 mr-2 text-[#fbae17] mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">Designer:</span>
                            <span className="ml-2">
                              {displayedDesigners.join(', ')}
                              {hasMore && !showAllDesigners && (
                                <button
                                  onClick={() => setShowAllDesigners(true)}
                                  className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                >
                                  +{designers.length - 3} more
                                </button>
                              )}
                              {hasMore && showAllDesigners && (
                                <button
                                  onClick={() => setShowAllDesigners(false)}
                                  className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                >
                                  Show less
                                </button>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    {game.developer && (() => {
                      const publishers = game.developer.split(',').map(p => p.trim()).filter(p => p);
                      const hasMore = publishers.length > 3;
                      const displayedPublishers = showAllPublishers ? publishers : publishers.slice(0, 3);
                      
                      return (
                        <div className="flex items-start text-gray-600">
                          <Building2 className="w-5 h-5 mr-2 text-[#fbae17] mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">Publisher:</span>
                            <span className="ml-2">
                              {displayedPublishers.join(', ')}
                              {hasMore && !showAllPublishers && (
                                <button
                                  onClick={() => setShowAllPublishers(true)}
                                  className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                >
                                  +{publishers.length - 3} more
                                </button>
                              )}
                              {hasMore && showAllPublishers && (
                                <button
                                  onClick={() => setShowAllPublishers(false)}
                                  className="ml-2 text-[#fbae17] hover:text-[#fbae17]/80 font-medium underline"
                                >
                                  Show less
                                </button>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    {game.officialWebsite && (
                      <div className="flex items-start text-gray-600">
                        <Globe className="w-5 h-5 mr-2 text-[#fbae17] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">Official Website:</span>
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
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {game.gameCategories.map((gc) => (
                          <span
                            key={gc.category.id}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {gc.category.nameEn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {game.gameMechanics.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Mechanics</h3>
                      <div className="flex flex-wrap gap-2">
                        {game.gameMechanics.map((gm) => (
                          <span
                            key={gm.mechanic.id}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                          >
                            {gm.mechanic.nameEn}
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
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Star className="w-6 h-6 mr-2 text-[#fbae17]" />
              About This Game
            </h2>
            <div className="prose max-w-none">
              <div className="text-gray-700 text-sm leading-relaxed">
                {processMarkdownContent(getDisplayDescription())}
              </div>
              
              {/* Show More/Less Button */}
              {description.fullDescription && description.fullDescription.length > 500 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-4 inline-flex items-center text-[#fbae17] hover:text-[#fbae17]/80 font-medium transition-colors"
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
        )}

        {/* Game Resources Section with Tabs */}
        {(rules?.rulesText || game?.videoUrl || game?.pdfUrl || game?.pdfFile) && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Tab Headers */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-8 pt-6" aria-label="Tabs">
                {rules?.rulesText && (
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'rules'
                        ? 'border-[#fbae17] text-[#fbae17]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Game Rules
                  </button>
                )}
                
                {game?.videoUrl && (
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'video'
                        ? 'border-[#fbae17] text-[#fbae17]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Video Tutorial
                  </button>
                )}
                
                {(game?.pdfUrl || game?.pdfFile) && (
                  <button
                    onClick={() => setActiveTab('pdf')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'pdf'
                        ? 'border-[#fbae17] text-[#fbae17]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    PDF
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'rules' && rules?.rulesText && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-[#fbae17]" />
                    Game Rules
                  </h2>
                  <div className="prose max-w-none">
                    <div className="text-gray-700 leading-relaxed">
                      {renderRulesWithImages(cleanHtmlEntities(rules.rulesText))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'video' && game?.videoUrl && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Play className="w-6 h-6 mr-2 text-[#fbae17]" />
                    Video Tutorials
                  </h2>
                  <VideoLinks 
                    videoUrls={game.videoUrl} 
                    gameName={game.nameEn}
                  />
                </div>
              )}

              {activeTab === 'pdf' && (game?.pdfUrl || game?.pdfFile) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Download className="w-6 h-6 mr-2 text-[#fbae17]" />
                    PDF Rules
                  </h2>
                  
                  {/* Simple PDF Open Button */}
                  {game.pdfUrl && (
                    <div className="mb-6">
                      <a
                        href={game.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-[#fbae17] text-white rounded-lg font-medium hover:bg-[#e09915] transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Open PDF Rules
                      </a>
                      <p className="text-sm text-gray-600 mt-2">
                        Click to open the PDF rules in a new tab
                      </p>
                    </div>
                  )}
                  
                  <PDFHandler 
                    pdfUrl={game.pdfUrl}
                    pdfFile={game.pdfFile}
                    gameName={game.nameEn}
                    gameId={game.id}
                    isAdmin={false}
                  />
                </div>
              )}

              {/* No content available message */}
              {activeTab === 'rules' && !rules?.rulesText && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rules Available</h3>
                  <p className="text-gray-600">Game rules are not yet available for this game.</p>
                </div>
              )}

              {activeTab === 'video' && !game?.videoUrl && (
                <div className="text-center py-12">
                  <Play className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Video Tutorial Available</h3>
                  <p className="text-gray-600">Video tutorial is not yet available for this game.</p>
                </div>
              )}

              {activeTab === 'pdf' && !game?.pdfUrl && !game?.pdfFile && (
                <div className="text-center py-12">
                  <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDF Available</h3>
                  <p className="text-gray-600">PDF rules are not yet available for this game.</p>
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
