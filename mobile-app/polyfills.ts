/**
 * Polyfills for Three.js / GLTFLoader in React Native.
 * Must be imported before any Three.js code.
 * NOTE: Keep this file outside app/ - Expo Router treats app/ files as routes.
 */
import { TextDecoder, TextEncoder } from 'fast-text-encoding';

if (typeof global !== 'undefined') {
  const g = global as any;
  if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
  if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;

  if (typeof g.document === 'undefined') {
    const noop = () => {};
    const stubEl = () => ({
      addEventListener: noop,
      removeEventListener: noop,
      appendChild: noop,
      removeChild: noop,
      setAttribute: noop,
      getContext: () => null,
      style: {},
      width: 0,
      height: 0,
      clientWidth: 0,
      clientHeight: 0,
      naturalWidth: 0,
      naturalHeight: 0,
      src: '',
      crossOrigin: '',
      onload: null,
      onerror: null,
      getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, left: 0 }),
    });
    g.document = {
      createElement: stubEl,
      createElementNS: stubEl,
      body: { appendChild: noop, removeChild: noop, style: {} },
      addEventListener: noop,
      removeEventListener: noop,
      getElementById: () => null,
      createEvent: () => ({ initEvent: noop }),
    };
  }
  if (typeof g.window === 'undefined') {
    g.window = g;
  }

  // Three.js GLTFLoader calls navigator.userAgent.indexOf() - RN can have undefined userAgent
  if (typeof g.navigator === 'undefined') {
    g.navigator = {} as any;
  }
  if (typeof (g.navigator as any).userAgent === 'undefined') {
    (g.navigator as any).userAgent = 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36';
  }

  // atob not available in React Native/Hermes; needed for base64 → binary (e.g. GLB loading)
  if (typeof g.atob === 'undefined') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    g.atob = (input: string): string => {
      const str = input.replace(/\s/g, '').replace(/=+$/, '');
      let output = '';
      for (let i = 0; i < str.length; i += 4) {
        const a = chars.indexOf(str[i] ?? '');
        const b = chars.indexOf(str[i + 1] ?? '');
        const c = i + 2 < str.length ? chars.indexOf(str[i + 2]) : -1;
        const d = i + 3 < str.length ? chars.indexOf(str[i + 3]) : -1;
        if (a < 0 || b < 0) throw new DOMException('Invalid base64', 'InvalidCharacterError');
        const n = (a << 18) | (b << 12) | ((c >= 0 ? c : 0) << 6) | (d >= 0 ? d : 0);
        if (d >= 0) output += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255);
        else if (c >= 0) output += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255);
        else output += String.fromCharCode((n >> 16) & 255);
      }
      return output;
    };
  }

  // Leave createImageBitmap undefined so GLTFLoader uses TextureLoader (better for RN)
}
