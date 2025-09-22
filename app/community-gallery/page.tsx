'use client';

import { useState, useEffect, useMemo } from 'react';
import { Image as ImageIcon, Heart, MessageCircle, Flag, Plus, User, Calendar, Download, Trash2, Crown, Search, X, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import ModerationAlert from '@/components/ModerationAlert';
import ReportContent from '@/components/ReportContent';
import CommunityGuidelines from '@/components/CommunityGuidelines';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useChatState } from '@/contexts/ChatStateContext';
import ModernTooltip from '@/components/ModernTooltip';
import TagSelector from '@/components/TagSelector';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import ImageModal from '@/components/ImageModal';
import BackButton from '@/components/BackButton';
import Footer from '@/components/Footer';
import ExpandableText from '@/components/ExpandableText';

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  weeklyLikes: {
    likesReceivedThisWeek: number;
    weekId: string;
  };
  userVote?: 'up' | 'down' | null;
  views: number;
  downloads: number;
  comments: number;
  isModerated: boolean;
  moderationResult?: {
    isAppropriate: boolean;
    flags: string[];
  };
  tags: string[];
  isDraft?: boolean;
  commentsList?: Comment[];
}

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string;
  };
  content: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  isModerated: boolean;
  moderationResult?: {
    isAppropriate: boolean;
    flags: string[];
  };
  likes?: number;
  userLiked?: boolean;
  userLikes?: string[];
}

interface GalleryCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  imageCount: number;
}

export default function CommunityGalleryPage() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { isChatOpen, selectedChat } = useChatState();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportingImage, setReportingImage] = useState<GalleryImage | null>(null);
  const [moderationAlert, setModerationAlert] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [imageComments, setImageComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newImage, setNewImage] = useState({
    description: '',
    category: 'collections',
    tags: [] as string[],
    file: null as File | null
  });

  // Handle URL parameters for author selection
  useEffect(() => {
    const authorParam = searchParams?.get('author');
    if (authorParam) {
      setSelectedAuthor(authorParam);
    }
  }, [searchParams]);

  // Handle URL parameters for opening specific image
  useEffect(() => {
    const imageParam = searchParams?.get('image');
    if (imageParam && images.length > 0) {
      const targetImage = images.find(img => img.id === imageParam);
      if (targetImage) {
        handleImageClick(targetImage);
      }
    }
  }, [searchParams, images]);

  // Load gallery data from API
  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        setLoading(true);
        const url = user ? `/api/gallery?userId=${user.id}` : '/api/gallery';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();

          setImages(data.images || []);
          setCategories(data.categories || []);
        } else {
          console.error('Failed to fetch gallery data');
        }
      } catch (error) {
        console.error('Error fetching gallery data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryData();
  }, [user]);

  // Handle dice sharing from My Dice page
  useEffect(() => {
    const uploadParam = searchParams?.get('upload');
    
    if (uploadParam === 'true') {
      // Check for dice data in sessionStorage
      const diceData = sessionStorage.getItem('diceToShare');
      
      if (diceData) {
        try {
          const parsedData = JSON.parse(diceData);
          
          // Convert base64 data back to File object
          const base64Data = parsedData.file.data.split(',')[1];
          const binaryData = atob(base64Data);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: parsedData.file.type });
          
          // Create a proper File object with all required properties
          const file = new File([blob], parsedData.file.name, { 
            type: parsedData.file.type,
            lastModified: Date.now()
          });
          
          // Ensure the file has the correct size property
          Object.defineProperty(file, 'size', {
            value: bytes.length,
            writable: false
          });
          
          // Pre-populate the form
          setNewImage({
            description: parsedData.description,
            category: parsedData.category,
            tags: parsedData.tags,
            file: file
          });
          
          // Open the upload section
          setShowUploadModal(true);
          
          // Clear the sessionStorage
          sessionStorage.removeItem('diceToShare');
          
          // Clean up the URL
          const url = new URL(window.location.href);
          url.searchParams.delete('upload');
          window.history.replaceState({}, '', url.toString());
        } catch (error) {
          console.error('Error parsing dice data:', error);
        }
      }
    }
  }, [searchParams]);



  const handleUploadImage = async () => {
    if (!newImage.file) {
      showToast('Please select an image', 'error');
      return;
    }

    if (!isAuthenticated || !user) {
      showToast('Please sign in to upload images', 'error');
      return;
    }

    // Prevent double-clicking
    if (isUploadingImage) {
      return;
    }

    setIsUploadingImage(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', newImage.file);
      formData.append('title', ''); // Empty title
      formData.append('description', newImage.description);
      formData.append('category', newImage.category);
      formData.append('tags', newImage.tags.join(','));
      formData.append('author', JSON.stringify({
        id: user.id,
        name: user.username,
        avatar: user.avatar || '/DiceLogo.svg',
        reputation: user.reputation || 0,
        title: user.title
      }));

      // Upload to our API
      const response = await fetch('/api/gallery/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add the new image to the list
        setImages(prevImages => [result.image, ...prevImages]);
        
        // Reset form
        setNewImage({ description: '', category: 'collections', tags: [], file: null });
        setShowUploadModal(false);
        
        showToast('Image uploaded successfully!', 'success');
      } else {
        const errorData = await response.json();
        console.error('Failed to upload image:', errorData);
        
        // Handle different error types
        if (errorData.flags && errorData.flags.includes('inappropriate_content')) {
          showToast('Upload rejected: Description flagged as inappropriate', 'error');
        } else if (errorData.flags && errorData.flags.includes('spam')) {
          showToast('Upload rejected: Description flagged as spam', 'error');
        } else if (errorData.error && errorData.error.includes('flagged as inappropriate')) {
          showToast('Upload rejected: Title or description flagged as inappropriate', 'error');
        } else if (errorData.error && errorData.error.includes('Image was flagged')) {
          showToast('Upload rejected: Image flagged as inappropriate', 'error');
        } else {
          showToast(errorData.error || 'Failed to upload image. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error uploading image. Please try again.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleReport = (image: GalleryImage) => {
    setReportingImage(image);
    setShowReport(true);
  };

  const handleDeleteImage = (imageId: string) => {
    if (!isAuthenticated || !user) {
      return;
    }
    setImageToDelete(imageId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteImage = async () => {
    if (!isAuthenticated || !user || !imageToDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/gallery/${imageToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: user.id
        })
      });

      if (response.ok) {
        // Remove the image from the local state
        setImages(prevImages => prevImages.filter(image => image.id !== imageToDelete));
        showToast('Image deleted successfully', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete image', 'error');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      showToast('Error deleting image. Please try again.', 'error');
    } finally {
      setImageToDelete(null);
    }
  };

  const handleVote = async (imageId: string, voteType: 'up' | 'down') => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          voteType,
          userId: user.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Update the image in local state
        setImages(prevImages => 
          prevImages.map(img => 
            img.id === imageId ? result.image : img
          )
        );
        // Update selectedImage if it's the same image
        setSelectedImage(prevSelected => 
          prevSelected && prevSelected.id === imageId ? result.image : prevSelected
        );
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to update vote', 'error');
      }
    } catch (error) {
      console.error('Error voting on image:', error);
      showToast('Error voting on image. Please try again.', 'error');
    }
  };

  const handleLike = async (imageId: string) => {
    if (!isAuthenticated || !user) {
      console.log('Not authenticated or no user');
      return;
    }

    // Find the current image to check if it's already liked
    const currentImage = images.find(img => img.id === imageId) || selectedImage;
    const isCurrentlyLiked = currentImage?.userVote === 'up';
    
    console.log('Current image:', currentImage);
    console.log('Is currently liked:', isCurrentlyLiked);
    
    // Toggle: if currently liked, send null to unlike; if not liked, send 'up' to like
    const voteType = isCurrentlyLiked ? null : 'up';
    
    console.log('Sending vote request:', { imageId, voteType, userId: user.id });
    
    try {
      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          voteType,
          userId: user.id
        })
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Vote successful:', result);
        // Update the image in local state
        setImages(prevImages => 
          prevImages.map(img => 
            img.id === imageId ? result.image : img
          )
        );
        // Update selectedImage if it's the same image
        setSelectedImage(prevSelected => 
          prevSelected && prevSelected.id === imageId ? result.image : prevSelected
        );
      } else {
        const error = await response.json();
        console.error('Vote failed:', error);
        showToast(error.error || 'Failed to update vote', 'error');
      }
    } catch (error) {
      console.error('Error voting on image:', error);
      showToast('Error voting on image. Please try again.', 'error');
    }
  };

  const handleImageClick = async (image: GalleryImage, scrollToComments = false) => {
    setSelectedImage(image);
    setShowImageModal(true);
    
    // Load comments for this image
    try {
      const url = user 
        ? `/api/gallery/comments?imageId=${image.id}&userId=${user.id}`
        : `/api/gallery/comments?imageId=${image.id}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setImageComments(data.comments || []);
        
        // Scroll to comments section if requested
        if (scrollToComments) {
          setTimeout(() => {
            const commentsSection = document.getElementById('comments-section');
            if (commentsSection) {
              commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100); // Small delay to ensure modal is fully rendered
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setImageComments([]);
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setImageComments([]);
  };

  const refreshComments = async () => {
    if (!selectedImage) return;
    
    try {
      const url = user 
        ? `/api/gallery/comments?imageId=${selectedImage.id}&userId=${user.id}`
        : `/api/gallery/comments?imageId=${selectedImage.id}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setImageComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!selectedImage || !user) return;

    // Prevent double-clicking
    if (isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);

    try {
      const response = await fetch('/api/gallery/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: selectedImage.id,
          content,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DiceLogo.svg',
            title: user.title
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedComments = [...imageComments, data.comment];
        setImageComments(updatedComments);
        
        // Update the image's comment count in the main list (including replies)
        const totalComments = updatedComments.reduce((total: number, comment: any) => {
          return total + 1 + (comment.replies ? comment.replies.length : 0);
        }, 0);
        
        setImages(prevImages => 
          prevImages.map(img => 
            img.id === selectedImage.id 
              ? { ...img, comments: totalComments }
              : img
          )
        );

        // Show success message if moderation passed
        if (data.moderationResult?.isAppropriate) {
          showToast('Comment added successfully!', 'success');
        }
      } else {
        const error = await response.json();
        
        // Handle different error types
        if (response.status === 429) {
          // Rate limiting or daily limit errors
          showToast(error.error || 'Action temporarily restricted', 'error');
        } else if (error.flags && error.flags.includes('inappropriate_content')) {
          showToast('Comment rejected: Content flagged as inappropriate', 'error');
        } else if (error.flags && error.flags.includes('spam')) {
          showToast('Comment rejected: Content flagged as spam', 'error');
        } else if (error.reason) {
          showToast(`Comment rejected: ${error.reason}`, 'error');
        } else {
          showToast(error.error || 'Failed to add comment', 'error');
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Error adding comment. Please try again.', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/gallery/comments/${commentId}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        const updatedComments = imageComments.filter(comment => comment.id !== commentId);
        setImageComments(updatedComments);
        
        // Update the image's comment count in the main list (including replies)
        if (selectedImage) {
          const totalComments = updatedComments.reduce((total: number, comment: any) => {
            return total + 1 + (comment.replies ? comment.replies.length : 0);
          }, 0);
          
          setImages(prevImages => 
            prevImages.map(img => 
              img.id === selectedImage.id 
                ? { ...img, comments: totalComments }
                : img
            )
          );
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete comment', 'error');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Error deleting comment. Please try again.', 'error');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          userId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh comments to get updated like status
        await refreshComments();
        
        // Show success message
        if (data.isReply) {
          showToast('Reply liked!', 'success');
        } else {
          showToast('Comment liked!', 'success');
        }
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to like comment', 'error');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      showToast('Error liking comment. Please try again.', 'error');
    }
  };

  const handleReplyToComment = async (commentId: string, content: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          content,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DiceLogo.svg',
            title: user.title
          }
        })
      });

      if (response.ok) {
        // Refresh comments to show the new reply
        await refreshComments();
        
        // Update comment count to include the new reply
        if (selectedImage) {
          const updatedComments = await fetch(`/api/gallery/comments?imageId=${selectedImage.id}&userId=${user.id}`);
          if (updatedComments.ok) {
            const data = await updatedComments.json();
            const totalComments = data.comments.reduce((total: number, comment: any) => {
              return total + 1 + (comment.replies ? comment.replies.length : 0);
            }, 0);
            
            setImages(prevImages => 
              prevImages.map(img => 
                img.id === selectedImage.id 
                  ? { ...img, comments: totalComments }
                  : img
              )
            );
          }
        }
        
        showToast('Reply added successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to add reply', 'error');
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
      showToast('Error replying to comment. Please try again.', 'error');
    }
  };

  const handleReportComment = async (commentId: string, reason: string, details?: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          reason,
          details: details || '',
          reporterId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || 'Report submitted successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to submit report', 'error');
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
      showToast('Error reporting comment. Please try again.', 'error');
    }
  };

  const handlePublishDraft = async (imageId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          authorId: user.id,
          authorName: user.username
        })
      });

      if (response.ok) {
        // Update the image in local state to remove draft status
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, isDraft: false } : img
        ));
        console.log('Draft published successfully');
      } else {
        console.error('Failed to publish draft');
      }
    } catch (error) {
      console.error('Error publishing draft:', error);
    }
  };

  // Filter images by category, author, and search query
  let filteredImages = images;
  
  // Include drafts for the current user
  if (user) {
    const userDrafts = images.filter(image => image.isDraft && image.author.id === user.id);
    filteredImages = [...filteredImages, ...userDrafts];
  }
  
  // Filter by category
  if (selectedCategory !== 'all') {
    filteredImages = filteredImages.filter(image => image.category === selectedCategory);
  }
  
  // Filter by author
  if (selectedAuthor) {
    filteredImages = filteredImages.filter(image => image.author.name === selectedAuthor);
  }
  
  // Filter by search query (username or photo description)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredImages = filteredImages.filter(image => 
      image.author.name.toLowerCase().includes(query) ||
      image.description.toLowerCase().includes(query)
    );
  }

  // Calculate live category counts
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') {
      return images.length;
    }
    return images.filter(image => image.category === categoryId).length;
  };

  // Compute featured images (most weekly likes received) for The King's Card and Dice Throne
  const featuredKingsCard = useMemo(() => {
    const candidates = images.filter(img => img.category === 'the-kings-card');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => {
      const bestScore = best.weeklyLikes?.likesReceivedThisWeek || 0;
      const currScore = curr.weeklyLikes?.likesReceivedThisWeek || 0;
      if (currScore !== bestScore) {
        return currScore > bestScore ? curr : best;
      }
      // Tiebreaker: newer first
      return new Date(curr.createdAt).getTime() > new Date(best.createdAt).getTime() ? curr : best;
    });
  }, [images]);

  const featuredDiceThrone = useMemo(() => {
    const candidates = images.filter(img => img.category === 'dice-throne');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => {
      const bestScore = best.weeklyLikes?.likesReceivedThisWeek || 0;
      const currScore = curr.weeklyLikes?.likesReceivedThisWeek || 0;
      if (currScore !== bestScore) {
        return currScore > bestScore ? curr : best;
      }
      // Tiebreaker: newer first
      return new Date(curr.createdAt).getTime() > new Date(best.createdAt).getTime() ? curr : best;
    });
  }, [images]);

  const featuredIds = useMemo(() => {
    const ids: string[] = [];
    if (featuredKingsCard?.id) ids.push(featuredKingsCard.id);
    if (featuredDiceThrone?.id) ids.push(featuredDiceThrone.id);
    return new Set(ids);
  }, [featuredKingsCard, featuredDiceThrone]);

  // Pin featured images to the top for their categories and All Images
  if (selectedCategory === 'the-kings-card' && featuredKingsCard) {
    filteredImages = [featuredKingsCard, ...filteredImages.filter(i => i.id !== featuredKingsCard.id)];
  } else if (selectedCategory === 'dice-throne' && featuredDiceThrone) {
    filteredImages = [featuredDiceThrone, ...filteredImages.filter(i => i.id !== featuredDiceThrone.id)];
  } else if (selectedCategory === 'all') {
    const featuredFirst = [featuredDiceThrone, featuredKingsCard].filter(Boolean) as GalleryImage[];
    const rest = filteredImages.filter(i => !featuredFirst.find(f => f.id === i.id));
    filteredImages = [...featuredFirst, ...rest];
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 shadow">
                  <div className="aspect-square bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <BackButton />
            <Image 
              src="/GalleryIcon.svg" 
              alt="Gallery" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-3xl font-bold text-gray-900">Community Gallery</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowGuidelines(true)}
              className="btn-secondary"
            >
              Community Guidelines
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by username or photo description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#fbae17] focus:border-[#fbae17] sm:text-sm"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Results Indicator */}
        {searchQuery.trim() && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Search results for: <span className="font-semibold">"{searchQuery}"</span>
                  <span className="ml-2 text-sm text-blue-600">
                    ({filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} found)
                  </span>
                </span>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}

        {/* Author Filter Indicator */}
        {selectedAuthor && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Showing images by: <span className="font-semibold">{selectedAuthor}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedAuthor('');
                  // Update URL to remove author parameter
                  const url = new URL(window.location.href);
                  url.searchParams.delete('author');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedCategory === 'all' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-center">
                             <div className="flex justify-center mb-2">
                 <Image
                   src="/CameraIcon.svg"
                   alt="Camera"
                   width={40}
                   height={40}
                   className="w-10 h-10"
                 />
               </div>
              <h3 className="font-semibold text-gray-900">All Images</h3>
              <p className="text-sm text-gray-600">{getCategoryCount('all')} images</p>
            </div>
          </button>
          
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedCategory === category.id 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-2">
                                     {category.icon.endsWith('.svg') ? (
                    <Image
                      src={`/${category.icon}`}
                      alt={category.name}
                      width={category.icon === 'CollectionIcon.svg' || category.icon === 'ThroneIcon.svg' ? 64 : 48}
                      height={category.icon === 'CollectionIcon.svg' || category.icon === 'ThroneIcon.svg' ? 64 : 48}
                      className={`${category.icon === 'CollectionIcon.svg' || category.icon === 'ThroneIcon.svg' ? 'w-16 h-16' : 'w-12 h-12'} ${category.icon === 'CollectionIcon.svg' ? 'mt-1.5' : ''}`}
                    />
                  ) : (
                    <div className="text-2xl">{category.icon}</div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-600">{getCategoryCount(category.id)} images</p>
              </div>
            </button>
          ))}
        </div>

                 {/* View Mode Toggle and Category Description */}
         <div className="flex items-center justify-between mb-6">
           <div className="text-base font-semibold text-gray-800">
             {searchQuery.trim() ? (
               <span>Search results for "{searchQuery}" ({filteredImages.length} images)</span>
             ) : selectedCategory === 'all' ? (
               <span>Showing all {getCategoryCount('all')} images from the community</span>
             ) : (
               <span>
                 {categories.find(c => c.id === selectedCategory)?.description || 'Category description'}
               </span>
             )}
           </div>
           <div className="flex bg-white rounded-lg border border-gray-200 p-1">
             <button
               onClick={() => setViewMode('grid')}
               className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                 viewMode === 'grid' 
                   ? 'bg-primary-500 text-white' 
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               Grid
             </button>
             <button
               onClick={() => setViewMode('list')}
               className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                 viewMode === 'list' 
                   ? 'bg-primary-500 text-white' 
                   : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               List
             </button>
           </div>
         </div>

        {/* Images */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map(image => (
              <div 
                key={image.id} 
                className={`bg-white rounded-lg overflow-hidden transition-shadow cursor-pointer group ${featuredIds.has(image.id) ? 'border-2 border-[#fbae17] shadow-lg' : 'shadow-sm border border-gray-200 hover:shadow-md'}`}
                onClick={() => handleImageClick(image)}
              >
                <div className="relative aspect-square">
                  {image.imageUrl.includes('/gallery/') ? (
                    <div 
                      className="w-full h-full group-hover:opacity-90 transition-opacity"
                      style={{
                        backgroundImage: `url(${image.imageUrl})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  ) : (
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.title}
                      fill
                      className="object-cover group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  )}

                  {/* Featured badge - top left overlay */}
                  {featuredIds.has(image.id) && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#fbae17] text-white flex items-center gap-1 shadow-lg">
                        <Crown className="w-3 h-3 fill-current" />
                        {image.category === 'the-kings-card' ? 'Card of the Week' : 'Dice of the Week'}
                      </span>
                    </div>
                  )}

                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {categories.find(c => c.id === image.category)?.name || image.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Combined likes counter and like button */}
                      <ModernTooltip content={!isAuthenticated ? 'Sign in to vote' : 'Like'} position="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAuthenticated) {
                              handleVote(image.id, 'up');
                            } else {
                              showToast('Please sign in to vote', 'info');
                            }
                          }}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-colors ${
                            image.userVote === 'up' 
                              ? 'bg-white text-red-500' 
                              : 'bg-white bg-opacity-80 hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Heart className="w-3 h-3" fill={image.userVote === 'up' ? 'currentColor' : 'none'} />
                          <span className="text-xs">{formatNumber(image.votes.upvotes - image.votes.downvotes)}</span>
                        </button>
                      </ModernTooltip>
                      {/* Comments counter */}
                      <ModernTooltip content="View comments" position="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(image, true);
                          }}
                          className="flex items-center space-x-1 px-2 py-1 rounded-full bg-white bg-opacity-80 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span className="text-xs">{image.comments || 0}</span>
                        </button>
                      </ModernTooltip>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {image.isDraft && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 whitespace-pre-wrap">
                    {image.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{image.author.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Action buttons - only show for image owner */}
                      {isAuthenticated && user && image.author.id === user.id && (
                        <div className="flex items-center gap-1">
                          {/* Publish button - only show for drafts by the current user */}
                          {image.isDraft && (
                            <ModernTooltip content="Publish draft" position="top">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublishDraft(image.id);
                                }}
                                className="px-2 py-1 rounded-full bg-white bg-opacity-80 hover:bg-green-600 text-gray-600 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </ModernTooltip>
                          )}
                          {/* Delete button - only show to image author */}
                          <ModernTooltip content="Delete image" position="top">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(image.id);
                              }}
                              className="px-2 py-1 rounded-full bg-white bg-opacity-80 hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </ModernTooltip>
                        </div>
                      )}
                      {/* Report button - show to all authenticated users */}
                      {isAuthenticated && user && (
                        <ModernTooltip content="Report image" position="top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReport(image);
                            }}
                            className="px-2 py-1 rounded-full bg-white bg-opacity-80 hover:bg-gray-100 text-gray-600 transition-colors"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </ModernTooltip>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredImages.map(image => (
              <div 
                key={image.id} 
                className={`bg-white rounded-lg p-4 cursor-pointer group ${featuredIds.has(image.id) ? 'border-2 border-[#fbae17] shadow-lg' : 'shadow-sm border border-gray-200'}`}
                onClick={() => handleImageClick(image)}
              >
                <div className="flex space-x-4">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    {image.imageUrl.includes('/gallery/') ? (
                      <div 
                        className="w-full h-full rounded-lg group-hover:opacity-90 transition-opacity"
                        style={{
                          backgroundImage: `url(${image.imageUrl})`,
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    ) : (
                      <Image
                        src={image.thumbnailUrl}
                        alt={image.title}
                        fill
                        className="object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm text-gray-500">
                          {categories.find(c => c.id === image.category)?.name || image.category}
                        </span>
                        {featuredIds.has(image.id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#fbae17] text-white flex items-center gap-1">
                            <Crown className="w-3 h-3 fill-current" />
                            {image.category === 'the-kings-card' ? 'Card of the Week' : 'Dice of the Week'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {image.isDraft && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            Draft
                          </span>
                        )}
                      </div>
                      
                      <ExpandableText 
                        text={image.description}
                        maxLength={200}
                        className="text-gray-600"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{image.author.name}</span>
                          <span className="text-xs">({image.author.reputation} rep)</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(image.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Combined likes counter and like button on the left */}
                        <ModernTooltip content={!isAuthenticated ? 'Sign in to vote' : 'Like'} position="top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAuthenticated) {
                                handleVote(image.id, 'up');
                              } else {
                                // Handle unauthenticated user - could show login modal
                              }
                            }}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${
                              image.userVote === 'up' 
                                ? 'bg-white text-red-500' 
                                : 'hover:bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Heart className="w-4 h-4" fill={image.userVote === 'up' ? 'currentColor' : 'none'} />
                            <span className="text-sm font-medium">
                              {image.votes.upvotes - image.votes.downvotes}
                            </span>
                          </button>
                        </ModernTooltip>
                        
                        {/* Comments counter */}
                        <ModernTooltip content="View comments" position="top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(image, true);
                            }}
                            className="flex items-center space-x-1 px-3 py-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{image.comments || 0}</span>
                          </button>
                        </ModernTooltip>
                        
                        {/* Action buttons on the right - only show for image owner */}
                        {isAuthenticated && user && image.author.id === user.id && (
                          <div className="flex items-center gap-1">
                            {/* Publish button - only show for drafts by the current user */}
                            {image.isDraft && (
                              <ModernTooltip content="Publish draft" position="top">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublishDraft(image.id);
                                  }}
                                  className="px-3 py-2 rounded-full text-gray-400 hover:text-green-600 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </ModernTooltip>
                            )}
                            {/* Delete button - only show to image author */}
                            <ModernTooltip content="Delete image" position="top">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImage(image.id);
                                }}
                                className="px-3 py-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </ModernTooltip>
                          </div>
                        )}
                        {/* Report button - show to all authenticated users */}
                        {isAuthenticated && user && (
                          <ModernTooltip content="Report image" position="top">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReport(image);
                              }}
                              className="px-3 py-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          </ModernTooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredImages.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery.trim() ? 'No images found' : 'No images found'}
            </h3>
            <p className="text-gray-600">
              {searchQuery.trim() 
                ? `No images found for "${searchQuery}". Try searching by username or photo description.`
                : 'Be the first to share an image in this category!'
              }
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newImage.category}
                  onChange={(e) => setNewImage({...newImage, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description ({newImage.description.length}/500)
                </label>
                <textarea
                  value={newImage.description}
                  onChange={(e) => setNewImage({...newImage, description: e.target.value.slice(0, 500)})}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Describe your image..."
                  maxLength={500}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <TagSelector
                  selectedTags={newImage.tags}
                  onTagsChange={(tags) => setNewImage({...newImage, tags})}
                  placeholder="Select or create tags..."
                />
              </div>
              
                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Image File
                 </label>
                 <div className="relative">
                   <input
                     type="file"
                     accept="image/*"
                     onChange={(e) => setNewImage({...newImage, file: e.target.files?.[0] || null})}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     id="file-upload"
                   />
                   <div className="flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white">
                     <span className="text-gray-500">
                       {newImage.file ? newImage.file.name : "Choose file..."}
                     </span>
                     <button
                       type="button"
                       onClick={() => document.getElementById('file-upload')?.click()}
                       className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                     >
                       Browse
                     </button>
                   </div>
                 </div>
               </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadImage}
                disabled={isUploadingImage}
                className={`btn-primary ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingImage ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Alert */}
      {moderationAlert && (
        <ModerationAlert
          result={moderationAlert.result}
          type={moderationAlert.type}
          onDismiss={() => setModerationAlert(null)}
          showDetails={true}
        />
      )}

      {/* Report Modal */}
      {showReport && reportingImage && (
        <ReportContent
          contentType="gallery_image"
          contentId={reportingImage.id}
          onReport={(report) => {
            console.log('Report submitted:', report);
            setShowReport(false);
            setReportingImage(null);
          }}
          onClose={() => {
            setShowReport(false);
            setReportingImage(null);
          }}
        />
      )}

      {/* Community Guidelines Modal */}
      {showGuidelines && (
        <CommunityGuidelines
          isOpen={showGuidelines}
          onClose={() => setShowGuidelines(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setImageToDelete(null);
        }}
        onConfirm={confirmDeleteImage}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={showImageModal}
          onClose={closeImageModal}
          imageUrl={selectedImage.imageUrl}
          title={selectedImage.title}
          description={selectedImage.description}
          author={{
            name: selectedImage.author.name,
            avatar: selectedImage.author.avatar
          }}
          createdAt={selectedImage.createdAt}
          category={selectedImage.category}
          isFeatured={featuredIds.has(selectedImage.id)}
          onLike={() => handleLike(selectedImage.id)}
          onDelete={() => handleDeleteImage(selectedImage.id)}
          onReport={() => handleReport(selectedImage)}
          isLiked={selectedImage.userVote === 'up'}
          canDelete={!!(isAuthenticated && user && selectedImage.author.id === user.id)}
          canReport={!!(isAuthenticated && user)}
          likeCount={selectedImage.votes?.upvotes || 0}
          imageId={selectedImage.id}
          comments={imageComments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onLikeComment={handleLikeComment}
          onReplyToComment={handleReplyToComment}
          onReportComment={handleReportComment}
          currentUserId={user?.id}
          isAuthenticated={isAuthenticated}
          currentUser={user}
          onRefreshComments={refreshComments}
        />
      )}


      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
} 