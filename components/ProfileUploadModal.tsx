'use client';

import React, { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProfileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, description: string, category: string) => Promise<void>;
  category: 'favorite-card' | 'collection-photo';
  isUploading: boolean;
}

export default function ProfileUploadModal({
  isOpen,
  onClose,
  onUpload,
  category,
  isUploading
}: ProfileUploadModalProps) {
  const tProfile = useTranslations('profile');
  const tCommon = useTranslations('common');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const currentCategory = {
    categoryId: category === 'favorite-card' ? 'the-kings-card' : 'collections',
    title: category === 'favorite-card' ? tProfile('uploadFavoriteCardTitle') : tProfile('uploadCollectionPhotoTitle'),
    categoryName: category === 'favorite-card' ? tProfile('uploadCategoryKingsCard') : tProfile('uploadCategoryCollections'),
    placeholder: category === 'favorite-card' ? tProfile('uploadFavoriteCardPlaceholder') : tProfile('uploadCollectionPhotoPlaceholder'),
    blurb: category === 'favorite-card' ? tProfile('uploadFavoriteCardBlurb') : tProfile('uploadCollectionPhotoBlurb')
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    
    await onUpload(selectedFile, description, currentCategory.categoryId);
    
    // Reset form
    setSelectedFile(null);
    setDescription('');
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDescription('');
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[250] p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">{currentCategory.title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Category Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-blue-900">{tProfile('uploadCategoryLabel')}: {currentCategory.categoryName}</span>
            </div>
            <p className="text-sm text-blue-700">{currentCategory.blurb}</p>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tProfile('uploadSelectImage')}
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <ImageIcon className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                  <p className="text-xs text-green-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    {tProfile('uploadRemoveFile')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{tProfile('uploadDropHere')}</p>
                    <p className="text-xs mt-1">{tProfile('uploadFileTypes')}</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    {tProfile('uploadChooseFile')}
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tProfile('uploadDescriptionOptional')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={currentCategory.placeholder}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              {category === 'favorite-card' ? tProfile('uploadTellCommunityFavoriteCard') : tProfile('uploadTellCommunityCollection')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isUploading}
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className={`px-6 py-2 text-white rounded-lg transition-colors ${
              !selectedFile || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? `${tProfile('uploading')}...` : tProfile('uploadAndPost')}
          </button>
        </div>
      </div>
    </div>
  );
}
