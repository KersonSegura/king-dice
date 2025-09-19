import { NextRequest, NextResponse } from 'next/server';
import { TextModerationResult } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // In production, you would integrate with OpenAI Moderation API
    // For now, we'll use a simulated moderation
    const moderationResult = await simulateTextModeration(text);

    return NextResponse.json(moderationResult);
  } catch (error) {
    console.error('Text moderation error:', error);
    return NextResponse.json(
      { error: 'Moderation failed' },
      { status: 500 }
    );
  }
}

async function simulateTextModeration(text: string): Promise<TextModerationResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const lowerText = text.toLowerCase();
  
  // Check for genuinely inappropriate content
  const inappropriateWords = [
    // Profanity and vulgar language
    'fuck', 'fucking', 'fucker', 'shit', 'bitch', 'ass', 'asshole', 'dick', 'cock', 'pussy', 'cunt',
    'damn', 'goddamn', 'hell', 'bastard', 'whore', 'slut', 'motherfucker', 'faggot', 'dyke',
    
    // Racial slurs and offensive terms
    'nigger', 'nigga', 'nazi', 'kike', 'spic', 'chink', 'gook', 'wetback', 'towelhead', 'raghead',
    'sandnigger', 'porchmonkey', 'junglebunny', 'coon', 'jigaboo', 'spook', 'wop', 'dago',
    'kraut', 'hun', 'jap', 'gook', 'chink', 'slant', 'zipperhead', 'gook', 'slope',
    
    // Insults and derogatory terms
    'stupid', 'idiot', 'moron', 'retard', 'retarded', 'dumb', 'dumbass', 'dumbfuck', 'dumbass',
    'fool', 'foolish', 'imbecile', 'cretin', 'halfwit', 'dimwit', 'nitwit', 'numbskull',
    'bonehead', 'blockhead', 'airhead', 'meathead', 'pinhead', 'knucklehead', 'dunce',
    'jackass', 'pig', 'scum', 'trash', 'garbage', 'waste', 'useless', 'worthless', 'pathetic', 'pitiful', 'disgusting',
    'vile', 'filthy', 'dirty', 'nasty', 'gross', 'revolting', 'repulsive', 'abhorrent',
    
    // Hate speech and discriminatory terms
    'racist', 'sexist', 'homophobic', 'transphobic', 'bigot', 'bigoted', 'prejudiced',
    'discriminatory', 'hateful', 'hate',
    
    // Spam and commercial content
    'spam', 'scam', 'illegal', 'drugs', 'buy now', 'click here', 'free money', 'make money fast',
    'weight loss', 'viagra'
  ];

  const foundInappropriate = inappropriateWords.some(word => 
    lowerText.includes(word)
  );

  // Check for spam indicators
  const spamIndicators = [
    'buy now', 'click here', 'free money', 'make money fast',
    'weight loss', 'viagra'
  ];

  const isSpam = spamIndicators.some(indicator => 
    lowerText.includes(indicator)
  );

  // Calculate toxicity score (0-1) - using real-world thresholds
  const toxicityScore = foundInappropriate ? 0.8 : 
                       isSpam ? 0.6 : 0.1; // Default to very low toxicity

  // Use more reasonable confidence levels (like Reddit/Discord)
  const confidence = foundInappropriate ? 0.75 : 
                    isSpam ? 0.65 : 0.45; // Much lower default confidence

  return {
    isAppropriate: !foundInappropriate && !isSpam,
    confidence: confidence,
    flags: foundInappropriate ? ['inappropriate_content'] : 
           isSpam ? ['spam'] : [],
    toxicity: toxicityScore,
    spam: isSpam,
    hate: foundInappropriate,
    reason: foundInappropriate ? 'Contenido inapropiado detectado' :
            isSpam ? 'Contenido spam detectado' : undefined
  };
} 