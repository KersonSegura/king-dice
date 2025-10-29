import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select('id, name, nameEn, nameEs, year, yearRelease, image, imageUrl, minPlayers, maxPlayers, durationMinutes, minPlayTime, maxPlayTime')
      .order('name', { ascending: true })
      .order('nameEn', { ascending: true });

    if (error) {
      console.error('Error querying games:', error);
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }

    // Normalize the data for consistent frontend usage
    const normalizedGames = (games || []).map(game => ({
      id: game.id,
      name: game.name || game.nameEn,
      nameEn: game.nameEn,
      nameEs: game.nameEs,
      year: game.year || game.yearRelease,
      image: game.image || game.imageUrl,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      durationMinutes: game.durationMinutes || game.maxPlayTime || 60
    }));

    return NextResponse.json(normalizedGames);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}