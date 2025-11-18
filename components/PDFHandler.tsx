'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, FileText, AlertCircle, Upload } from 'lucide-react';
import { STORAGE_BUCKETS } from '@/lib/supabase';

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

    // Supabase Storage supports up to 50MB
    const maxFileSize = 50 * 1024 * 1024; // 50MB (Supabase Storage limit)
    
    if (file.size > maxFileSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${fileSizeMB}MB) is too large. Maximum allowed is 50MB.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Try direct client-side upload first (bypasses Vercel's body size limit)
      try {
        // Lazy import to avoid issues during page load
        const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser');
        const supabase = await getSupabaseBrowserClient();
        
        const timestamp = Date.now();
        const filename = `game-${gameId}-${timestamp}.pdf`;
        const filePath = `PDFs/${filename}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PDFS)
          .upload(filePath, file, {
            contentType: 'application/pdf',
            upsert: false, // Don't overwrite if exists
          });

        if (uploadError) {
          // If client-side upload fails (e.g., RLS policy), fall back to server-side
          throw new Error(`Client upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.PDFS)
          .getPublicUrl(uploadData.path);

        const publicUrl = urlData.publicUrl;

        // Update the game record with the PDF URL via API
        const updateResponse = await fetch(`/api/games/${gameId}/pdf`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfUrl: publicUrl })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({ error: 'Failed to update game record' }));
          throw new Error(errorData.error || 'Failed to update game record');
        }

        setError(null);
        if (onPDFUploaded) {
          onPDFUploaded();
        }
        return; // Success, exit early
      } catch (clientError) {
        // Fallback to server-side upload if client-side fails
        console.warn('Client-side upload failed, falling back to server-side:', clientError);
        
        // For files under 3MB, use server-side upload
        if (file.size <= 3 * 1024 * 1024) {
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
            return; // Success
          } else {
            const textResponse = await response.text();
            let errorMessage = 'Failed to upload PDF';
            
            if (response.status === 413 || textResponse.includes('Request Entity Too Large')) {
              errorMessage = 'File is too large. Maximum allowed is 3MB for server uploads.';
            } else {
              try {
                const errorData = JSON.parse(textResponse);
                errorMessage = errorData.error || errorMessage;
              } catch {
                errorMessage = textResponse.substring(0, 200) || errorMessage;
              }
            }
            throw new Error(errorMessage);
          }
        } else {
          // File too large for server-side, and client-side failed
          throw new Error('Upload failed. The PDFs bucket may not allow public uploads. Please configure RLS policies or use a PDF URL instead.');
        }
      }
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload PDF. Please try again.');
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
            <p className="text-xs text-gray-500 mt-1">Max 50MB</p>
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
