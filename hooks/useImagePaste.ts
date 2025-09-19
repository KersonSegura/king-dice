import { useCallback } from 'react';

interface UseImagePasteOptions {
  onImagePaste: (imageData: string, imageType: string) => void;
  maxImageSize?: number; // in bytes
  allowedTypes?: string[];
}

export const useImagePaste = ({
  onImagePaste,
  maxImageSize = 5 * 1024 * 1024, // 5MB default
  allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
}: UseImagePasteOptions) => {
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        // Check if image type is allowed
        if (!allowedTypes.includes(item.type)) {
          console.warn(`Image type ${item.type} not allowed`);
          return;
        }

        const file = item.getAsFile();
        if (!file) return;

        // Check file size
        if (file.size > maxImageSize) {
          console.warn(`Image too large: ${file.size} bytes (max: ${maxImageSize})`);
          return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            onImagePaste(result, item.type);
          }
        };
        reader.readAsDataURL(file);
        
        // Prevent default paste behavior
        event.preventDefault();
        break;
      }
    }
  }, [onImagePaste, maxImageSize, allowedTypes]);

  return { handlePaste };
};
