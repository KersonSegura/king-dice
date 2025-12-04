// Utility to lock/unlock body scrolling
// Handles both desktop and mobile scrolling

let scrollLockCount = 0;
let savedScrollPosition = 0;
let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
let wheelHandler: ((e: WheelEvent) => void) | null = null;

function findScrollableContainer(element: Element | null): Element | null {
  if (!element) return null;
  
  let current: Element | null = element;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    
    if (
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflow === 'auto' ||
      overflow === 'scroll'
    ) {
      const scrollHeight = current.scrollHeight;
      const clientHeight = current.clientHeight;
      if (scrollHeight > clientHeight) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
}

function canScrollInDirection(scrollable: Element, deltaY: number): boolean {
  const scrollTop = scrollable.scrollTop;
  const scrollHeight = scrollable.scrollHeight;
  const clientHeight = scrollable.clientHeight;
  const maxScroll = scrollHeight - clientHeight;
  
  const canScrollUp = scrollTop > 0;
  const canScrollDown = scrollTop < maxScroll - 1; // -1 for rounding errors
  
  if (deltaY < 0) {
    // Scrolling up
    return canScrollUp;
  } else if (deltaY > 0) {
    // Scrolling down
    return canScrollDown;
  }
  return false;
}

export function lockBodyScroll() {
  scrollLockCount++;
  
  if (scrollLockCount === 1) {
    // Save current scroll position
    savedScrollPosition = window.scrollY || window.pageYOffset;
    
    // Apply scroll lock styles - use position fixed to completely lock scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Prevent touch scrolling on mobile (but allow scrolling within scrollable containers)
    touchMoveHandler = (e: TouchEvent) => {
      const target = e.target as Element;
      const scrollable = findScrollableContainer(target);
      
      if (!scrollable) {
        // No scrollable container - prevent all scrolling
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Check if scrollable container is at a boundary
      const scrollTop = scrollable.scrollTop;
      const scrollHeight = scrollable.scrollHeight;
      const clientHeight = scrollable.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop >= maxScroll - 1;
      
      // If at boundary, we need to prevent scroll chaining
      // The container's CSS overscroll-behavior should help, but we'll also prevent here
      if (isAtTop || isAtBottom) {
        // At boundary - the container will handle its own scrolling
        // But we need to prevent any further scroll events from propagating
        // This is handled by CSS overscroll-behavior: contain on the container
      }
    };
    
    // Prevent wheel scrolling (but allow scrolling within scrollable containers)
    wheelHandler = (e: WheelEvent) => {
      const target = e.target as Element;
      const scrollable = findScrollableContainer(target);
      
      if (!scrollable) {
        // No scrollable container - prevent all scrolling
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Check if we can scroll in the direction of the wheel event
      if (!canScrollInDirection(scrollable, e.deltaY)) {
        // Can't scroll in this direction - prevent to stop body scroll
        e.preventDefault();
        e.stopPropagation();
        // Also stop immediate propagation to prevent any parent handlers
        e.stopImmediatePropagation();
        return;
      }
      
      // Allow the scroll to happen within the container
      // But stop propagation to prevent it from reaching body
      e.stopPropagation();
    };
    
    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('wheel', wheelHandler, { passive: false });
  }
}

export function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  
  if (scrollLockCount === 0) {
    // Remove scroll lock styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    
    // Remove event listeners
    if (touchMoveHandler) {
      document.removeEventListener('touchmove', touchMoveHandler);
      touchMoveHandler = null;
    }
    if (wheelHandler) {
      document.removeEventListener('wheel', wheelHandler);
      wheelHandler = null;
    }
    
    // Restore scroll position
    window.scrollTo(0, savedScrollPosition);
  }
}
