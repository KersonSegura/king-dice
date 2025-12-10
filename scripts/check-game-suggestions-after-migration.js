/**
 * Script to check for matching game suggestions and send notifications
 * Run this after migrating games to production to notify users whose suggestions were added
 * 
 * Usage:
 *   node scripts/check-game-suggestions-after-migration.js
 * 
 * Or for a specific game:
 *   node scripts/check-game-suggestions-after-migration.js "Here to Slay"
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

// Initialize Supabase client (connects to production)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

// Import createNotification function logic (simplified)
async function createNotification(params) {
  const { userId, type, entityType, entityId, url, message } = params;
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      actor_id: null,
      entity_type: entityType || null,
      entity_id: entityId ?? null,
      url: url || null,
      message: message || null,
      read: false,
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.error('createNotification error:', e);
    return { success: false };
  }
}

async function checkGameSuggestions(gameNameFilter = null) {
  try {
    console.log('🔍 Checking for game suggestions that match added games...\n');

    // Get all games from database (production)
    let games;
    if (gameNameFilter) {
      games = await prisma.game.findMany({
        where: {
          OR: [
            { nameEn: { contains: gameNameFilter, mode: 'insensitive' } },
            { nameEs: { contains: gameNameFilter, mode: 'insensitive' } },
            { name: { contains: gameNameFilter, mode: 'insensitive' } }
          ]
        }
      });
      console.log(`🔍 Filtering for games matching: "${gameNameFilter}"`);
    } else {
      // Get recently added games (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      games = await prisma.game.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100 // Limit to last 100 games
      });
      console.log(`📋 Checking last ${games.length} games (or last 7 days)\n`);
    }

    if (games.length === 0) {
      console.log('ℹ️ No games found to check.');
      return;
    }

    let totalNotificationsSent = 0;

    for (const game of games) {
      const gameNameEn = game.nameEn || '';
      const gameNameEs = game.nameEs || '';
      const gameNameLegacy = game.name || '';
      const gameNamesToCheck = [gameNameEn, gameNameEs, gameNameLegacy].filter(Boolean);

      console.log(`\n🎮 Checking game: "${gameNameEn || gameNameLegacy}" (ID: ${game.id})`);

      for (const gameName of gameNamesToCheck) {
        if (!gameName) continue;

        try {
          // Find matching suggestions (case-insensitive)
          let { data: matchingSuggestions, error: suggestionsError } = await supabaseAdmin
            .from('game_suggestions')
            .select('id, user_id, username, game_name, status')
            .ilike('game_name', gameName)
            .eq('status', 'pending');

          // If no exact match, try pattern match
          if ((!matchingSuggestions || matchingSuggestions.length === 0) && !suggestionsError) {
            const patternMatch = await supabaseAdmin
              .from('game_suggestions')
              .select('id, user_id, username, game_name, status')
              .ilike('game_name', `%${gameName}%`)
              .eq('status', 'pending');
            
            if (!patternMatch.error) {
              matchingSuggestions = patternMatch.data;
              suggestionsError = patternMatch.error;
            }
          }

          if (suggestionsError) {
            console.error(`  ❌ Error checking suggestions for "${gameName}":`, suggestionsError);
            continue;
          }

          if (matchingSuggestions && matchingSuggestions.length > 0) {
            console.log(`  ✅ Found ${matchingSuggestions.length} matching suggestion(s) for "${gameName}"`);

            for (const suggestion of matchingSuggestions) {
              // Update suggestion status
              const updateResult = await supabaseAdmin
                .from('game_suggestions')
                .update({ 
                  status: 'added',
                  updated_at: new Date().toISOString()
                })
                .eq('id', suggestion.id);

              if (updateResult.error) {
                console.error(`  ❌ Error updating suggestion ${suggestion.id}:`, updateResult.error);
                continue;
              }

              console.log(`  ✅ Updated suggestion ${suggestion.id} status to 'added'`);

              // Notify the user
              if (suggestion.user_id) {
                const notificationResult = await createNotification({
                  userId: suggestion.user_id,
                  type: 'system',
                  entityType: 'game',
                  entityId: game.id,
                  url: `/game/${game.id}`,
                  message: `Great news! The game "${gameName}" you suggested has been added to our database. Thanks for helping us grow! 🎲`
                });

                if (notificationResult.success) {
                  console.log(`  📧 ✅ Notification sent to user ${suggestion.user_id} (${suggestion.username})`);
                  totalNotificationsSent++;
                } else {
                  console.error(`  ❌ Failed to send notification to user ${suggestion.user_id}`);
                }
              } else {
                console.log(`  ⚠️  Suggestion ${suggestion.id} has no user_id (anonymous), skipping notification`);
              }
            }
          } else {
            console.log(`  ℹ️  No matching suggestions found for "${gameName}"`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing game name "${gameName}":`, error);
        }
      }
    }

    console.log(`\n✅ Done! Sent ${totalNotificationsSent} notification(s).`);

  } catch (error) {
    console.error('❌ Error checking game suggestions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const gameNameFilter = process.argv[2] || null;
checkGameSuggestions(gameNameFilter);

