'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, Heart, Flag, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ExpandableText from './ExpandableText';
import ReportContent from './ReportContent';

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
  };
  createdAt?: string;
  category?: string;
  isFeatured?: boolean;
  onLike?: () => void;
  onDelete?: () => void;
  onReport?: (reason: string, details?: string) => Promise<void> | void;
  isLiked?: boolean;
  canDelete?: boolean;
  canReport?: boolean;
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
  isLiked,
  canDelete,
  canReport,
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
  onNavigate
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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

  const handleReportComment = (commentId: string) => {
    setCommentToReport(commentId);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (report: { reason: string; details: string }) => {
    if (!onReportComment || !commentToReport) return;
    
    try {
      await onReportComment(commentToReport, report.reason, report.details);
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

  const handleImageReportSubmit = async (report: { reason: string; details: string }) => {
    if (onReport) {
      try {
        await onReport(report.reason, report.details);
        setShowImageReportModal(false);
        // Don't close the main modal - let the parent handle it
      } catch (error) {
        console.error('Error reporting image:', error);
        // Keep the report modal open on error
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      style={{ pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col sm:flex-row"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Layout - Instagram Style */}
        <div className="sm:hidden flex flex-col h-full">
          {/* Header with Avatar, User, Date, and Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
                <h3 className="font-semibold text-gray-900 text-sm">{author?.name || 'Unknown User'}</h3>
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

          {/* Image - Full Width */}
          <div className="flex-1 bg-gray-100 flex items-center justify-center relative group">
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
            />
          </div>

          {/* Actions and Comments - Below Image */}
          <div className="flex flex-col border-t border-gray-200">
            {/* Actions Row */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onLike}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isLiked 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{likeCount || 0}</span>
                  </button>
                  
                  {/* Featured Badge */}
                  {isFeatured && (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#fbae17] text-white flex items-center gap-1 shadow-sm">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7 0l1.4-5.9L12 14l2.9-3.9L16.3 16H7.7z"/>
                      </svg>
                      {category === 'the-kings-card' ? 'Card of the Week' : 'Dice of the Week'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {canDelete && onDelete && (
                    <button
                      onClick={handleImageDelete}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  {canReport && onReport && (
                    <button
                      onClick={handleImageReport}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Report"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {description && (
                <div className="text-gray-700 mb-4 max-h-20 overflow-y-auto text-sm">
                  <p className="whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 p-4 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Comments ({comments.reduce((total, comment) => total + 1 + ((comment as any).replies ? (comment as any).replies.length : 0), 0)})
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
                    <div className="flex-1 relative">
                      <div className="relative">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full p-2 pr-8 border border-gray-300 rounded-full focus:border-blue-500 focus:outline-none resize-none bg-gray-50 focus:bg-white transition-colors text-sm"
                          rows={1}
                          style={{ 
                            minHeight: '32px', 
                            maxHeight: '80px'
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
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
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
                {comments.slice(0, 5).map((comment) => (
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
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="font-semibold text-gray-900 text-xs">{comment.author.name}</span>
                            <span className="text-gray-500 text-xs">{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 text-xs">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Show More Comments Button */}
                {comments.length > 5 && (
                  <button className="text-xs text-blue-500 hover:text-blue-600 w-full text-left">
                    View all {comments.length} comments
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Facebook Style */}
        <div className="hidden sm:flex w-full">
        {/* Left Side - Image */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center relative group">
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
            className="max-w-full max-h-full object-contain"
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
                <h3 className="font-semibold text-gray-900">{author?.name || 'Unknown User'}</h3>
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
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                      {isFeatured && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#fbae17] text-white flex items-center gap-1 shadow-sm">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7 0l1.4-5.9L12 14l2.9-3.9L16.3 16H7.7z"/>
                    </svg>
                          {category === 'the-kings-card' ? 'Card of the Week' : 'Dice of the Week'}
                        </span>
                      )}
                    </div>
              {description && (
                <div className="text-gray-700 mb-4 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:bg-gray-200 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <p className="whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}
              

              {/* Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button
                      onClick={onLike}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        isLiked 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                )}
                
                {canReport && onReport && (
                    <button
                      onClick={handleImageReport}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Report"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                )}
              </div>
            </div>

              {/* Comments Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Comments ({comments.reduce((total, comment) => total + 1 + ((comment as any).replies ? (comment as any).replies.length : 0), 0)})
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
                            placeholder="Write a comment..."
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
                        <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{comment.author.name}</span>
                          {comment.author.title && (
                                <span className="text-gray-500 text-xs">
                                  {comment.author.title.includes('/dice/Titles/') 
                                ? comment.author.title.split('/').pop()?.replace('.svg', '') 
                                : comment.author.title}
                            </span>
                          )}
                              <span className="text-gray-500 text-xs">{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                            <p className="text-gray-700 text-sm pr-8">{comment.content}</p>
                            
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
                                    <span>{replyingTo === comment.id ? 'Cancel' : 'Reply'}</span>
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
                                      title="Delete comment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  
                                  {/* Report button */}
                                  {isAuthenticated && onReportComment && currentUserId && (
                                    <button
                                      onClick={() => handleReportComment(comment.id)}
                                      className="text-gray-500 hover:text-red-500 text-xs p-1 hover:bg-red-50 rounded transition-colors"
                                      title="Report comment"
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
                                  placeholder="Write a reply..."
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
                                        {reply.author.title.includes('/dice/Titles/') 
                                          ? reply.author.title.split('/').pop()?.replace('.svg', '') 
                                          : reply.author.title}
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
                                          title="Delete reply"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      
                                      {/* Report button for reply */}
                                      {isAuthenticated && onReportComment && currentUserId && (
                                        <button
                                          onClick={() => handleReportComment(reply.id)}
                                          className="text-gray-500 hover:text-red-500 text-xs p-1 hover:bg-red-50 rounded transition-colors"
                                          title="Report reply"
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
                  Delete Comment
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this comment? This action cannot be undone.
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
                Cancel
              </button>
              <button
                onClick={confirmDeleteComment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
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
                  Delete Image
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this image? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImageDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmImageDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Report Modal */}
      {showImageReportModal && (
        <ReportContent
          contentType="image"
          contentId={imageId || ''}
          onReport={handleImageReportSubmit}
          onClose={() => setShowImageReportModal(false)}
        />
      )}
    </div>
  );
}