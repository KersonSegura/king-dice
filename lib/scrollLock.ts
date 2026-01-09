// Utility to lock/unlock body scrolling
// Handles both desktop and mobile scrolling

let scrollLockCount = 0;
let savedScrollPosition = 0;
let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
let wheelHandler: ((e: WheelEvent) => void) | null = null;
let extraLockedElements: HTMLElement[] = [];

function getEventTargetElement(e: Event): Element | null {
  const anyEvent = e as any;
  const rawTarget = anyEvent?.target;
  if (rawTarget instanceof Element) return rawTarget;

  try {
    const path = (anyEvent?.composedPath?.() || []) as any[];
    const firstElement = path.find((n) => n instanceof Element) as Element | undefined;
    if (firstElement) return firstElement;
  } catch {
    // ignore
  }

  // Fallback: try parentElement if target is a Text node
  try {
    if (rawTarget && typeof rawTarget === 'object' && 'parentElement' in rawTarget) {
      const parent = (rawTarget as any).parentElement;
      if (parent instanceof Element) return parent;
    }
  } catch {
    // ignore
  }

  return null;
}

function findScrollLockRootFromEventTarget(target: Element | null, e: Event): Element | null {
  if (target?.closest) {
    const root = target.closest('[data-scroll-lock-root]');
    if (root) return root;
  }

  try {
    const path = ((e as any)?.composedPath?.() || []) as any[];
    const rootInPath = path.find((n) => n instanceof Element && (n as Element).hasAttribute('data-scroll-lock-root')) as Element | undefined;
    return rootInPath || null;
  } catch {
    return null;
  }
}

function findScrollableContainer(element: Element | null, stopAt: Element | null): Element | null {
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
    if (stopAt && current === stopAt) {
      break;
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
    // Save current scroll position (for debugging/telemetry; we no longer force-restore)
    savedScrollPosition = Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0
    );
    
    // Apply scroll lock styles
    // IMPORTANT: Avoid `position: fixed` on body to prevent iOS Safari scroll-jump-to-top behavior.
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    // Prevent scroll chaining on modern browsers
    document.documentElement.style.setProperty('overscroll-behavior', 'none', 'important');
    document.body.style.setProperty('overscroll-behavior', 'none', 'important');

    // Some layouts scroll on a wrapper element (e.g. main/#__next/body child) instead of body.
    // Lock those too so background can't scroll behind modals.
    extraLockedElements = [];
    try {
      const candidates: Array<Element | null> = [
        document.getElementById('__next'),
        document.querySelector('main'),
        document.body?.firstElementChild
      ];
      for (const el of candidates) {
        if (!el) continue;
        if (!(el instanceof HTMLElement)) continue;
        if (el === document.body) continue;
        if (el === document.documentElement) continue;
        // Avoid duplicates
        if (extraLockedElements.includes(el)) continue;
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('overscroll-behavior', 'none', 'important');
        extraLockedElements.push(el);
      }
    } catch {
      // ignore
    }
    
    // Prevent touch scrolling on mobile (but allow scrolling within scrollable containers)
    touchMoveHandler = (e: TouchEvent) => {
      const target = getEventTargetElement(e);
      const root = findScrollLockRootFromEventTarget(target, e);
      const scrollable = findScrollableContainer(target, root);
      
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
      const target = getEventTargetElement(e);
      const root = findScrollLockRootFromEventTarget(target, e);
      const scrollable = findScrollableContainer(target, root);
      
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
    // Remove scroll lock styles (restore CSS defaults)
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overscroll-behavior');
    document.body.style.removeProperty('overscroll-behavior');

    // Restore any extra locked elements
    if (extraLockedElements.length > 0) {
      for (const el of extraLockedElements) {
        try {
          el.style.removeProperty('overflow');
          el.style.removeProperty('overscroll-behavior');
        } catch {
          // ignore
        }
      }
      extraLockedElements = [];
    }
    
    // Remove event listeners
    if (touchMoveHandler) {
      document.removeEventListener('touchmove', touchMoveHandler);
      touchMoveHandler = null;
    }
    if (wheelHandler) {
      document.removeEventListener('wheel', wheelHandler);
      wheelHandler = null;
    }
    
    // Do NOT force scroll restoration; keep the user's position stable.
  }
}
