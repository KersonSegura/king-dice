import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mapData, imageBase64, customRules, userId, username, avatar } = body;

    console.log('🔍 API - Received nomination data:', {
      hasMapData: !!mapData,
      hasImageBase64: !!imageBase64,
      hasCustomRules: !!customRules,
      userId,
      username,
      avatar
    });

    // Log the actual map data content
    console.log('🔍 API - Map Data Details:', {
      mapDataType: mapData.mapType,
      mapDataTerrainsLength: mapData.terrains?.length,
      mapDataNumbersLength: mapData.numbers?.length,
      firstFewTerrains: mapData.terrains?.slice(0, 5),
      firstFewNumbers: mapData.numbers?.slice(0, 5)
    });

    // Log the custom rules content
    console.log('🔍 API - Custom Rules Details:', {
      customRulesMapType: customRules.mapType,
      customRulesTileCount: customRules.tileCount,
      customRulesImageStyle: customRules.imageStyle
    });

    // Validate required fields
    if (!mapData || !imageBase64 || !customRules) {
      return NextResponse.json(
        { error: 'Missing required fields: mapData, imageBase64, or customRules' },
        { status: 400 }
      );
    }

    // Try camelCase first (matches Prisma schema with updatedAt), then snake_case as fallback
    let nomination: any = null;
    let createError: any = null;
    const now = new Date().toISOString();

    // Try camelCase first (Prisma schema shows updatedAt is required)
    const { data: dataCamel, error: errorCamel } = await supabaseAdmin
      .from('catan_nominations')
      .insert({
        mapData: JSON.stringify(mapData),
        imageData: imageBase64,
        customRules: JSON.stringify(customRules),
        votes: 0,
        status: 'pending',
        userId: userId || null,
        username: username || 'Anonymous',
        avatar: avatar || null,
        createdAt: now,
        updatedAt: now
      })
      .select('id, mapData, imageData, customRules, votes, status, userId, username, avatar, createdAt, updatedAt')
      .single();

    if (!errorCamel && dataCamel) {
      nomination = dataCamel;
    } else {
      // Try snake_case as fallback
      console.log('CamelCase insert failed, trying snake_case:', errorCamel);
      const { data: dataSnake, error: errorSnake } = await supabaseAdmin
        .from('catan_nominations')
        .insert({
          map_data: JSON.stringify(mapData),
          image_data: imageBase64,
          custom_rules: JSON.stringify(customRules),
          votes: 0,
          status: 'pending',
          user_id: userId || null,
          username: username || 'Anonymous',
          avatar: avatar || null,
          created_at: now,
          updated_at: now
        })
        .select('id, map_data, image_data, custom_rules, votes, status, user_id, username, avatar, created_at, updated_at')
        .single();

      if (!errorSnake && dataSnake) {
        // Map snake_case response to camelCase
        nomination = {
          id: dataSnake.id,
          mapData: dataSnake.map_data,
          imageData: dataSnake.image_data,
          customRules: dataSnake.custom_rules,
          votes: dataSnake.votes,
          status: dataSnake.status,
          userId: dataSnake.user_id,
          username: dataSnake.username,
          avatar: dataSnake.avatar,
          createdAt: dataSnake.created_at,
          updatedAt: dataSnake.updated_at
        };
      } else {
        createError = errorSnake || errorCamel;
      }
    }

    if (createError || !nomination) {
      console.error('❌ API - Error saving nomination:', createError);
      return NextResponse.json(
        { 
          error: 'Failed to save nomination',
          details: createError?.message || 'Unknown error',
          code: createError?.code
        },
        { status: 500 }
      );
    }

    console.log('✅ API - Created nomination:', {
      id: nomination.id,
      userId: nomination.userId,
      username: nomination.username
    });

    return NextResponse.json({
      success: true,
      nominationId: nomination.id,
      message: 'Map nominated successfully!'
    });

  } catch (error) {
    console.error('❌ API - Error saving nomination:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save nomination',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Try snake_case first (based on database migration), then camelCase as fallback
    let nominations: any[] = [];
    let fetchError: any = null;

    // Try snake_case first (matches database migration)
    const { data: dataSnake, error: errorSnake } = await supabaseAdmin
      .from('catan_nominations')
      .select('id, map_data, image_data, custom_rules, votes, status, user_id, username, avatar, created_at')
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (!errorSnake && dataSnake) {
      // Map snake_case response to camelCase
      nominations = dataSnake.map((nom: any) => ({
        id: nom.id,
        mapData: nom.map_data,
        imageData: nom.image_data,
        customRules: nom.custom_rules,
        votes: nom.votes,
        status: nom.status,
        userId: nom.user_id,
        username: nom.username,
        avatar: nom.avatar,
        createdAt: nom.created_at
      }));
    } else {
      // Try camelCase as fallback
      console.log('Snake_case select failed, trying camelCase:', errorSnake);
      const { data: dataCamel, error: errorCamel } = await supabaseAdmin
        .from('catan_nominations')
        .select('id, mapData, imageData, customRules, votes, status, userId, username, avatar, createdAt')
        .order('votes', { ascending: false })
        .order('createdAt', { ascending: false })
        .limit(50);

      if (!errorCamel && dataCamel) {
        nominations = dataCamel;
      } else {
        fetchError = errorCamel || errorSnake;
      }
    }

    if (fetchError) {
      console.error('Error fetching nominations:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch nominations',
          details: fetchError.message,
          code: fetchError.code
        },
        { status: 500 }
      );
    }

    // Ensure all nominations have a username (for backward compatibility)
    const nominationsWithUsernames = nominations.map(nomination => ({
      ...nomination,
      username: nomination.username || 
        (nomination.userId ? `User_${nomination.userId.slice(-6)}` : 'Anonymous')
    }));

    // Log the first nomination to debug user data
    if (nominationsWithUsernames.length > 0) {
      console.log('First nomination user data:', {
        id: nominationsWithUsernames[0].id,
        userId: nominationsWithUsernames[0].userId,
        username: nominationsWithUsernames[0].username,
        avatar: nominationsWithUsernames[0].avatar
      });
    }

    return NextResponse.json({
      success: true,
      nominations: nominationsWithUsernames
    });

  } catch (error) {
    console.error('Error fetching nominations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch nominations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ API - Clearing all nominations...');
    
    // Delete all existing nominations
    const { data, error } = await supabaseAdmin
      .from('catan_nominations')
      .delete()
      .neq('id', 0); // Delete all (neq with impossible condition)
    
    if (error) {
      console.error('❌ API - Error clearing nominations:', error);
      return NextResponse.json(
        { 
          error: 'Failed to clear nominations',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    console.log('✅ API - Cleared nominations:', {
      message: 'All nominations deleted successfully'
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully deleted all nominations',
      deletedCount: data?.length || 0
    });

  } catch (error) {
    console.error('❌ API - Error clearing nominations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear nominations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
