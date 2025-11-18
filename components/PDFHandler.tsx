'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, FileText, AlertCircle, Upload } from 'lucide-react';

interface PDFHandlerProps {
  pdfUrl?: string;
  pdfFile?: string;
  gameName: string;
  gameId: number;
  isAdmin?: boolean;
  onPDFUploaded?: () => void;
}

export default function PDFHandler({ pdfUrl, pdfFile, gameName, gameId, isAdmin = false, onPDFUploaded }: PDFHandlerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePDFClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // If we have a local PDF file, serve it from our API
      if (pdfFile) {
        window.open(`/api/games/${gameId}/pdf`, '_blank');
      } else if (pdfUrl) {
        // Remove chrome-extension wrapper if present
        let cleanPdfUrl = pdfUrl;
        if (pdfUrl.includes('chrome-extension://')) {
          const urlMatch = pdfUrl.match(/chrome-extension:\/\/[^/]+\/(https?:\/\/.+)/);
          if (urlMatch && urlMatch[1]) {
            cleanPdfUrl = urlMatch[1];
          } else {
            const fallbackMatch = pdfUrl.match(/chrome-extension:\/\/[^/]+\/(.+)/);
            if (fallbackMatch && fallbackMatch[1]) {
              cleanPdfUrl = fallbackMatch[1];
            }
          }
        }
        
        // Open the PDF URL directly
        window.open(cleanPdfUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError('No PDF available.');
      }
    } catch (err) {
      setError('Unable to open PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (pdfFile) {
        // Download from our API
        const link = document.createElement('a');
        link.href = `/api/games/${gameId}/pdf`;
        link.download = `${gameName}-rules.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (pdfUrl) {
        // Remove chrome-extension wrapper if present
        let cleanPdfUrl = pdfUrl;
        if (pdfUrl.includes('chrome-extension://')) {
          const urlMatch = pdfUrl.match(/chrome-extension:\/\/[^/]+\/(https?:\/\/.+)/);
          if (urlMatch && urlMatch[1]) {
            cleanPdfUrl = urlMatch[1];
          } else {
            const fallbackMatch = pdfUrl.match(/chrome-extension:\/\/[^/]+\/(.+)/);
            if (fallbackMatch && fallbackMatch[1]) {
              cleanPdfUrl = fallbackMatch[1];
            }
          }
        }
        
        // Download the PDF directly
        const link = document.createElement('a');
        link.href = cleanPdfUrl;
        link.download = `${gameName}-rules.pdf`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError('No PDF available.');
      }
    } catch (err) {
      setError('Unable to download PDF. Please try the direct link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }

    // Check if we're in production (Vercel) or local
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
    const maxFileSize = isProduction ? 3 * 1024 * 1024 : 15 * 1024 * 1024; // 3MB on Vercel, 15MB locally
    
    if (file.size > maxFileSize) {
      const maxSizeMB = isProduction ? 3 : 15;
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${fileSizeMB}MB) is too large. Maximum allowed is ${maxSizeMB}MB. Please use a PDF URL for larger files.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`/api/games/${gameId}/pdf`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setError(null);
        if (onPDFUploaded) {
          onPDFUploaded();
        }
      } else {
        // Handle error response - might not be JSON
        const textResponse = await response.text();
        let errorMessage = 'Failed to upload PDF';
        
        // Check status code first
        if (response.status === 413 || textResponse.includes('Request Entity Too Large')) {
          errorMessage = 'File is too large. Maximum allowed is 3MB.';
        } else {
          // Try to parse as JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = JSON.parse(textResponse);
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              // If JSON parsing fails, use text response
              if (textResponse.trim().length > 0) {
                errorMessage = textResponse.substring(0, 200);
              }
            }
          } else if (textResponse.trim().length > 0) {
            errorMessage = textResponse.substring(0, 200);
          }
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to upload PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const hasPDF = pdfFile || pdfUrl;
  const isLocalPDF = !!pdfFile; // We have a local PDF file
  const isExternalLink = !!pdfUrl && !pdfFile; // We only have an external URL

  return (
    <div className="mt-3 w-full" style={{ width: '100%', minWidth: '100%' }}>
      {/* PDF Upload Button (Admin only) */}
      {isAdmin && !pdfFile && (
        <div className="flex justify-center mb-4">
          <div className="flex flex-col items-center">
            <label className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">Max 15MB locally, 3MB on production</p>
          </div>
        </div>
      )}

      {/* PDF Content */}
      {hasPDF && (
        <div className="space-y-4 w-full">
          {/* For External Links - Only Open Button */}
          {isExternalLink && (
            <>
              <div className="flex justify-center">
                <button
                  onClick={handlePDFClick}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg text-sm font-medium hover:bg-[#e09915] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {isLoading ? 'Opening...' : 'Open PDF Rules'}
                </button>
              </div>
              
              <p className="text-center text-sm text-gray-600">
                Click to open the PDF rules in a new tab.
              </p>

              {/* External Link Info */}
              <div className="w-full bg-gray-50 rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Rules Available</h3>
                <p className="text-gray-600 mb-4">
                  The rules are available as an external PDF. Click the button above to open them.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• <strong>Open PDF Rules:</strong> Opens the PDF in a new tab</p>
                  <p>• <strong>External Link:</strong> You'll be redirected to the PDF source</p>
                </div>
              </div>
            </>
          )}

          {/* For Local PDFs - Open + Download Buttons */}
          {isLocalPDF && (
            <>
              <div className="flex justify-center">
                <button
                  onClick={handlePDFClick}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg text-sm font-medium hover:bg-[#e09915] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {isLoading ? 'Opening...' : 'Open PDF Rules'}
                </button>
              </div>
              
              <p className="text-center text-sm text-gray-600">
                Click to open the PDF rules in a new tab.
              </p>

              <div className="flex justify-center">
                <button
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg text-sm font-medium hover:bg-[#e09915] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              </div>

              {/* PDF Embed - Only for local PDFs */}
              <div className="w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg" style={{ height: '600px' }}>
                <iframe
                  src={`/api/games/${gameId}/pdf`}
                  title={`${gameName} - PDF Rules`}
                  className="w-full h-full border-0"
                  style={{ minHeight: '600px' }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
