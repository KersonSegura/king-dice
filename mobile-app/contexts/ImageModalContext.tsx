/**
 * Tracks when an image/gallery modal is open in the WebView.
 * Used to hide the native header overlay so it doesn't cover the modal.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

type ImageModalContextType = {
  isImageModalOpen: boolean;
  setImageModalOpen: (open: boolean) => void;
};

const ImageModalContext = createContext<ImageModalContextType | null>(null);

export function ImageModalProvider({ children }: { children: React.ReactNode }) {
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  return (
    <ImageModalContext.Provider value={{ isImageModalOpen, setImageModalOpen }}>
      {children}
    </ImageModalContext.Provider>
  );
}

export function useImageModal() {
  const ctx = useContext(ImageModalContext);
  if (!ctx) return { isImageModalOpen: false, setImageModalOpen: () => {} };
  return ctx;
}
