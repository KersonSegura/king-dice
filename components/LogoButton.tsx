import Image from 'next/image';
import Link from 'next/link';

interface LogoButtonProps {
  href: string;
  logo: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LogoButton({ 
  href, 
  logo, 
  alt, 
  children, 
  className = '',
  size = 'md' 
}: LogoButtonProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <Link 
      href={href} 
      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${className}`}
    >
      <div className={`relative ${sizeClasses[size]}`}>
        <Image
          src={logo}
          alt={alt}
          fill
          className="object-contain"
        />
      </div>
      <span>{children}</span>
    </Link>
  );
} 