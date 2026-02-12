/**
 * Renders website SVG icons (from public/*.svg) via API origin.
 * Uses the same .svgs as the website for consistent branding.
 */

import React, { useEffect, useState } from 'react';
import { ViewStyle, ImageStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { API_BASE_URL } from '../config/api';
import { ICONS, type IconName } from '../config/icons';

type Props = {
  name: IconName;
  size?: number;
  style?: ViewStyle | ImageStyle;
  /** Icon to show when fetch fails (avoids empty slot). No fallback on nested use. */
  fallback?: IconName;
  /** Override fill/stroke color (e.g. '#ffffff' for white on yellow background). */
  color?: string;
};

const svgCache = new Map<string, string>();

function inlineSvgStyles(svg: string): string {
  const styleMatch = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) return svg;
  const styleText = styleMatch[1];
  const classMap: Record<string, { fill?: string; stroke?: string; strokeWidth?: string; strokeLinecap?: string; strokeLinejoin?: string }> = {};
  const classRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(styleText))) {
    const className = match[1];
    const rules = match[2];
    const fillMatch = rules.match(/fill:\s*([^;]+);?/);
    const strokeMatch = rules.match(/stroke:\s*([^;]+);?/);
    const strokeWidthMatch = rules.match(/stroke-width:\s*([^;]+);?/);
    const strokeLinecapMatch = rules.match(/stroke-linecap:\s*([^;]+);?/);
    const strokeLinejoinMatch = rules.match(/stroke-linejoin:\s*([^;]+);?/);
    classMap[className] = {
      fill: fillMatch?.[1]?.trim(),
      stroke: strokeMatch?.[1]?.trim(),
      strokeWidth: strokeWidthMatch?.[1]?.trim(),
      strokeLinecap: strokeLinecapMatch?.[1]?.trim(),
      strokeLinejoin: strokeLinejoinMatch?.[1]?.trim(),
    };
  }

  let output = svg.replace(/<style[^>]*>[\s\S]*?<\/style>/, '');
  Object.entries(classMap).forEach(([className, attrs]) => {
    const parts: string[] = [];
    if (attrs.fill) parts.push(`fill="${attrs.fill}"`);
    if (attrs.stroke) parts.push(`stroke="${attrs.stroke}"`);
    if (attrs.strokeWidth) parts.push(`stroke-width="${attrs.strokeWidth}"`);
    if (attrs.strokeLinecap) parts.push(`stroke-linecap="${attrs.strokeLinecap}"`);
    if (attrs.strokeLinejoin) parts.push(`stroke-linejoin="${attrs.strokeLinejoin}"`);
    if (parts.length === 0) return;
    const replacement = parts.join(' ');
    output = output.replace(new RegExp(`class="${className}"`, 'g'), replacement);
    output = output.replace(new RegExp(`class='${className}'`, 'g'), replacement);
  });
  return output;
}

function applySvgColor(xml: string, color: string): string {
  return xml
    .replace(/\bfill="[^"]*"/g, `fill="${color}"`)
    .replace(/\bstroke="[^"]*"/g, `stroke="${color}"`)
    .replace(/\bfill:\s*[^;]+/g, `fill: ${color}`)
    .replace(/\bstroke:\s*[^;]+/g, `stroke: ${color}`);
}

export function SvgIcon({ name, size = 24, style, fallback, color }: Props) {
  const path = ICONS[name];
  const base = API_BASE_URL.replace(/\/$/, '');
  const uri = path ? `${base}/${path}` : '';
  const [xml, setXml] = useState<string | null>(uri ? (svgCache.get(uri) || null) : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uri) return;
    setFailed(false);
    let isMounted = true;
    if (svgCache.has(uri)) {
      setXml(svgCache.get(uri) || null);
      return;
    }
    fetch(uri)
      .then((r) => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.text();
      })
      .then((text) => {
        const transformed = inlineSvgStyles(text);
        svgCache.set(uri, transformed);
        if (isMounted) setXml(transformed);
      })
      .catch(() => {
        if (isMounted) {
          setXml(null);
          setFailed(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [uri]);

  if (!path) return null;

  if (!xml) {
    if (failed && fallback && fallback !== name) {
      return <SvgIcon name={fallback} size={size} style={style} color={color} />;
    }
    return null;
  }
  const finalXml = color ? applySvgColor(xml, color) : xml;
  return (
    <SvgXml xml={finalXml} width={size} height={size} style={style as any} />
  );
}

export default SvgIcon;
