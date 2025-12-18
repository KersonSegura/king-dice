'use client';

import Image from 'next/image';

type LoadingLogoProps = {
  size?: number;
  text?: string;
  subText?: string;
  className?: string;
};

export default function LoadingLogo({ size = 32, text, subText, className }: LoadingLogoProps) {
  return (
    <div className={className ?? 'flex flex-col items-center justify-center'}>
      <Image
        src="/DiceLogo.svg"
        alt="King Dice Logo"
        width={size}
        height={size}
        className="animate-pulse"
        priority={false}
      />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
      {subText && <p className="mt-1 text-xs text-gray-400">{subText}</p>}
    </div>
  );
}


