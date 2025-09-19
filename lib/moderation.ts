// Content Moderation Utilities
export interface ModerationResult {
  isAppropriate: boolean;
  confidence: number;
  flags: string[];
  reason?: string;
}

export interface TextModerationResult extends ModerationResult {
  toxicity?: number;
  spam?: boolean;
  hate?: boolean;
}

export interface ImageModerationResult extends ModerationResult {
  nsfw?: boolean;
  violence?: boolean;
  weapons?: boolean;
}

// Text Moderation using OpenAI Moderation API
export async function moderateText(text: string): Promise<TextModerationResult> {
  try {
    // In production, you would use the actual OpenAI API
    // For now, we'll simulate the moderation
    const response = await fetch('/api/moderate/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Moderation API failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Text moderation error:', error);
    // Fallback to basic keyword filtering
    return basicTextModeration(text);
  }
}

// Image Moderation using Google Cloud Vision API
export async function moderateImage(file: File | string): Promise<ImageModerationResult> {
  try {
    // If it's a File object, convert to base64 for the API
    let imageData;
    if (file instanceof File) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      imageData = `data:${file.type};base64,${base64}`;
    } else {
      imageData = file;
    }

    const response = await fetch('/api/moderate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl: imageData }),
    });

    if (!response.ok) {
      throw new Error('Image moderation API failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Image moderation error:', error);
    // Fallback to basic image validation
    const fileName = file instanceof File ? file.name : file;
    return basicImageModeration(fileName);
  }
}

// Basic text moderation (fallback)
function basicTextModeration(text: string): TextModerationResult {
  const inappropriateWords = [
    'spam', 'scam', 'hack', 'crack', 'illegal', 'drugs', 'weapons',
    // Add more inappropriate words as needed
  ];

  const lowerText = text.toLowerCase();
  const foundInappropriate = inappropriateWords.some(word => 
    lowerText.includes(word)
  );

  return {
    isAppropriate: !foundInappropriate,
    confidence: foundInappropriate ? 0.8 : 0.6,
    flags: foundInappropriate ? ['inappropriate_content'] : [],
    toxicity: foundInappropriate ? 0.7 : 0.2,
    spam: lowerText.includes('spam') || lowerText.includes('buy now'),
    hate: false,
  };
}

// Basic image moderation (fallback)
function basicImageModeration(imageUrl: string): ImageModerationResult {
  // Basic validation - check file type and size
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imageUrl);
  
  return {
    isAppropriate: isImage,
    confidence: isImage ? 0.5 : 0.9,
    flags: isImage ? [] : ['invalid_file_type'],
    nsfw: false,
    violence: false,
    weapons: false,
  };
}

// User reputation system
export interface UserReputation {
  userId: string;
  score: number;
  level: 'new' | 'trusted' | 'moderator' | 'admin';
  postsCount: number;
  reportsCount: number;
  lastActivity: Date;
}

export function calculateUserLevel(reputation: UserReputation): UserReputation['level'] {
  if (reputation.score >= 1000 && reputation.postsCount >= 50) return 'admin';
  if (reputation.score >= 500 && reputation.postsCount >= 20) return 'moderator';
  if (reputation.score >= 100 && reputation.postsCount >= 10) return 'trusted';
  return 'new';
}

// Content reporting system
export interface Report {
  id: string;
  contentType: 'forum_post' | 'gallery_image' | 'comment';
  contentId: string;
  reporterId: string;
  reason: 'inappropriate' | 'spam' | 'hate' | 'violence' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export const REPORT_REASONS = {
  inappropriate: 'Inappropriate Content',
  spam: 'Spam or Commercial Content',
  hate: 'Hate Speech',
  violence: 'Violence or Harmful Content',
  other: 'Other',
} as const; 