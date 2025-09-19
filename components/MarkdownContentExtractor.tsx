'use client';

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Copy, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface MarkdownContentExtractorProps {
  onContentExtracted: (content: string, images: { name: string; data: string; type: string }[]) => void;
  onClose: () => void;
}

function MarkdownContentExtractor({ onContentExtracted, onClose }: MarkdownContentExtractorProps) {
  const [inputMarkdown, setInputMarkdown] = useState('');
  const [extractedImages, setExtractedImages] = useState<{ name: string; data: string; type: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewContent, setPreviewContent] = useState('');

  const processMarkdown = async () => {
    if (!inputMarkdown.trim()) {
      setError('Please paste some Markdown content first.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Extract image URLs from markdown and replace them with base64
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const images: { name: string; data: string; type: string }[] = [];
      let processedContent = inputMarkdown;
      let imageIndex = 0;

      // Find all image matches
      const imageMatches = [];
      let match;
      while ((match = imageRegex.exec(inputMarkdown)) !== null) {
        imageMatches.push(match);
      }

      // Process each image and replace in content
      for (const imageMatch of imageMatches) {
        const [, altText, imageUrl] = imageMatch;
        console.log('Processing image:', imageUrl);
        
        try {
          // Use our API endpoint to fetch the image (bypasses CORS)
          const response = await fetch('/api/fetch-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl })
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
          }

          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch image');
          }

          const imageData = {
            name: altText || `image-${imageIndex + 1}`,
            data: result.dataUrl,
            type: result.contentType
          };
          
          images.push(imageData);
          
          // Replace this specific image in the content
          const base64Markdown = `![${altText}](${result.dataUrl})`;
          console.log('Replacing:', imageMatch[0], 'with:', base64Markdown.substring(0, 50) + '...');
          processedContent = processedContent.replace(imageMatch[0], base64Markdown);
          console.log('Content after replacement:', processedContent.substring(0, 200) + '...');
          
          imageIndex++;
        } catch (err) {
          console.error(`Failed to process image ${imageUrl}:`, err);
        }
      }

      // Convert markdown formatting to HTML for better display
      processedContent = processedContent
        .replace(/^## (.+)$/gm, '<h2>$1</h2>') // Convert ## headers to h2
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Convert **bold** to <strong>
        .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Convert *italic* to <em>
        .replace(/_([^_]+)_/g, '<em>$1</em>') // Convert _italic_ to <em>
        .replace(/^\- (.+)$/gm, '• $1') // Convert - list items to bullet points
        .replace(/^  (.+)$/gm, '  $1') // Preserve indentation
        .replace(/^  $/gm, '') // Remove empty lines with spaces
        .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines to double
        .trim();

      setExtractedImages(images);
      setPreviewContent(processedContent);
      setSuccess(`✅ Successfully processed ${images.length} image(s) and converted Markdown!`);
    } catch (err) {
      setError('Error processing Markdown content. Please try again.');
      console.error('Error processing markdown:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = async (event: React.ClipboardEvent) => {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    const textContent = clipboardData.getData('text/plain');
    
    if (textContent) {
      setInputMarkdown(textContent);
      setSuccess('✅ Markdown content pasted! Click "Process Markdown" to extract images and convert format.');
    }
  };

  const useProcessedContent = () => {
    onContentExtracted(previewContent, extractedImages);
    onClose();
  };

  const removeImage = (index: number) => {
    setExtractedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Markdown Content Extractor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            <strong>Paste your Markdown content here:</strong> This tool will extract images from Markdown format and convert it to work perfectly with King Dice.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markdown Content (from "Copy as Markdown" extension)
            </label>
            <textarea
              value={inputMarkdown}
              onChange={(e) => setInputMarkdown(e.target.value)}
              onPaste={handlePaste}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Paste your Markdown content here (from Copy as Markdown extension)..."
            />
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={processMarkdown}
              disabled={isProcessing || !inputMarkdown.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Process Markdown
                </>
              )}
            </button>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              Processing Markdown and extracting images...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}
        </div>

        {extractedImages.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Extracted Images ({extractedImages.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
              {extractedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.data}
                    alt={image.name}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">{image.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {previewContent && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Processed Content Preview
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{previewContent}</pre>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          {previewContent && (
            <button
              onClick={useProcessedContent}
              className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-yellow-600"
            >
              Use Processed Content ({extractedImages.length} images)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarkdownContentExtractor;
