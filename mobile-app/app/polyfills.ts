/**
 * Polyfills for Three.js / GLTFLoader in React Native.
 * Must be imported before any Three.js code.
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

  // Leave createImageBitmap undefined so GLTFLoader uses TextureLoader (better for RN)
}
