'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

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
  const tCommon = useTranslations('common');
  
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
            {tCommon('seeMore')}
          </button>
        </>
      )}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-blue-600 hover:text-blue-800 font-medium ml-1"
        >
          {tCommon('seeLess')}
        </button>
      )}
    </p>
  );
}
