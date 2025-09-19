'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { ModerationResult } from '@/lib/moderation';

interface ModerationAlertProps {
  result: ModerationResult;
  onDismiss?: () => void;
  showDetails?: boolean;
  type?: 'approved' | 'rejected';
}

export default function ModerationAlert({ result, onDismiss, showDetails = false, type }: ModerationAlertProps) {
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  
  // Use type prop if provided, otherwise determine from result
  const isApproved = type === 'approved' || (type === undefined && result.isAppropriate);

  // Auto-dismiss after 5 seconds for both approved and rejected content
  useEffect(() => {
    if (onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [onDismiss]);

  if (isApproved) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-50 border border-green-200 rounded-md p-3 max-w-md mx-auto shadow-lg z-50">
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          <div className="flex-1">
            <h4 className="text-xs font-medium text-green-800">
              Content Approved
            </h4>
            <p className="text-xs text-green-700 mt-0.5">
              Your content has been reviewed and is appropriate for the community.
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-green-600 hover:text-green-800 ml-2"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-md p-3 max-w-md mx-auto shadow-lg z-50">
      <div className="flex items-center">
        <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
        <div className="flex-1">
          <h4 className="text-xs font-medium text-red-800">
            Content Rejected
          </h4>
          <p className="text-xs text-red-700 mt-0.5">
            {result.reason || 'Your content does not comply with community guidelines.'}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 ml-2"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function getFlagDescription(flag: string): string {
  const descriptions: Record<string, string> = {
    'inappropriate_content': 'Inappropriate content',
    'spam': 'Spam content detected',
    'invalid_file_type': 'Invalid file type',
    'hate_speech': 'Hate speech',
    'violence': 'Violent content',
    'nsfw': 'Adult content',
    'weapons': 'Weapon content',
  };

  return descriptions[flag] || flag;
} 