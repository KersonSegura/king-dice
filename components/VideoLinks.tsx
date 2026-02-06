'use client';

import React from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { parseMultipleVideoUrls } from '@/lib/video-utils';

interface VideoLinksProps {
  videoUrls: string;
  gameName: string;
}

export default function VideoLinks({ videoUrls, gameName }: VideoLinksProps) {
  const videos = parseMultipleVideoUrls(videoUrls);
  
  if (videos.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-3 w-full" style={{ width: '100%', minWidth: '100%' }}>
      {videos.map((video, index) => (
        <div key={index} className="mb-6 w-full" style={{ width: '100%', minWidth: '100%' }}>
          {/* Video Link Button - Centered */}
          <div className="flex justify-center mb-3">
            <a
              href={video.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg text-sm font-medium hover:bg-[#fbae17] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 mr-2" />
              Video Tutorial {videos.length > 1 ? `${index + 1}` : ''}
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
          
          {/* Embedded Video Player - Full Width */}
          <div className="w-full">
            <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={video.embedUrl}
                title={`${gameName} - Video Tutorial ${index + 1}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
