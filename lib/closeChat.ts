// Utility function to close chat on mobile when navigation occurs

export function closeChatOnNavigation() {
  if (typeof window !== 'undefined') {
    // Only dispatch on mobile devices
    if (window.innerWidth < 768) {
      // Use setTimeout to defer the event dispatch and avoid React render conflicts
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('closeChatOnNavigation'));
      }, 0);
    }
  }
}

// Utility function to close menus on mobile when chat opens
export function closeMenusOnChatOpen() {
  if (typeof window !== 'undefined') {
    // Only dispatch on mobile devices
    if (window.innerWidth < 768) {
      // Use setTimeout to defer the event dispatch and avoid React render conflicts
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('closeMenusOnChatOpen'));
      }, 0);
    }
  }
}

