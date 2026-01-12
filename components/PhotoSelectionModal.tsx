'use client';

import React, { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Upload, Image as ImageIcon, Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  author: { id: string; name: string; avatar: string; reputation?: number };
  category: string;
  createdAt: string;
  votes?: { upvotes: number; downvotes: number };
}

interface PhotoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExisting: (imageUrl: string) => Promise<void>;
  onUploadNew: () => void;
  category: 'favorite-card' | 'collection-photo';
  userImages: GalleryImage[];
  isLoadingImages?: boolean;
}

export default function PhotoSelectionModal({
  isOpen,
  onClose,
  onSelectExisting,
  onUploadNew,
  category,
  userImages,
  isLoadingImages = false
}: PhotoSelectionModalProps) {
  const tProfile = useTranslations('profile');
  const tCommon = useTranslations('common');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCategory = {
    title: category === 'favorite-card' ? tProfile('selectFavoriteCardTitle') : tProfile('selectCollectionPhotoTitle'),
    uploadNewLabel: category === 'favorite-card' ? tProfile('uploadNewFavoriteCard') : tProfile('uploadNewCollectionPhoto'),
    selectExistingLabel: tProfile('selectFromExistingPosts'),
    noImagesMessage: tProfile('noImagesToSelect')
  };

  const handleSelectImage = async (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsSubmitting(true);
    try {
      await onSelectExisting(imageUrl);
      handleClose();
    } catch (error) {
      console.error('Error selecting image:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedImageUrl(null);
    onClose();
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[250] p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 shrink-0">
          <h2 className="text-2xl font-semibold text-gray-900">{currentCategory.title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Two Options: Upload New or Select Existing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload New Photo Option */}
            <button
              onClick={() => {
                handleClose();
                onUploadNew();
              }}
              disabled={isSubmitting}
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{currentCategory.uploadNewLabel}</h3>
                  <p className="text-sm text-gray-600">{tProfile('uploadNewPhotoDescription')}</p>
                </div>
              </div>
            </button>

            {/* Select from Existing Option */}
            <div className="p-6 border-2 border-gray-300 rounded-lg bg-gray-50">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{currentCategory.selectExistingLabel}</h3>
                  <p className="text-sm text-gray-600">{tProfile('selectFromExistingDescription')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Images Grid */}
          {isLoadingImages ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">{tCommon('loading')}...</div>
            </div>
          ) : userImages.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">{currentCategory.noImagesMessage}</p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{tProfile('yourPostedPhotos')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {userImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleSelectImage(image.imageUrl)}
                    disabled={isSubmitting}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageUrl === image.imageUrl
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <img
                      src={image.thumbnailUrl || image.imageUrl}
                      alt={image.title || 'Gallery image'}
                      className="w-full h-full object-cover"
                    />
                    {selectedImageUrl === image.imageUrl && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            {tCommon('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
