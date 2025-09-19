// Color contrast utilities for ensuring readable text on any background

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate the relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Determine if text should be light or dark based on background color
 */
export function getTextColor(backgroundColor: string): 'light' | 'dark' {
  const whiteContrast = getContrastRatio(backgroundColor, '#ffffff');
  const blackContrast = getContrastRatio(backgroundColor, '#000000');
  
  // Use white text if it has better contrast, otherwise use black
  return whiteContrast > blackContrast ? 'light' : 'dark';
}

/**
 * Get appropriate text color classes based on background
 */
export function getTextColorClasses(backgroundColor: string): {
  primary: string;
  secondary: string;
  muted: string;
} {
  const textColor = getTextColor(backgroundColor);
  
  if (textColor === 'light') {
    return {
      primary: 'text-white',
      secondary: 'text-white/90',
      muted: 'text-white/70'
    };
  } else {
    return {
      primary: 'text-gray-900',
      secondary: 'text-gray-700',
      muted: 'text-gray-500'
    };
  }
}

/**
 * Get appropriate border color based on background
 */
export function getBorderColor(backgroundColor: string): string {
  const textColor = getTextColor(backgroundColor);
  return textColor === 'light' ? 'border-white/20' : 'border-gray-300';
}

/**
 * Get appropriate shadow color based on background
 */
export function getShadowColor(backgroundColor: string): string {
  const textColor = getTextColor(backgroundColor);
  return textColor === 'light' ? 'shadow-white/10' : 'shadow-gray-900/10';
}

/**
 * Check if a color combination meets WCAG AA standards (4.5:1 ratio)
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Get a high-contrast version of a color for better readability
 */
export function getHighContrastColor(backgroundColor: string): string {
  const textColor = getTextColor(backgroundColor);
  return textColor === 'light' ? '#ffffff' : '#000000';
}
