'use client';

import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export default function ExpandableText({ 
  text, 
  maxLength = 150, 
  className = '' 
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }
  
  const truncatedText = text.slice(0, maxLength);
  const remainingText = text.slice(maxLength);
  
  return (
    <p className={className}>
      {isExpanded ? text : truncatedText}
      {!isExpanded && (
        <>
          <span className="text-gray-500">...</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800 font-medium ml-1"
          >
            See more
          </button>
        </>
      )}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-blue-600 hover:text-blue-800 font-medium ml-1"
        >
          See less
        </button>
      )}
    </p>
  );
}
