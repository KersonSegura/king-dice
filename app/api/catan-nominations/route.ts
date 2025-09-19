import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Insert nomination into database
    const nomination = await prisma.catanNomination.create({
      data: {
        mapData: JSON.stringify(mapData),
        imageData: imageBase64,
        customRules: JSON.stringify(customRules),
        votes: 0,
        status: 'pending',
        userId: userId || null,
        username: username || 'Anonymous',
        avatar: avatar || null
      }
    });

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
      { error: 'Failed to save nomination' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all nominations with pagination
    const nominations = await prisma.catanNomination.findMany({
      orderBy: [
        { votes: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50,
      select: {
        id: true,
        mapData: true,
        imageData: true,
        customRules: true,
        createdAt: true,
        votes: true,
        status: true,
        userId: true,
        username: true,
        avatar: true
      }
    });

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
      { error: 'Failed to fetch nominations' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ API - Clearing all nominations...');
    
    // Delete all existing nominations
    const deleteResult = await prisma.catanNomination.deleteMany({});
    
    console.log('✅ API - Cleared nominations:', {
      count: deleteResult.count,
      message: 'All nominations deleted successfully'
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} nominations`,
      deletedCount: deleteResult.count
    });

  } catch (error) {
    console.error('❌ API - Error clearing nominations:', error);
    return NextResponse.json(
      { error: 'Failed to clear nominations' },
      { status: 500 }
    );
  }
}
