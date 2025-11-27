import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Simple in-memory rate limiting (for production, use Redis or a proper rate limiter)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per user

function checkRateLimit(userId: string | null): boolean {
  if (!userId) return true; // Allow unauthenticated users but log it
  
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client only when needed
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const { message, userId } = await request.json();
    
    // Rate limiting
    if (!checkRateLimit(userId || null)) {
      console.warn(`⚠️ Rate limit exceeded for user: ${userId || 'anonymous'}`);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait a minute before trying again.',
        },
        { status: 429 }
      );
    }
    
    // Log usage for monitoring
    console.log(`📊 Chatbot API call - User: ${userId || 'anonymous'}, Message length: ${message?.length || 0} chars`);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // System prompt to make the bot specialized in board games and bilingual
    const systemPrompt = `You are Dice-Bot, a bilingual board game expert assistant for the King Dice platform.

You can answer in both English and Spanish. Always respond in the same language the user asks in.

You ONLY answer questions about:
- Board games, game rules, strategies, and mechanics / Juegos de mesa, reglas, estrategias y mecánicas
- Game recommendations and comparisons / Recomendaciones y comparaciones de juegos
- King Dice platform features (Pixel Canvas, Catan Maps, Boardle, My Dice) / Características de King Dice
- User profiles and collections / Perfiles de usuarios y colecciones
- Game database and community features / Base de datos de juegos y características de la comunidad

For off-topic questions, politely redirect in the user's language:
- English: "I'm here to help with board games and King Dice features! Ask me about games, rules, or our platform."
- Spanish: "¡Estoy aquí para ayudar con juegos de mesa y características de King Dice! Pregúntame sobre juegos, reglas o nuestra plataforma."

Always be helpful, friendly, and knowledgeable about board games. When relevant, mention that users can find more games in the King Dice database at /boardgames.`;

    // Use the Chat Completions API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const botResponse = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    // Log token usage
    const usage = completion.usage;
    if (usage) {
      console.log(`📊 Token usage - User: ${userId || 'anonymous'}, Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    }

    return NextResponse.json({ response: botResponse });
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    
    // Handle specific OpenAI API errors
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'OpenAI API quota exceeded',
          message: 'The chatbot service is temporarily unavailable due to API quota limits. Please try again later or contact support.',
          details: 'OpenAI API quota has been exceeded. Please check your OpenAI account billing and plan.'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    if (error?.status === 401) {
      return NextResponse.json(
        { 
          error: 'OpenAI API authentication failed',
          message: 'The chatbot service is temporarily unavailable. Please try again later.',
          details: 'OpenAI API key is invalid or missing.'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to get bot response',
        message: 'Sorry, I\'m having trouble connecting right now. Please try again later!',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
