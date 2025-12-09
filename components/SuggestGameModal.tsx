'use client';

import React, { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Send } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  suggestedBy: string;
  userId?: string | null;
}

export default function SuggestGameModal({ 
  isOpen, 
  onClose, 
  gameName, 
  suggestedBy,
  userId 
}: SuggestGameModalProps) {
  const [isExpansion, setIsExpansion] = useState(false);
  const [isDifferentEdition, setIsDifferentEdition] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/suggest-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameName,
          suggestedBy,
          userId: userId || undefined,
          isExpansion,
          isDifferentEdition,
          additionalInfo: additionalInfo.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Game suggestion sent successfully! We\'ll review it soon.', 'success');
        onClose();
        // Reset form
        setIsExpansion(false);
        setIsDifferentEdition(false);
        setAdditionalInfo('');
      } else {
        showToast(data.error || 'Failed to send suggestion', 'error');
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      showToast('Failed to send suggestion. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <img
                src="/SuggestionIcon.svg"
                alt="Suggestion Icon"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Suggest a Game</h2>
              <p className="text-sm text-gray-600">Help us expand our collection!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Game Name Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Name
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-900 font-medium">{gameName}</p>
            </div>
          </div>

          {/* Suggested By Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggested By
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-900">{suggestedBy}</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isExpansion}
                onChange={(e) => setIsExpansion(e.target.checked)}
                className="w-4 h-4 text-[#fbae17] border-gray-300 rounded focus:ring-[#fbae17] focus:ring-2"
              />
              <span className="text-sm text-gray-700">It's an expansion</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDifferentEdition}
                onChange={(e) => setIsDifferentEdition(e.target.checked)}
                className="w-4 h-4 text-[#fbae17] border-gray-300 rounded focus:ring-[#fbae17] focus:ring-2"
              />
              <span className="text-sm text-gray-700">Is a different edition</span>
            </label>
          </div>

          {/* Additional Information */}
          <div>
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information (Optional)
            </label>
            <textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Any additional details about the game, publisher, year, or why you think it should be added..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-[#fbae17] transition-colors resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">What happens next?</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• We'll review your suggestion</li>
                  <li>• If approved, we'll add the game to our database</li>
                  <li>• You'll be notified when it's available</li>
                  <li>• Thank you for helping grow our community!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Suggestion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
