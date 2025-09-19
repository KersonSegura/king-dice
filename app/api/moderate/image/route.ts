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

  // Basic file type validation
  const validImageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  const isValidImage = validImageExtensions.test(imageUrl);

  if (!isValidImage) {
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

  // Simulate content analysis based on URL patterns
  const lowerUrl = imageUrl.toLowerCase();
  
  // Check for potentially inappropriate content based on URL patterns
  const nsfwIndicators = ['nsfw', 'adult', 'explicit', 'nude'];
  const violenceIndicators = ['violence', 'blood', 'gore', 'weapon'];
  const weaponIndicators = ['gun', 'knife', 'weapon', 'armor'];

  const isNsfw = nsfwIndicators.some(indicator => lowerUrl.includes(indicator));
  const hasViolence = violenceIndicators.some(indicator => lowerUrl.includes(indicator));
  const hasWeapons = weaponIndicators.some(indicator => lowerUrl.includes(indicator));

  // Random simulation for more realistic results
  const randomFactor = Math.random();
  const simulatedNsfw = randomFactor < 0.05; // 5% chance
  const simulatedViolence = randomFactor < 0.03; // 3% chance
  const simulatedWeapons = randomFactor < 0.02; // 2% chance

  const isInappropriate = isNsfw || hasViolence || hasWeapons || 
                        simulatedNsfw || simulatedViolence || simulatedWeapons;

  return {
    isAppropriate: !isInappropriate,
    confidence: 0.8,
    flags: isInappropriate ? ['inappropriate_content'] : [],
    nsfw: isNsfw || simulatedNsfw,
    violence: hasViolence || simulatedViolence,
    weapons: hasWeapons || simulatedWeapons,
    reason: isInappropriate ? 'Contenido inapropiado detectado' : undefined
  };
} 