'use client';

import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  initialDelay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words' | 'lines';
  from?: { opacity?: number; y?: number; x?: number; scale?: number };
  to?: { opacity?: number; y?: number; x?: number; scale?: number };
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right';
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  onLetterAnimationComplete?: () => void;
}

const SplitText = ({
  text,
  className = '',
  delay = 100,
  initialDelay = 0,
  duration = 0.6,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete
}: SplitTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const animationCompletedRef = useRef(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      const el = ref.current;

      // Clear previous content and split text manually
      const originalText = text;
      el.innerHTML = '';
      
      let elements: HTMLElement[] = [];

      if (splitType === 'chars') {
        // Split by characters
        const chars = originalText.split('');
        chars.forEach((char, index) => {
          const span = document.createElement('span');
          span.className = 'split-char';
          span.style.display = 'inline-block';
          span.textContent = char === ' ' ? '\u00A0' : char; // Use non-breaking space for spaces
          el.appendChild(span);
          elements.push(span);
        });
      } else if (splitType === 'words') {
        // Split by words
        const words = originalText.split(' ');
        words.forEach((word, index) => {
          const span = document.createElement('span');
          span.className = 'split-word';
          span.style.display = 'inline-block';
          span.textContent = word;
          el.appendChild(span);
          elements.push(span);
          
          // Add space after word (except last)
          if (index < words.length - 1) {
            el.appendChild(document.createTextNode(' '));
          }
        });
      } else {
        // Split by lines (simple implementation)
        const lines = originalText.split('\n');
        lines.forEach((line, index) => {
          const span = document.createElement('span');
          span.className = 'split-line';
          span.style.display = 'block';
          span.textContent = line;
          el.appendChild(span);
          elements.push(span);
        });
      }

      // Calculate scroll trigger start position
      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      // Show the element now that it's split
      setIsReady(true);
      
      // Animate the elements
      // Check if element is already in viewport (for hero sections)
      const rect = el.getBoundingClientRect();
      const isInViewport = rect.top >= 0 && rect.top <= window.innerHeight;
      
      const tween = gsap.fromTo(
        elements,
        { ...from },
        {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          delay: (isInViewport ? 0.3 : 0) + (initialDelay / 1000), // Small delay for immediate animations + initial delay
          scrollTrigger: isInViewport ? undefined : {
            trigger: el,
            start,
            once: true,
          },
          onComplete: () => {
            animationCompletedRef.current = true;
            onLetterAnimationComplete?.();
          },
        }
      );

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
        tween.kill();
        setIsReady(false);
        // Restore original text
        el.textContent = originalText;
      };
    },
    {
      dependencies: [
        text,
        delay,
        initialDelay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
        onLetterAnimationComplete
      ],
      scope: ref
    }
  );

  const renderTag = () => {
    const style = {
      textAlign,
      display: isReady ? 'inline-block' : 'none', // Hide completely until text is split and ready to animate
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      willChange: 'transform, opacity'
    } as React.CSSProperties;
    const classes = `split-parent ${className}`;
    
    switch (tag) {
      case 'h1':
        return (
          <h1 ref={ref as React.RefObject<HTMLHeadingElement>} style={style} className={classes}>
            {text}
          </h1>
        );
      case 'h2':
        return (
          <h2 ref={ref as React.RefObject<HTMLHeadingElement>} style={style} className={classes}>
            {text}
          </h2>
        );
      case 'h3':
        return (
          <h3 ref={ref as React.RefObject<HTMLHeadingElement>} style={style} className={classes}>
            {text}
          </h3>
        );
      case 'h4':
        return (
          <h4 ref={ref as React.RefObject<HTMLHeadingElement>} style={style} className={classes}>
            {text}
          </h4>
        );
      case 'h5':
        return (
          <h5 ref={ref as React.RefObject<HTMLHeadingElement>} style={style} className={classes}>
            {text}
          </h5>
        );
      case 'h6':
        return (
          <h6 ref={ref as React.RefObject<HTMLHeadingElement>} style={style} className={classes}>
            {text}
          </h6>
        );
      default:
        return (
          <p ref={ref as React.RefObject<HTMLParagraphElement>} style={style} className={classes}>
            {text}
          </p>
        );
    }
  };
  return renderTag();
};

export default SplitText;

