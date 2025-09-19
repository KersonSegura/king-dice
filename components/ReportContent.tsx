'use client';

import { useState } from 'react';
import { Flag, AlertTriangle, X } from 'lucide-react';
import { REPORT_REASONS, Report } from '@/lib/moderation';

interface ReportContentProps {
  contentType: Report['contentType'];
  contentId: string;
  onReport: (report: Omit<Report, 'id' | 'createdAt' | 'status'>) => void;
  onClose: () => void;
}

export default function ReportContent({ contentType, contentId, onReport, onClose }: ReportContentProps) {
  const [reason, setReason] = useState<Report['reason']>('inappropriate');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert('Please describe the problem.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the report object
      const report: Omit<Report, 'id' | 'createdAt' | 'status'> = {
        contentType,
        contentId,
        reporterId: 'current-user-id', // Get from auth context
        reason,
        description: description.trim(),
      };

      // Send report to API
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const result = await response.json();
      
      if (result.success) {
        // Call the onReport callback for UI updates
        await onReport(report);
        
        // Show success message
        alert('Report submitted successfully! An email has been sent to our moderation team. Thank you for helping keep the community safe.');
        onClose();
      } else {
        throw new Error(result.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Flag className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Report Content
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
            <p className="text-sm text-yellow-700">
              Only report content that actually violates community guidelines.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as Report['reason'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(REPORT_REASONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Problem Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe specifically what problem this content has..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 