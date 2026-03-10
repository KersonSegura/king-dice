'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users } from 'lucide-react';
import Feed from '@/components/Feed';
import ImageModal from '@/components/ImageModal';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

type GalleryImage = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: { id: string; name: string; avatar: string; reputation: number };
  category: string;
  createdAt: string;
  votes: { upvotes: number; downvotes: number };
  views: number;
  downloads: number;
  comments: number;
  userVote?: 'up' | 'down' | 'none';
};

type FeaturedCollection = {
  id: string;
  username: string;
  avatar: string | null;
  collectionPhoto: string | null;
  gameCount: number;
  previewGameImage: string | null;
};

export default function FeedPage() {
  const t = useTranslations('home');
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<FeaturedCollection | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [imageComments, setImageComments] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setGalleryLoading(true);
        const url = user?.id ? `/api/gallery?userId=${user.id}` : '/api/gallery';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setGalleryImages(data.images || []);
        }
      } catch (e) {
        console.error('Error fetching gallery for feed page:', e);
      } finally {
        setGalleryLoading(false);
      }
    };
    fetchGallery();
  }, [user?.id]);

  useEffect(() => {
    const fetchFeaturedCollections = async () => {
      try {
        const res = await fetch('/api/collections/featured?limit=3');
        if (res.ok) {
          const data = await res.json();
          setFeaturedCollections(data.collections || []);
        }
      } catch (e) {
        console.error('Error fetching featured collections for feed page:', e);
      }
    };
    fetchFeaturedCollections();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const imageParam = urlParams.get('image') || urlParams.get('photo');
    if (imageParam && galleryImages.length > 0) {
      const targetImage = galleryImages.find(img => img.id === imageParam);
      if (targetImage) {
        setSelectedGalleryImage(targetImage);
        setShowGalleryModal(true);
        const idx = galleryImages.findIndex(img => img.id === imageParam);
        setSelectedImageIndex(idx >= 0 ? idx : 0);
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.get('image') !== imageParam) {
            url.searchParams.set('image', imageParam);
          }
          url.searchParams.delete('photo');
          window.history.replaceState({}, '', url);
        } catch {}
        if (user) {
          fetch(`/api/gallery/comments?imageId=${targetImage.id}&userId=${user.id}`)
            .then(response => response.json())
            .then(data => setImageComments(data.comments || []))
            .catch(error => console.error('Error loading comments:', error));
        }
      }
    }
  }, [galleryImages, user]);

  const featuredKingsCard = useMemo(() => {
    const candidates = galleryImages.filter(img => img.category === 'the-kings-card');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => {
      const bestScore = best.votes.upvotes - best.votes.downvotes;
      const currScore = curr.votes.upvotes - curr.votes.downvotes;
      if (currScore !== bestScore) return currScore > bestScore ? curr : best;
      return new Date(curr.createdAt).getTime() > new Date(best.createdAt).getTime() ? curr : best;
    });
  }, [galleryImages]);

  const featuredDiceThrone = useMemo(() => {
    const candidates = galleryImages.filter(img => img.category === 'dice-throne');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => {
      const bestScore = best.votes.upvotes - best.votes.downvotes;
      const currScore = curr.votes.upvotes - curr.votes.downvotes;
      if (currScore !== bestScore) return currScore > bestScore ? curr : best;
      return new Date(curr.createdAt).getTime() > new Date(best.createdAt).getTime() ? curr : best;
    });
  }, [galleryImages]);

  const closeImageModal = () => {
    setShowGalleryModal(false);
    setSelectedGalleryImage(null);
    setSelectedCollection(null);
    setImageComments([]);
    const url = new URL(window.location.href);
    url.searchParams.delete('image');
    url.searchParams.delete('photo');
    window.history.pushState({}, '', url);
  };

  const handleLike = async (imageId: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          voteType: selectedGalleryImage?.userVote === 'up' ? null : 'up',
          userId: user.id
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (selectedGalleryImage && selectedGalleryImage.id === imageId) {
          setSelectedGalleryImage(result.image);
        }
        setGalleryImages(prev => prev.map(img => img.id === imageId ? result.image : img));
        try { window.dispatchEvent(new CustomEvent('kd-gallery-image-updated', { detail: { image: result.image } })); } catch {}
      }
    } catch (error) {
      console.error('Error liking image:', error);
    }
  };

  const handleDeleteImage = () => {
    if (!isAuthenticated || !user || !selectedGalleryImage) return;
    setImageToDelete(selectedGalleryImage.id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteImage = async () => {
    if (!isAuthenticated || !user || !imageToDelete) return;
    try {
      const response = await fetch(`/api/gallery/${imageToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: user.id })
      });
      if (response.ok) {
        setGalleryImages(prev => prev.filter(image => image.id !== imageToDelete));
        if (selectedGalleryImage && selectedGalleryImage.id === imageToDelete) closeImageModal();
        try { window.dispatchEvent(new CustomEvent('kd-gallery-image-deleted', { detail: { imageId: imageToDelete } })); } catch {}
        showToast('Image deleted successfully', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete image', 'error');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      showToast('Error deleting image. Please try again.', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setImageToDelete(null);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/gallery/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedGalleryImage?.id,
          content,
          author: { id: user.id, name: user.username, avatar: user.avatar || '/DiceLogo.svg' }
        })
      });
      if (response.ok) {
        const data = await response.json();
        setImageComments(prev => [...prev, data.comment]);
        if (selectedGalleryImage) {
          const newCount = (selectedGalleryImage.comments || 0) + 1;
          setSelectedGalleryImage(prev => prev ? { ...prev, comments: newCount } : null);
          setGalleryImages(prev => prev.map(img => img.id === selectedGalleryImage.id ? { ...img, comments: newCount } as any : img));
          try { window.dispatchEvent(new CustomEvent('kd-gallery-comments-updated', { detail: { imageId: selectedGalleryImage.id, comments: newCount } })); } catch {}
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/gallery/comments/${commentId}?userId=${user.id}`, { method: 'DELETE' });
      if (response.ok) {
        setImageComments(prev => prev.filter(comment => comment.id !== commentId));
        if (selectedGalleryImage) {
          const newCount = Math.max((selectedGalleryImage.comments || 0) - 1, 0);
          setSelectedGalleryImage(prev => prev ? { ...prev, comments: newCount } : null);
          setGalleryImages(prev => prev.map(img => img.id === selectedGalleryImage.id ? { ...img, comments: newCount } as any : img));
          try { window.dispatchEvent(new CustomEvent('kd-gallery-comments-updated', { detail: { imageId: selectedGalleryImage.id, comments: newCount } })); } catch {}
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/gallery/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, userId: user.id })
      });
      if (response.ok) await refreshComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReplyToComment = async (commentId: string, content: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/gallery/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          content,
          author: { id: user.id, name: user.username, avatar: user.avatar || '/DiceLogo.svg' }
        })
      });
      if (response.ok) {
        await refreshComments();
        if (selectedGalleryImage) {
          setSelectedGalleryImage(prev => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);
        }
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  };

  const handleBlockUserFromGallery = async (authorId: string) => {
    if (!user || authorId === user.id) return;
    if (!confirm(t('blockUserConfirm') || 'Block this user? Their content will be hidden from your feed.')) return;
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', friendId: authorId }),
        credentials: 'include',
      });
      if (response.ok) {
        setGalleryImages(prev => prev.filter(img => img.author?.id !== authorId));
        closeImageModal();
        showToast(t('blockUserSuccess') || 'User blocked. Their content is hidden from your feed.', 'success');
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to block user', 'error');
      }
    } catch {
      showToast('Failed to block user', 'error');
    }
  };

  const handleReportComment = async (commentId: string, reason: string, details?: string) => {
    if (!user) return;
    try {
      await fetch('/api/gallery/comments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reason, details: details || '', reporterId: user.id })
      });
    } catch (error) {
      console.error('Error reporting comment:', error);
    }
  };

  const refreshComments = async () => {
    if (!selectedGalleryImage || !user) return;
    try {
      const response = await fetch(`/api/gallery/comments?imageId=${selectedGalleryImage.id}&userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setImageComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedGalleryImage) return;
    const currentIndex = galleryImages.findIndex(img => img.id === selectedGalleryImage.id);
    if (currentIndex === -1) return;
    const newIndex = direction === 'prev'
      ? (currentIndex > 0 ? currentIndex - 1 : galleryImages.length - 1)
      : (currentIndex < galleryImages.length - 1 ? currentIndex + 1 : 0);
    setSelectedGalleryImage(galleryImages[newIndex]);
    setSelectedImageIndex(newIndex);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3 text-center">
              <Users className="w-8 h-8 text-primary-500 flex-none" />
              <span className="inline-block text-center leading-tight">{t('communityFeed')}</span>
            </h2>
            <p className="text-dark-600 max-w-2xl mx-auto">
              {t('communityFeedDescription')}
            </p>
          </div>

          <div className="-mx-4 sm:mx-0">
            <Feed
              userId={user?.id}
              limit={20}
              featuredDiceThroneId={featuredDiceThrone?.id}
              featuredKingsCardId={featuredKingsCard?.id}
              featuredCollections={featuredCollections}
              onItemClick={(item) => {
                if (item.type === 'gallery') {
                  let galleryImage = galleryImages.find(img => img.id === item.id);
                  if (!galleryImage) {
                    galleryImage = {
                      id: item.id,
                      title: item.title || 'Gallery image',
                      description: (item as any).content || '',
                      imageUrl: item.imageUrl || item.thumbnailUrl || '',
                      thumbnailUrl: item.thumbnailUrl || item.imageUrl || '',
                      author: {
                        id: item.author.id,
                        name: item.author.username,
                        avatar: item.author.avatar || '/DiceLogo.svg',
                        reputation: item.author.reputation || 0
                      },
                      category: item.category,
                      createdAt: item.createdAt,
                      votes: item.votes,
                      userVote: item.userVote === 'up' ? 'up' : item.userVote === 'down' ? 'down' : undefined,
                      views: (item.engagement as any)?.views || 0,
                      downloads: (item.engagement as any)?.downloads || 0,
                      comments: item.engagement?.comments || 0
                    } as GalleryImage;
                  }
                  setSelectedCollection(null);
                  setSelectedGalleryImage(galleryImage);
                  const idx = galleryImages.findIndex(img => img.id === item.id);
                  setSelectedImageIndex(idx >= 0 ? idx : 0);
                  setShowGalleryModal(true);
                  const url = new URL(window.location.href);
                  url.searchParams.set('image', galleryImage.id);
                  url.searchParams.delete('photo');
                  window.history.pushState({}, '', url);
                  if (user) {
                    fetch(`/api/gallery/comments?imageId=${galleryImage.id}&userId=${user.id}`)
                      .then(response => response.json())
                      .then(data => setImageComments(data.comments || []))
                      .catch(error => console.error('Error loading comments:', error));
                  }
                } else if (item.type === 'post') {
                  window.location.href = `/forums/post/${item.id}`;
                }
              }}
              onCollectionClick={(collection) => {
                const matchingGallery = galleryImages.find(
                  img => img.imageUrl === collection.collectionPhoto || img.thumbnailUrl === collection.collectionPhoto
                );
                setSelectedCollection(collection);
                if (matchingGallery) {
                  setSelectedGalleryImage(matchingGallery);
                  setSelectedImageIndex(galleryImages.findIndex(img => img.id === matchingGallery.id));
                  setShowGalleryModal(true);
                  if (user) {
                    fetch(`/api/gallery/comments?imageId=${matchingGallery.id}&userId=${user.id}`)
                      .then(response => response.json())
                      .then(data => setImageComments(data.comments || []))
                      .catch(error => console.error('Error loading comments:', error));
                  }
                } else {
                  setSelectedGalleryImage(null);
                  setImageComments([]);
                  setShowGalleryModal(true);
                }
              }}
            />
          </div>
        </div>
      </section>

      {showGalleryModal && (selectedGalleryImage || selectedCollection) && (
        <ImageModal
          isOpen={showGalleryModal}
          onClose={closeImageModal}
          imageUrl={selectedGalleryImage?.imageUrl ?? selectedCollection!.collectionPhoto ?? ''}
          title={selectedGalleryImage?.title ?? `${selectedCollection!.username}'s collection`}
          description={selectedGalleryImage?.description ?? `${selectedCollection?.gameCount ?? 0} games in collection`}
          author={{
            id: selectedGalleryImage?.author?.id ?? (selectedCollection as any)?.userId,
            name: selectedGalleryImage?.author.name ?? selectedCollection!.username,
            avatar: selectedGalleryImage?.author.avatar ?? selectedCollection!.avatar ?? '/DiceLogo.svg',
            title: (selectedGalleryImage?.author as any)?.title ?? null
          }}
          authorId={selectedGalleryImage?.author?.id ?? (selectedCollection as any)?.userId}
          onBlockUser={selectedGalleryImage && user ? handleBlockUserFromGallery : undefined}
          createdAt={selectedGalleryImage?.createdAt ?? ''}
          category={selectedGalleryImage?.category ?? 'collections'}
          isFeatured={false}
          onLike={selectedGalleryImage ? () => handleLike(selectedGalleryImage.id) : undefined}
          onDelete={handleDeleteImage}
          onReport={() => {}}
          onEditDescription={() => {}}
          isLiked={selectedGalleryImage?.userVote === 'up'}
          canDelete={!!(selectedGalleryImage && isAuthenticated && user && selectedGalleryImage.author.id === user.id)}
          canReport={!!(isAuthenticated && user)}
          canEdit={!!(selectedGalleryImage && isAuthenticated && user && selectedGalleryImage.author.id === user.id)}
          likeCount={selectedGalleryImage?.votes?.upvotes ?? 0}
          imageId={selectedGalleryImage?.id}
          comments={imageComments}
          onAddComment={selectedGalleryImage ? handleAddComment : undefined}
          onDeleteComment={selectedGalleryImage ? handleDeleteComment : undefined}
          onLikeComment={selectedGalleryImage ? handleLikeComment : undefined}
          onReplyToComment={selectedGalleryImage ? handleReplyToComment : undefined}
          onReportComment={selectedGalleryImage ? handleReportComment : undefined}
          currentUserId={user?.id}
          isAuthenticated={isAuthenticated}
          currentUser={user}
          onRefreshComments={selectedGalleryImage ? refreshComments : undefined}
          allImages={selectedGalleryImage ? galleryImages : []}
          currentImageIndex={selectedImageIndex}
          onNavigate={selectedGalleryImage ? handleNavigate : undefined}
          secondaryAction={selectedCollection ? { label: t('seeWholeCollection'), href: `/collection/${selectedCollection.username}` } : undefined}
        />
      )}

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
    </div>
  );
}
