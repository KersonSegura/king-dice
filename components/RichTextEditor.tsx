'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Image as ImageIcon, X, Upload, FileText } from 'lucide-react';
import MarkdownContentExtractor from './MarkdownContentExtractor';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImagesChange?: (images: ImageData[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

interface ImageData {
  id: string;
  src: string;
  alt: string;
}

export interface RichTextEditorRef {
  getBase64Content: () => string;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ 
  value, 
  onChange, 
  onImagesChange,
  placeholder = "Write your content here... (Ctrl+V to paste images)",
  rows = 6,
  className = ""
}, ref) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showMarkdownExtractor, setShowMarkdownExtractor] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScrollingSyncRef = useRef(false);

  // Parse existing content to extract images and convert to placeholders
  useEffect(() => {
    if (value && !hasInitialized) {
      // Check for file references first, then base64
      const fileMatches = value.match(/!\[([^\]]*)\]\(\/uploads\/rules-images\/[^)]+\)/g);
      const base64Matches = value.match(/!\[([^\]]*)\]\(data:image\/[^)]+\)/g);
      
      if (fileMatches || base64Matches) {
        const matches = fileMatches || base64Matches || [];
        const extractedImages: ImageData[] = matches.map((match, index) => {
          const altMatch = match.match(/!\[([^\]]*)\]/);
          const srcMatch = match.match(/\([^)]+\)/);
          return {
            id: `img-${Date.now()}-${index}`, // Use timestamp to ensure unique IDs
            alt: altMatch ? altMatch[1] : 'Pasted Image',
            src: srcMatch ? srcMatch[0].slice(1, -1) : ''
          };
        });
        setImages(extractedImages);
        
        // Convert images back to placeholders in the content
        let cleanContent = value;
        extractedImages.forEach((image, index) => {
          const originalMatch = matches[index];
          const placeholder = `[IMAGE:${image.id}]`;
          cleanContent = cleanContent.replace(originalMatch, placeholder);
        });
        
        // Update the content with placeholders if it changed
        if (cleanContent !== value) {
          onChange(cleanContent);
        }
      }
      setHasInitialized(true);
    }
  }, [value, onChange, hasInitialized]);

  // Notify parent when images change
  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(images);
    }
  }, [images, onImagesChange]);

  // Convert images to base64 markdown format
  const convertToBase64Markdown = (content: string, imageData: ImageData[]) => {
    let result = content;
    
    imageData.forEach(image => {
      const placeholder = `[IMAGE:${image.id}]`;
      const markdown = `![${image.alt}](${image.src})`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), markdown);
    });
    
    return result;
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getBase64Content: () => convertToBase64Markdown(value, images)
  }));

  const handleImagePaste = (imageData: string, imageType: string) => {
    const imageId = `img-${Date.now()}`;
    const newImage: ImageData = {
      id: imageId,
      src: imageData,
      alt: 'Pasted Image'
    };

    setImages(prev => [...prev, newImage]);

    // Insert image placeholder in textarea
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const imagePlaceholder = `[IMAGE:${imageId}]`;
      const newText = text.substring(0, start) + imagePlaceholder + text.substring(end);
      
      onChange(newText);
      
      // Update cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + imagePlaceholder.length, start + imagePlaceholder.length);
      }, 0);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(item.type)) {
          console.warn(`Image type ${item.type} not allowed`);
          return;
        }

        const file = item.getAsFile();
        if (!file) return;

        const maxImageSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxImageSize) {
          console.warn(`Image too large: ${file.size} bytes (max: ${maxImageSize})`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            handleImagePaste(result, item.type);
          }
        };
        reader.readAsDataURL(file);
        
        event.preventDefault();
        break;
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const maxImageSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxImageSize) {
      alert('Image too large. Please select an image smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        handleImagePaste(result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    
    // Remove image placeholder from text
    const newValue = value.replace(new RegExp(`\\[IMAGE:${imageId}\\]`, 'g'), '');
    onChange(newValue);
  };


  const handleMarkdownContentExtracted = (content: string, images: { name: string; data: string; type: string }[]) => {
    // Add images to our state
    const newImages: ImageData[] = images.map((imageData, index) => ({
      id: `img-${Date.now()}-${index}`,
      src: imageData.data,
      alt: imageData.name.replace(/\.[^/.]+$/, '')
    }));

    setImages(prev => [...prev, ...newImages]);

    // Convert image placeholders back to base64 markdown format
    let processedContent = content;
    newImages.forEach((image, index) => {
      const imageId = image.id;
      const base64Markdown = `![${image.alt}](${image.src})`;
      processedContent = processedContent.replace(`[IMAGE:${imageId}]`, base64Markdown);
    });

    // Replace the current content with the processed content
    onChange(processedContent);
  };

  const renderContent = () => {
    if (!value) return null;

    // Process the entire content to handle mixed HTML, markdown, and images
    const processContentPart = (text: string): React.ReactNode[] => {
      if (!text) return [];

      // First, handle images by splitting and processing them
      const imageParts = text.split(/(\[IMAGE:[^\]]+\]|!\[.*?\]\(data:image\/[^)]+\))/g);
      
      return imageParts.map((part, partIndex) => {
        // Handle image placeholders
        const imageMatch = part.match(/\[IMAGE:([^\]]+)\]/);
        if (imageMatch) {
          const imageId = imageMatch[1];
          const image = images.find(img => img.id === imageId);
          
          if (image) {
            return (
              <div key={`img-${partIndex}`} className="relative inline-block group my-2">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="max-w-full h-auto rounded-lg shadow-sm max-h-64"
                />
                <button
                  onClick={() => removeImage(imageId)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          } else {
            return (
              <div key={`img-missing-${partIndex}`} className="bg-gray-200 rounded-lg p-2 my-2 text-center text-gray-500 text-sm">
                [Image not found: {imageId}]
              </div>
            );
          }
        }
        
        // Handle base64 images
        const base64ImageMatch = part.match(/!\[(.*?)\]\((data:image\/[^)]+)\)/);
        if (base64ImageMatch) {
          const [, altText, imageData] = base64ImageMatch;
          return (
            <img
              key={`b64-${partIndex}`}
              src={imageData}
              alt={altText}
              className="max-w-full h-auto rounded-lg shadow-sm my-2 max-h-64"
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

        // Regular text line
        if (line.length > 0 || i < lines.length - 1) {
          processedLines.push(
            <span key={`text-${partIndex}-${i}`} className="whitespace-pre-wrap">
              {line + (i < lines.length - 1 ? '\n' : '')}
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
        {processContentPart(value)}
      </div>
    );
  };

  // Scroll synchronization functions
  const syncScrollTextareaToPreview = () => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    
    if (!textarea || !preview || isScrollingSyncRef.current) return;
    
    isScrollingSyncRef.current = true;
    
    // Calculate scroll percentage for textarea
    const textareaScrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
    
    // Apply same percentage to preview
    const previewMaxScroll = preview.scrollHeight - preview.clientHeight;
    preview.scrollTop = textareaScrollPercentage * previewMaxScroll;
    
    setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 10);
  };

  const syncScrollPreviewToTextarea = () => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    
    if (!textarea || !preview || isScrollingSyncRef.current) return;
    
    isScrollingSyncRef.current = true;
    
    // Calculate scroll percentage for preview
    const previewScrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    
    // Apply same percentage to textarea
    const textareaMaxScroll = textarea.scrollHeight - textarea.clientHeight;
    textarea.scrollTop = previewScrollPercentage * textareaMaxScroll;
    
    setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 10);
  };

  // Add paste and scroll event listeners
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    
    if (!textarea || !preview) return;

    // Add paste listener
    textarea.addEventListener('paste', handlePaste);
    
    // Add scroll listeners for synchronization
    textarea.addEventListener('scroll', syncScrollTextareaToPreview);
    preview.addEventListener('scroll', syncScrollPreviewToTextarea);
    
    return () => {
      textarea.removeEventListener('paste', handlePaste);
      textarea.removeEventListener('scroll', syncScrollTextareaToPreview);
      preview.removeEventListener('scroll', syncScrollPreviewToTextarea);
    };
  }, [value]); // Re-run when content changes to ensure sync works properly

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
        <button
          type="button"
          onClick={() => setShowMarkdownExtractor(true)}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Markdown
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Image
        </button>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ImageIcon className="w-4 h-4" />
          <span>Ctrl+V to paste images</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder={placeholder}
        />
      </div>

      {/* Preview */}
      {value && (
        <div className="border-t border-gray-200 pt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Preview:</h5>
          <div 
            ref={previewRef}
            className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto"
          >
            <div className="prose max-w-none text-sm">
              {renderContent()}
            </div>
          </div>
        </div>
      )}

      {/* Markdown Content Extractor Modal */}
      {showMarkdownExtractor && (
        <MarkdownContentExtractor
          onContentExtracted={handleMarkdownContentExtracted}
          onClose={() => setShowMarkdownExtractor(false)}
        />
      )}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
