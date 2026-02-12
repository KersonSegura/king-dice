import { NextRequest, NextResponse } from 'next/server';
import { ImageModerationResult } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // In production, you would integrate with Google Cloud Vision API
    // For now, we'll use a simulated moderation
    const moderationResult = await simulateImageModeration(imageUrl);

    return NextResponse.json(moderationResult);
  } catch (error) {
    console.error('Image moderation error:', error);
    return NextResponse.json(
      { error: 'Moderation failed' },
      { status: 500 }
    );
  }
}

async function simulateImageModeration(imageUrl: string): Promise<ImageModerationResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));

  // Accept data URLs (base64) from gallery upload - they look like "data:image/jpeg;base64,..."
  const isDataUrl = typeof imageUrl === 'string' && imageUrl.startsWith('data:image/');
  const validImageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  const isFileUrlWithExtension = validImageExtensions.test(imageUrl);

  if (!isDataUrl && !isFileUrlWithExtension) {
    return {
      isAppropriate: false,
      confidence: 0.9,
      flags: ['invalid_file_type'],
      nsfw: false,
      violence: false,
      weapons: false,
      reason: 'Tipo de archivo no válido'
    };
  }

  // For data URLs we have no path to scan; treat as appropriate until real Vision API is used
  if (isDataUrl) {
    return {
      isAppropriate: true,
      confidence: 0.5,
      flags: [],
      nsfw: false,
      violence: false,
      weapons: false,
    };
  }

  // For external URLs, check for obviously inappropriate path segments only (no random rejection)
  const lowerUrl = imageUrl.toLowerCase();
  const nsfwIndicators = ['nsfw', 'adult', 'explicit', 'nude'];
  const violenceIndicators = ['violence', 'blood', 'gore', 'weapon'];
  const weaponIndicators = ['gun', 'knife', 'weapon', 'armor'];

  const isNsfw = nsfwIndicators.some(indicator => lowerUrl.includes(indicator));
  const hasViolence = violenceIndicators.some(indicator => lowerUrl.includes(indicator));
  const hasWeapons = weaponIndicators.some(indicator => lowerUrl.includes(indicator));
  const isInappropriate = isNsfw || hasViolence || hasWeapons;

  return {
    isAppropriate: !isInappropriate,
    confidence: 0.8,
    flags: isInappropriate ? ['inappropriate_content'] : [],
    nsfw: isNsfw,
    violence: hasViolence,
    weapons: hasWeapons,
    reason: isInappropriate ? 'Contenido inapropiado detectado' : undefined
  };
} 