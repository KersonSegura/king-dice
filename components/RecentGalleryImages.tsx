'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  downloads: number;
  comments: number;
  tags: string[];
}

interface RecentGalleryImagesProps {
  limit?: number;
}

export default function RecentGalleryImages({ limit = 4 }: RecentGalleryImagesProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const tGallery = useTranslations('gallery');
  const tCommon = useTranslations('common');

  const categoryLabel = (category: string) => {
    // Try gallery translations first, then common (used elsewhere), then raw
    try {
      const anyT = tGallery as any;
      if (typeof anyT?.has === 'function' && anyT.has(category)) return tGallery(category as any);
    } catch {}
    if (category === 'the-kings-card') return tGallery('cardOfTheWeek');
    if (category === 'dice-throne' || category === 'dice-of-the-week') return tGallery('diceOfTheWeek');
    try {
      const anyC = tCommon as any;
      if (typeof anyC?.has === 'function' && anyC.has(`categories.${category}`)) return tCommon(`categories.${category}` as any);
    } catch {}
    return category;
  };

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        const response = await fetch('/api/gallery');
        const data = await response.json();
        
        if (data.images) {
          // Get the most recent images
          const recentImages = data.images.slice(0, limit);
          setImages(recentImages);
        }
      } catch (error) {
        console.error('Error fetching recent gallery images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentImages();
  }, [limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
          No images yet
        </div>
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
          No images yet
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {images.map((image) => (
        <Link
          key={image.id}
          href={`/community-gallery?image=${image.id}`}
          className="relative group cursor-pointer"
        >
          <div className="aspect-square rounded-lg overflow-hidden">
            <Image
              src={image.thumbnailUrl}
              alt={image.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
              unoptimized={image.thumbnailUrl?.includes('supabase.co')}
            />
          </div>
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
            {image.votes.upvotes - image.votes.downvotes} {tCommon('likes')}
          </div>
          <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
            {categoryLabel(image.category)}
          </div>
        </Link>
      ))}
    </div>
  );
}
