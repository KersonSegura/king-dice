/**
 * ProfileIconOn.svg, ProfileIconOff.svg and LockIcon.svg bundled inline (from public/).
 * Renders without network - works on login/register when API may be unreachable.
 */

import React from 'react';
import { SvgXml } from 'react-native-svg';

// ProfileIconOn.svg - inlined styles (cls-1 fill #fbae17)
const PROFILE_ICON_ON_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g><circle fill="#fbae17" cx="499.9962" cy="284.4392" r="178.8393"/><path fill="#fbae17" d="M789.6014,838.4157c-13.9689,17.993-30.1592,27.03-39.2449,31.9828-25.7746,14.05-49.4827,16.8707-59.5641,17.9719-70.8415,7.7382-159.2281,5.9736-201.1393,5.575-11.0754-.1053-87.9682-.7722-152.7983-5.6483a290.9863,290.9863,0,0,1-73.844-17.41A124.8761,124.8761,0,0,1,234.5,855.923a119.2422,119.2422,0,0,1-26.09-25.21c-15.9274-21.2052-20.0694-42.6071-22.8134-57.6815-.6988-3.8393-3.2235-18.431-2.2985-46.9961a407.1811,407.1811,0,0,1,9.634-76.5826c5.1122-22.0424,17.8246-74.53,57.2168-130.425a357.6267,357.6267,0,0,1,81.3262-82.5977c8.949,10.0833,70.1875,76.76,170.5013,75.9224,98.103-.8188,157.5528-65.5739,166.7358-75.9224a366.5331,366.5331,0,0,1,83.918,86.8523c51.02,74.3436,59.1459,145.9067,63.0853,180.6,2.4361,21.4552,3.7846,48.9581-3.4508,80.9218C804.6323,818.5231,792.5647,834.5987,789.6014,838.4157Z"/></g></svg>`;

// ProfileIconOff.svg - inlined styles (cls-1 fill #9b9b9b)
const PROFILE_ICON_OFF_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g><circle fill="#9b9b9b" cx="499.9962" cy="284.4392" r="178.8393"/><path fill="#9b9b9b" d="M789.6014,838.4157c-13.9689,17.993-30.1592,27.03-39.2449,31.9828-25.7746,14.05-49.4827,16.8707-59.5641,17.9719-70.8415,7.7382-159.2281,5.9736-201.1393,5.575-11.0754-.1053-87.9682-.7722-152.7983-5.6483a290.9863,290.9863,0,0,1-73.844-17.41A124.8761,124.8761,0,0,1,234.5,855.923a119.2422,119.2422,0,0,1-26.09-25.21c-15.9274-21.2052-20.0694-42.6071-22.8134-57.6815-.6988-3.8393-3.2235-18.431-2.2985-46.9961a407.1811,407.1811,0,0,1,9.634-76.5826c5.1122-22.0424,17.8246-74.53,57.2168-130.425a357.6267,357.6267,0,0,1,81.3262-82.5977c8.949,10.0833,70.1875,76.76,170.5013,75.9224,98.103-.8188,157.5528-65.5739,166.7358-75.9224a366.5331,366.5331,0,0,1,83.918,86.8523c51.02,74.3436,59.1459,145.9067,63.0853,180.6,2.4361,21.4552,3.7846,48.9581-3.4508,80.9218C804.6323,818.5231,792.5647,834.5987,789.6014,838.4157Z"/></g></svg>`;

// LockIcon.svg - inlined styles (cls-1 #9b9b9b, cls-2 #fbae17, cls-3 #111)
const LOCK_ICON_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g><path fill="#9b9b9b" d="M728.1167,338.0333c0-125.4791-101.7209-227.2-227.2-227.2s-227.2,101.7209-227.2,227.2v127.6h63.4v-127.6a163.8,163.8,0,1,1,327.6,0V462.1667h63.4Z"/><rect fill="#fbae17" x="177.1833" y="452.3" width="645.6333" height="436.8667" rx="48.8167"/><circle fill="#111" cx="500.7167" cy="605.4333" r="53.6"/><path fill="#111" d="M549.9167,769.1h-98.4L469.39,646.8207h62.653Z"/></g></svg>`;

function applyColor(xml: string, color: string): string {
  return xml.replace(/\bfill="[^"]*"/g, `fill="${color}"`);
}

type Props = { size?: number; color?: string };

export function ProfileIconOnSvg({ size = 20, color }: Props) {
  const xml = color ? applyColor(PROFILE_ICON_ON_XML, color) : PROFILE_ICON_ON_XML;
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function ProfileIconOffSvg({ size = 20, color }: Props) {
  const xml = color ? applyColor(PROFILE_ICON_OFF_XML, color) : PROFILE_ICON_OFF_XML;
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function LockIconSvg({ size = 20, color }: Props) {
  const xml = color ? applyColor(LOCK_ICON_XML, color) : LOCK_ICON_XML;
  return <SvgXml xml={xml} width={size} height={size} />;
}
