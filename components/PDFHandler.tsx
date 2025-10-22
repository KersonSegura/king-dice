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
        // Fallback to external URL
        if (pdfUrl.toLowerCase().endsWith('.pdf')) {
          const newWindow = window.open();
          if (newWindow) {
            newWindow.location.href = pdfUrl;
          }
        } else {
          window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      setError('Unable to open PDF. Please try downloading it manually.');
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
        // Fallback to external URL
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${gameName}-rules.pdf`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    if (file.size > 11 * 1024 * 1024) {
      setError('File size must be less than 11MB.');
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
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload PDF');
      }
    } catch (err) {
      setError('Failed to upload PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const hasPDF = pdfFile || pdfUrl;

  return (
    <div className="mt-3">
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
            <p className="text-xs text-gray-500 mt-1">Max 11MB</p>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      {hasPDF && (
        <div className="space-y-4">
          {/* Download Button */}
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

          {/* PDF Embed */}
          <div className="w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg" style={{ height: '600px' }}>
            <iframe
              src={pdfFile ? `/api/games/${gameId}/pdf` : pdfUrl}
              title={`${gameName} - PDF Rules`}
              className="w-full h-full border-0"
              style={{ minHeight: '600px' }}
            />
          </div>
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
