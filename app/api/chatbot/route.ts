import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    // Use the newer Responses API
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: message,
      store: true,
    });

    const botResponse = response.output_text || "Sorry, I couldn't generate a response.";

    return NextResponse.json({ response: botResponse });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return NextResponse.json(
      { error: 'Failed to get bot response' },
      { status: 500 }
    );
  }
}
