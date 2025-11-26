// This wrapper ensures React is loaded before React Three Fiber
// React must be imported first to be available when React Three Fiber module is evaluated

// Import React first - this ensures React internals are available
import * as React from 'react';
import 'react-dom/client';

// Now import React Three Fiber - React should be available
export { Canvas } from '@react-three/fiber';
export { ContactShadows, Environment, OrbitControls } from '@react-three/drei';

