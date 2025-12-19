'use client';

import { useEffect, useRef } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
  }: ConfirmationDialogProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const mousedownStartedInsideRef = useRef(false);

  // Handle escape key and scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      lockBodyScroll();
      document.addEventListener('keydown', handleEscape);
    } else {
      unlockBodyScroll();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          icon: 'text-yellow-600',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          iconBg: 'bg-yellow-100'
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          icon: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconBg: 'bg-red-100'
        };
    }
  };

  const styles = getTypeStyles();

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if mousedown started outside the modal content
    if (!mousedownStartedInsideRef.current) {
      onClose();
    }
    // Reset the ref for next interaction
    mousedownStartedInsideRef.current = false;
  };

  const handleModalContentMouseDown = (e: React.MouseEvent) => {
    // Mark that mousedown started inside the modal
    mousedownStartedInsideRef.current = true;
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Reset after click completes
    mousedownStartedInsideRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
        onMouseDown={(e) => {
          // If mousedown is on backdrop, mark that it didn't start inside
          if (e.target === e.currentTarget) {
            mousedownStartedInsideRef.current = false;
          }
        }}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalContentRef}
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto transform transition-all"
          onMouseDown={handleModalContentMouseDown}
          onClick={handleModalContentClick}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg} mb-4`}>
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {title}
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-600 text-center mb-6">
              {message}
            </p>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${styles.confirmButton}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
