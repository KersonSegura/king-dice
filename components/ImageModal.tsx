'use client';

import React, { useState, useEffect, useRef } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, MessageCircle, Heart, Flag, Trash2, ChevronLeft, ChevronRight, Edit2, Check } from 'lucide-react';
import ExpandableText from './ExpandableText';
import ReportContent from './ReportContent';
import { useLocale, useTranslations } from 'next-intl';
import { renderFormattedText } from '@/utils/formatText';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string;
  };
  createdAt: string;
  isModerated: boolean;
  moderationResult?: {
    isAppropriate: boolean;
    flags: string[];
  };
  likes?: number;
  userLiked?: boolean;
  userLikes?: string[];
}

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  alt?: string;
  description?: string;
  author?: {
    name: string;
    avatar: string;
    title?: string | null;
  };
  createdAt?: string;
  category?: string;
  isFeatured?: boolean;
  onLike?: () => void;
  onDelete?: () => void;
  onReport?: (reason: string, details?: string) => Promise<void> | void;
  onEditDescription?: (newDescription: string) => Promise<void> | void;
  isLiked?: boolean;
  canDelete?: boolean;
  canReport?: boolean;
  canEdit?: boolean;
  likeCount?: number;
  imageId?: string;
  // Comment-related props
  comments?: Comment[];
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onReplyToComment?: (commentId: string, content: string) => void;
  onReportComment?: (commentId: string, reason: string, details?: string) => void;
  currentUserId?: string;
  isAuthenticated?: boolean;
  currentUser?: any;
  onRefreshComments?: () => void;
  onRefreshActivity?: () => void;
  // Navigation props
  allImages?: any[];
  currentImageIndex?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  // Optional secondary action (e.g. "View collection" for collection photos)
  secondaryAction?: { label: string; href: string };
}

export default function ImageModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title, 
  alt,
  description, 
  author,
  createdAt,
  category,
  isFeatured,
  onLike,
  onDelete,
  onReport,
  onEditDescription,
  isLiked,
  canDelete,
  canReport,
  canEdit,
  likeCount,
  imageId,
  comments = [],
  onAddComment,
  onDeleteComment,
  onLikeComment,
  onReplyToComment,
  onReportComment,
  currentUserId,
  isAuthenticated = false,
  currentUser,
  onRefreshComments,
  onRefreshActivity,
  allImages = [],
  currentImageIndex = 0,
  onNavigate,
  secondaryAction
}: ImageModalProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showImageDeleteConfirm, setShowImageDeleteConfirm] = useState(false);
  const [showImageReportModal, setShowImageReportModal] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showAllCommentsMobile, setShowAllCommentsMobile] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(description || '');
  
  // Swipe down to close gesture state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Translation hooks - must be called unconditionally
  // Wrap in try-catch at usage sites if needed, but hooks must be called
  const t = useTranslations('home');
  const tGallery = useTranslations('gallery');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      setEditedDescription(description || '');
      setIsEditingDescription(false);
    } else {
      unlockBodyScroll();
    }

    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen, description]);

  const formatUserTitle = (rawTitle?: string | null) => {
    if (!rawTitle) return '';
    const extracted = rawTitle.includes('/dice/Titles/')
      ? (rawTitle.split('/').pop() || '').replace('.svg', '')
      : rawTitle;
    const key = extracted
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    try {
      return tCommon(`titles.${key}` as any);
    } catch {
      return extracted;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !onNavigate || !allImages.length) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onNavigate('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNavigate('next');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onNavigate, onClose, allImages.length]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment || isSubmittingComment) return;
    
    setIsSubmittingComment(true);
    
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
      if (onRefreshComments) {
        onRefreshComments();
      }
      if (onRefreshActivity) {
        onRefreshActivity();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    
    try {
      await onDeleteComment(commentId);
      if (onRefreshComments) {
        onRefreshComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const confirmDeleteComment = async () => {
    if (commentToDelete) {
      await handleDeleteComment(commentToDelete);
      setCommentToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const requestDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!onLikeComment) return;
    
    try {
      await onLikeComment(commentId);
        if (onRefreshComments) {
          onRefreshComments();
      }
      if (onRefreshActivity) {
        onRefreshActivity();
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReplyToComment = async (commentId: string, content: string) => {
    if (!onReplyToComment || isSubmittingReply) return;
    
    setIsSubmittingReply(true);
    
    try {
      await onReplyToComment(commentId, content);
      setReplyingTo(null);
      setReplyContent('');
      if (onRefreshComments) {
        onRefreshComments();
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReplySubmit = () => {
    if (replyingTo && replyContent.trim()) {
      handleReplyToComment(replyingTo, replyContent.trim());
    }
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const [showReportModal, setShowReportModal] = useState(false);
  const [commentToReport, setCommentToReport] = useState<string | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const mousedownStartedInsideRef = useRef(false);

  const handleReportComment = (commentId: string) => {
    setCommentToReport(commentId);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (report: { reason: string; description: string }) => {
    if (!onReportComment || !commentToReport) return;
    
    try {
      await onReportComment(commentToReport, report.reason, report.description);
      setShowReportModal(false);
      setCommentToReport(null);
    } catch (error) {
      console.error('Error reporting comment:', error);
    }
  };

  const handleImageDelete = () => {
    setShowImageDeleteConfirm(true);
  };

  const confirmImageDelete = async () => {
    if (onDelete) {
      try {
        await onDelete();
        setShowImageDeleteConfirm(false);
        // Don't close the main modal - let the parent handle it
      } catch (error) {
        console.error('Error deleting image:', error);
        // Keep the confirmation dialog open on error
      }
    }
  };

  const handleImageReport = () => {
    setShowImageReportModal(true);
  };

  const handleImageReportSubmit = async (report: { reason: string; description: string }) => {
    if (onReport) {
      try {
        await onReport(report.reason, report.description);
        setShowImageReportModal(false);
        // Don't close the main modal - let the parent handle it
      } catch (error) {
        console.error('Error reporting image:', error);
        // Keep the report modal open on error
      }
    }
  };

  const handleEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (onEditDescription && editedDescription.trim() !== description) {
      try {
        await onEditDescription(editedDescription.trim());
        setIsEditingDescription(false);
      } catch (error) {
        console.error('Error updating description:', error);
      }
    } else {
      setIsEditingDescription(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedDescription(description || '');
    setIsEditingDescription(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    // If backend returns a timestamp without timezone, treat it as UTC to avoid "in X seconds" bugs
    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(dateString);
    const normalized = hasTimezone ? dateString : `${dateString}Z`;
    const date = new Date(normalized);
    const now = new Date();

    if (Number.isNaN(date.getTime())) return '';

    // Treat future timestamps as "just now" (clock skew / server timing)
    let diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) diffMs = 0;

    // Bucketed, not overly specific:
    // <5m -> just now
    // 5/10/15/30m -> minutes
    // then hours, days, weeks, months, years
    const rtf = new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto' });
    const minutes = Math.floor(diffMs / (60 * 1000));

    if (minutes < 5) return tCommon('justNow');
    if (minutes < 10) return rtf.format(-5, 'minute');
    if (minutes < 15) return rtf.format(-10, 'minute');
    if (minutes < 30) return rtf.format(-15, 'minute');
    if (minutes < 60) return rtf.format(-30, 'minute');

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');

    const days = Math.floor(hours / 24);
    if (days < 7) return rtf.format(-days, 'day');

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return rtf.format(-weeks, 'week');

    const months = Math.floor(days / 30);
    if (months < 12) return rtf.format(-months, 'month');

    const years = Math.max(1, Math.floor(days / 365));
    return rtf.format(-years, 'year');
  };

  if (!isOpen) return null;

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

  // Touch handlers for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow dragging from the top area (header or image area)
    // Don't allow dragging if starting from comments section
    const target = e.target as HTMLElement;
    const isCommentsArea = target.closest('.comments-section') || 
                          target.closest('textarea') ||
                          target.closest('button');
    
    if (isCommentsArea) {
      return; // Don't interfere with comments interaction
    }
    
    const isDraggableArea = target.closest('.drag-handle') || 
                           target.closest('img') || 
                           (target.closest('.sm\\:hidden') && 
                            !target.closest('.comments-section')); // Mobile layout container but not comments
    
    if (isDraggableArea) {
      setIsDragging(true);
      const touchY = e.touches[0].clientY;
      setStartY(touchY);
      setStartTime(Date.now());
      setDragY(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      setDragY(deltaY);
      // Prevent scrolling while dragging
      e.preventDefault();
    } else {
      // If dragging up, reset
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 150; // Minimum drag distance to close
    const dragDuration = Date.now() - startTime;
    const velocity = dragY / Math.max(dragDuration, 1); // pixels per ms
    
    // Close if dragged down enough or if velocity is high (swipe gesture)
    if (dragY > threshold || (dragY > 50 && velocity > 0.5)) {
      onClose();
    } else {
      // Animate back to original position
      setIsDragging(false);
      setDragY(0);
      setStartY(0);
      setStartTime(0);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-stretch sm:items-center justify-center z-[100] p-0 sm:p-4 overscroll-none touch-none"
      style={{ 
        pointerEvents: 'auto',
        opacity: isDragging ? Math.max(0.3, 1 - dragY / 400) : 1,
        transition: isDragging ? 'none' : 'opacity 0.3s ease-out'
      }}
      onClick={handleBackdropClick}
      onMouseDown={(e) => {
        // If mousedown is on backdrop, mark that it didn't start inside
        if (e.target === e.currentTarget) {
          mousedownStartedInsideRef.current = false;
        }
      }}
    >
      <div 
        ref={modalContentRef}
        className="bg-white w-full h-full rounded-none sm:rounded-lg sm:max-w-6xl sm:max-h-[90vh] overflow-hidden flex flex-col sm:flex-row touch-none"
        data-scroll-lock-root
        style={{ pointerEvents: 'auto' }}
        onMouseDown={handleModalContentMouseDown}
        onClick={handleModalContentClick}
      >
        {/* Mobile Layout - Instagram Style */}
        <div 
          className="sm:hidden flex flex-col h-full drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: isDragging ? `translateY(${dragY}px)` : 'translateY(0)',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            opacity: isDragging ? Math.max(0.7, 1 - dragY / 600) : 1,
          }}
        >
          {/* Drag indicator bar at top */}
          <div className="w-12 h-1 bg-gray-400 rounded-full mx-auto mt-2 mb-1 drag-handle" />
          
          {/* Header with Avatar, User, Date, and Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 drag-handle">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                style={{
                  backgroundImage: author?.avatar ? `url(${author.avatar})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: author?.avatar ? undefined : '#d1d5db'
                }}
              />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {author?.name || tCommon('unknownUser')}
                  {author?.title ? (
                    <span className="font-normal text-gray-500 text-xs ml-1">
                      • {formatUserTitle(author.title)}
                    </span>
                  ) : null}
                </h3>
                <p className="text-xs text-gray-500">{createdAt ? formatRelativeTime(createdAt) : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body (Instagram-like full screen) */}
          <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y">
            {/* Image - Full Width */}
            <div className="w-full bg-gray-100 flex items-center justify-center relative group h-[55dvh] max-h-[70dvh] touch-none drag-handle">
              {/* Navigation Arrows */}
              {onNavigate && allImages.length > 1 && (
                <>
                  {/* Previous Arrow */}
                  {currentImageIndex > 0 && (
                    <button
                      onClick={() => onNavigate('prev')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 group-hover:bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  
                  {/* Next Arrow */}
                  {currentImageIndex < allImages.length - 1 && (
                    <button
                      onClick={() => onNavigate('next')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 group-hover:bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </>
              )}
              
              <img
                src={imageUrl}
                alt={alt || title || 'Gallery image'}
                className="w-full h-full object-contain"
                style={{ display: 'block' }}
              />
            </div>

            {/* Actions and Comments - Below Image */}
            <div className="flex flex-col border-t border-gray-200">
            {/* Actions Row */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {onLike && (
                    <button
                      onClick={onLike}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        isLiked 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{likeCount || 0}</span>
                    </button>
                  )}
                  {secondaryAction && (
                    <button
                      type="button"
                      onClick={() => { window.location.href = secondaryAction!.href; }}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-[#fbae17] text-white font-semibold hover:bg-[#e0990e] transition-colors"
                    >
                      {secondaryAction.label}
                    </button>
                  )}
                  
                  {/* Featured Badge */}
                  {isFeatured && (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#fbae17] text-white flex items-center gap-1 shadow-sm">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7 0l1.4-5.9L12 14l2.9-3.9L16.3 16H7.7z"/>
                      </svg>
                      {category === 'the-kings-card' ? t('cardOfTheWeek') : t('diceOfTheWeek')}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {canDelete && onDelete && (
                    <button
                      onClick={handleImageDelete}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title={tCommon('delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  {canReport && onReport && (
                    <button
                      onClick={handleImageReport}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title={tGallery('reportImage')}
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {(description || isEditingDescription) && (
                <div className="mb-4">
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                        rows={3}
                        placeholder={tGallery('writeDescription')}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {tCommon('cancel')}
                        </button>
                        <button
                          onClick={handleSaveDescription}
                          className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          {tCommon('save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <p className="text-gray-700 text-sm pr-8">
                        {renderFormattedText(description || '')}
                      </p>
                      {canEdit && onEditDescription && (
                        <button
                          onClick={handleEditDescription}
                          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={tGallery('editDescription')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 p-4 comments-section">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {tGallery('comments')} ({comments.reduce((total, comment) => total + 1 + ((comment as any).replies ? (comment as any).replies.length : 0), 0)})
              </h3>
              
              {/* Add Comment Form */}
              {isAuthenticated && onAddComment && (
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                      style={{
                        backgroundImage: currentUser?.avatar ? `url(${currentUser.avatar})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: currentUser?.avatar ? undefined : '#d1d5db'
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 border border-gray-300 rounded-full bg-white px-3 py-2 focus-within:border-blue-500 transition-colors">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={tGallery('writeComment')}
                          className="flex-1 bg-transparent outline-none resize-none text-sm overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                          rows={1}
                          style={{ minHeight: '24px', maxHeight: '80px' }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                          }}
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="min-h-0 min-w-0 p-1 bg-transparent text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors self-center"
                          aria-label="Send"
                        >
                          <svg className="w-4 h-4 -mt-[2px]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments List - Compact for Mobile */}
              <div className="space-y-3">
                {(showAllCommentsMobile ? comments : comments.slice(0, 5)).map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {/* Main Comment */}
                    <div className="flex space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                        style={{
                          backgroundImage: comment.author.avatar ? `url(${comment.author.avatar})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          backgroundColor: comment.author.avatar ? undefined : '#d1d5db'
                        }}
                      />
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-semibold text-gray-900 text-xs truncate">{comment.author.name}</span>
                              {comment.author.title && (
                                <span className="text-gray-500 text-xs truncate">
                                  • {formatUserTitle(comment.author.title)}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500 text-xs whitespace-nowrap">{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 text-xs">{renderFormattedText(comment.content)}</p>

                          {/* Comment actions (mobile) */}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isAuthenticated && onLikeComment && (
                                <button
                                  onClick={() => handleLikeComment(comment.id)}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                                    comment.userLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${comment.userLiked ? 'fill-current' : ''}`} />
                                  <span>{comment.likes || 0}</span>
                                </button>
                              )}

                              {isAuthenticated && onReplyToComment && (
                                <button
                                  onClick={() => {
                                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                    setReplyContent('');
                                  }}
                                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-500 transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{replyingTo === comment.id ? tCommon('cancel') : tGallery('reply')}</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {currentUserId === comment.author.id && onDeleteComment && (
                                <button
                                  onClick={() => requestDeleteComment(comment.id)}
                                  className="text-gray-500 hover:text-red-500 p-1"
                                  title={tGallery('deleteComment')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}

                              {isAuthenticated && onReportComment && (
                                <button
                                  onClick={() => handleReportComment(comment.id)}
                                  className="text-gray-500 hover:text-red-500 p-1"
                                  title={tGallery('reportComment')}
                                >
                                  <Flag className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reply input (mobile) */}
                        {replyingTo === comment.id && (
                          <div className="mt-2 ml-8">
                            <div className="flex items-center gap-2 border border-gray-300 rounded-full bg-white px-3 py-2 focus-within:border-blue-500 transition-colors">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={tGallery('writeReply')}
                                className="flex-1 bg-transparent outline-none resize-none text-xs overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                rows={1}
                                style={{ minHeight: '20px', maxHeight: '80px' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              <button
                                onClick={handleReplySubmit}
                                disabled={!replyContent.trim() || isSubmittingReply}
                                className="min-h-0 min-w-0 p-1 bg-transparent text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors self-center"
                                aria-label="Send reply"
                              >
                                <svg className="w-4 h-4 -mt-[2px]" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Replies (mobile) */}
                        {(comment as any).replies && (comment as any).replies.length > 0 && (
                          <div className="mt-2 ml-8 space-y-2">
                            {(comment as any).replies.map((reply: any) => (
                              <div key={reply.id} className="bg-gray-100 rounded-lg p-2">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="font-semibold text-gray-900 text-xs truncate">{reply.author?.name}</span>
                                    {reply.author?.title && (
                                      <span className="text-gray-500 text-xs truncate">
                                        • {formatUserTitle(reply.author.title)}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-gray-500 text-xs whitespace-nowrap">{formatRelativeTime(reply.createdAt)}</span>
                                </div>
                                <p className="text-gray-700 text-xs">{reply.content}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isAuthenticated && onLikeComment && (
                                      <button
                                        onClick={() => handleLikeComment(reply.id)}
                                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                                          reply.userLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                                        }`}
                                      >
                                        <Heart className={`w-3 h-3 ${reply.userLiked ? 'fill-current' : ''}`} />
                                        <span>{reply.likes || 0}</span>
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {currentUserId === reply.author?.id && onDeleteComment && (
                                      <button
                                        onClick={() => requestDeleteComment(reply.id)}
                                        className="text-gray-500 hover:text-red-500 p-1"
                                        title={tGallery('deleteReply')}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    {isAuthenticated && onReportComment && (
                                      <button
                                        onClick={() => handleReportComment(reply.id)}
                                        className="text-gray-500 hover:text-red-500 p-1"
                                        title={tGallery('reportReply')}
                                      >
                                        <Flag className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Show More Comments Button */}
                {!showAllCommentsMobile && comments.length > 5 && (
                  <button
                    onClick={() => setShowAllCommentsMobile(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 w-full text-left"
                  >
                    {tGallery('viewAllComments', { count: comments.length })}
                  </button>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Desktop Layout - Facebook Style */}
        <div className="hidden sm:flex w-full">
        {/* Left Side - Image */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center relative group min-h-[500px] aspect-square max-w-[576px] touch-none">
          {/* Navigation Arrows */}
          {onNavigate && allImages.length > 1 && (
            <>
              {/* Previous Arrow */}
              {currentImageIndex > 0 && (
                <button
                  onClick={() => onNavigate('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 group-hover:bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              
              {/* Next Arrow */}
              {currentImageIndex < allImages.length - 1 && (
                <button
                  onClick={() => onNavigate('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 group-hover:bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </>
          )}
          
          <img
            src={imageUrl}
            alt={alt || title || 'Gallery image'}
            className="w-full h-full object-contain"
            style={{ minWidth: '100%', minHeight: '100%' }}
          />
        </div>

        {/* Right Side - Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                  style={{
                    backgroundImage: author?.avatar ? `url(${author.avatar})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: author?.avatar ? undefined : '#d1d5db'
                  }}
                />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {author?.name || tCommon('unknownUser')}
                  {author?.title ? (
                    <span className="font-normal text-gray-500 text-sm ml-2">
                      • {formatUserTitle(author.title)}
                    </span>
                  ) : null}
                </h3>
                <p className="text-sm text-gray-500">{createdAt ? formatDate(createdAt) : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Post Content */}
            <div className="p-4 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
              <div className="flex items-center gap-3 mb-4">
                      {isFeatured && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#fbae17] text-white flex items-center gap-1 shadow-sm">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7 0l1.4-5.9L12 14l2.9-3.9L16.3 16H7.7z"/>
                    </svg>
                          {category === 'the-kings-card' ? t('cardOfTheWeek') : t('diceOfTheWeek')}
                        </span>
                      )}
                    </div>
              {(description || isEditingDescription) && (
                <div className="mb-4">
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={4}
                        placeholder={tGallery('writeDescription')}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {tCommon('cancel')}
                        </button>
                        <button
                          onClick={handleSaveDescription}
                          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>{tCommon('save')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="text-gray-700 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:bg-gray-200 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full pr-8">
                        <p>
                          {renderFormattedText(description || '')}
                        </p>
                      </div>
                      {canEdit && onEditDescription && (
                        <button
                          onClick={handleEditDescription}
                          className="absolute top-0 right-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={tGallery('editDescription')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              

              {/* Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button
                      onClick={onLike}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        isLiked 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{likeCount || 0}</span>
                    </button>
              </div>
              
                <div className="flex items-center space-x-2">
                {canDelete && onDelete && (
                    <button
                      onClick={handleImageDelete}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title={tCommon('delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                )}
                
                {canReport && onReport && (
                    <button
                      onClick={handleImageReport}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title={tGallery('reportImage')}
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                )}
              </div>
            </div>

              {/* Comments Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {tGallery('comments')} ({comments.reduce((total, comment) => total + 1 + ((comment as any).replies ? (comment as any).replies.length : 0), 0)})
                </h3>
                
                {/* Add Comment Form */}
                {isAuthenticated && onAddComment && (
                  <div className="mb-6">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        {currentUser?.avatar ? (
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 relative">
                        <div className="relative">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={tGallery('writeComment')}
                            className="w-full p-3 pr-10 border border-gray-300 rounded-full focus:border-blue-500 focus:outline-none resize-none bg-gray-50 focus:bg-white transition-colors [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            rows={1}
                            style={{ 
                              minHeight: '40px', 
                              maxHeight: '120px'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                          />
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || isSubmittingComment}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-1 bg-transparent border-none outline-none"
                          >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      {/* Main Comment */}
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          {comment.author.avatar ? (
                            <img
                              src={comment.author.avatar}
                              alt={comment.author.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3 relative">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-gray-900 text-sm truncate">{comment.author.name}</span>
                            {comment.author.title && (
                              <span className="text-gray-500 text-xs truncate">
                                {formatUserTitle(comment.author.title)}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs whitespace-nowrap">{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                            <p className="text-gray-700 text-sm pr-8">{renderFormattedText(comment.content)}</p>
                            
                            {/* Action buttons at bottom */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-4">
                                {/* Like button */}
                                {isAuthenticated && onLikeComment && (
                            <button 
                              onClick={() => handleLikeComment(comment.id)}
                                    className={`flex items-center space-x-1 text-xs transition-colors ${
                                comment.userLiked 
                                        ? 'text-red-500 hover:text-red-600' 
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                                    <Heart className={`w-3 h-3 ${comment.userLiked ? 'fill-current' : ''}`} />
                                    <span>{comment.likes || 0}</span>
                                  </button>
                                )}
                                
                                {/* Reply button */}
                                {isAuthenticated && onReplyToComment && (
                                  <button
                                    onClick={() => {
                                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                      setReplyContent('');
                                    }}
                                    className="flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>{replyingTo === comment.id ? tCommon('cancel') : tGallery('reply')}</span>
                                  </button>
                                )}
                              </div>
                              
                              {/* Report and Delete buttons on the right */}
                              <div className="flex items-center space-x-2">
                                {/* Delete and Report buttons */}
                                <div className="flex items-center space-x-2">
                                  {/* Delete button */}
                                  {currentUserId === comment.author.id && onDeleteComment && (
                                    <button 
                                      onClick={() => requestDeleteComment(comment.id)}
                                      className="text-gray-500 hover:text-red-500 text-xs p-1 hover:bg-red-50 rounded transition-colors"
                                      title={tGallery('deleteComment')}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  
                                  {/* Report button */}
                                  {isAuthenticated && onReportComment && (
                                    <button
                                      onClick={() => handleReportComment(comment.id)}
                                      className="text-gray-500 hover:text-red-500 text-xs p-1 hover:bg-red-50 rounded transition-colors"
                                      title={tGallery('reportComment')}
                                    >
                                      <Flag className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                        </div>
                        
                          {/* Reply input field */}
                        {replyingTo === comment.id && (
                            <div className="mt-3 ml-11">
                              <div className="flex space-x-3">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                  {currentUser?.avatar ? (
                                    <img
                                      src={currentUser.avatar}
                                      alt={currentUser.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 relative">
                                  <div className="relative">
                                    <textarea
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder={tGallery('writeReply')}
                                      className="w-full p-3 pr-10 border border-gray-300 rounded-full focus:border-blue-500 focus:outline-none resize-none bg-gray-50 focus:bg-white transition-colors [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                      rows={1}
                                      style={{ 
                                        minHeight: '40px', 
                                        maxHeight: '120px'
                                      }}
                                      onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 'px';
                                      }}
                                />
                                <button
                                      onClick={handleReplySubmit}
                                  disabled={!replyContent.trim() || isSubmittingReply}
                                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-1 bg-transparent border-none outline-none"
                                >
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                      </svg>
                                </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                            </div>
                          </div>
                        
                      {/* Replies Thread */}
                        {(comment as any).replies && (comment as any).replies.length > 0 && (
                        <div className="ml-11 space-y-3">
                          {(comment as any).replies.map((reply: any) => (
                            <div key={reply.id} className="flex space-x-3">
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                {reply.author.avatar ? (
                                  <img
                                    src={reply.author.avatar}
                                    alt={reply.author.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-100 rounded-lg p-3 relative">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{reply.author.name}</span>
                                    {reply.author.title && (
                                      <span className="text-gray-500 text-xs">
                                        {formatUserTitle(reply.author.title)}
                                      </span>
                                    )}
                                    <span className="text-gray-500 text-xs">{formatRelativeTime(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-gray-700 text-sm pr-8">{reply.content}</p>
                                  
                                  {/* Reply action buttons */}
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center space-x-4">
                                      {/* Like button for reply */}
                                      {isAuthenticated && onLikeComment && (
                                      <button 
                                        onClick={() => handleLikeComment(reply.id)}
                                          className={`flex items-center space-x-1 text-xs transition-colors ${
                                          reply.userLiked 
                                              ? 'text-red-500 hover:text-red-600' 
                                            : 'text-gray-500 hover:text-red-500'
                                        }`}
                                      >
                                          <Heart className={`w-3 h-3 ${reply.userLiked ? 'fill-current' : ''}`} />
                                          <span>{reply.likes || 0}</span>
                                        </button>
                                      )}
                                    </div>
                                    
                                    {/* Delete and Report buttons for reply */}
                                    <div className="flex items-center space-x-2">
                                      {/* Delete button for reply */}
                                      {currentUserId === reply.author.id && onDeleteComment && (
                                        <button
                                          onClick={() => requestDeleteComment(reply.id)}
                                          className="text-gray-500 hover:text-red-500 text-xs p-1 hover:bg-red-50 rounded transition-colors"
                                          title={tGallery('deleteReply')}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      
                                      {/* Report button for reply */}
                                      {isAuthenticated && onReportComment && (
                                        <button
                                          onClick={() => handleReportComment(reply.id)}
                                          className="text-gray-500 hover:text-red-500 text-xs p-1 hover:bg-red-50 rounded transition-colors"
                                          title={tGallery('reportReply')}
                                        >
                                          <Flag className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              </div>
                            ))}
                          </div>
                      )}
                    </div>
                  ))}
                </div>
                </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]"
          onClick={() => {
            setShowDeleteConfirm(false);
            setCommentToDelete(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {tCommon('deleteComment')}
                  </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                {tCommon('confirmDeleteComment')}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCommentToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={confirmDeleteComment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {tCommon('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && commentToReport && (
        <ReportContent
          contentType="comment"
          contentId={commentToReport}
          onReport={handleReportSubmit}
          onClose={() => {
            setShowReportModal(false);
            setCommentToReport(null);
          }}
        />
      )}

      {/* Image Delete Confirmation Dialog */}
      {showImageDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]"
          onClick={() => setShowImageDeleteConfirm(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {tCommon('deleteImage')}
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                {tCommon('confirmDeleteImage')}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImageDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={confirmImageDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {tCommon('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Report Modal */}
      {showImageReportModal && (
        <ReportContent
          contentType="gallery_image"
          contentId={imageId || ''}
          onReport={handleImageReportSubmit}
          onClose={() => setShowImageReportModal(false)}
        />
      )}
    </div>
  );
}