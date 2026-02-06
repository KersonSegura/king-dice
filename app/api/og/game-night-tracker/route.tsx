import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const username = searchParams.get('username') || 'user';

  try {
    // Fetch tracker data
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingdice.gg';
    const response = await fetch(`${baseUrl}/api/game-night-tracker?username=${username}`, {
      cache: 'no-store',
    });

    let trackerName = 'Game Night Tracker';
    let players: any[] = [];
    let totalVictories = 0;

    if (response.ok) {
      const data = await response.json();
      if (data.tracker) {
        trackerName = data.tracker.tracker_name || trackerName;
        if (data.tracker.game_tabs && Array.isArray(data.tracker.game_tabs) && data.tracker.game_tabs.length > 0) {
          players = data.tracker.game_tabs[0].players || [];
        } else {
          players = data.tracker.players || [];
        }
        totalVictories = players.reduce((sum, p) => sum + (p.victories || 0), 0);
      }
    }

    // Get top 3 players by victories
    const topPlayers = [...players]
      .sort((a, b) => (b.victories || 0) - (a.victories || 0))
      .slice(0, 3);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            backgroundImage: 'linear-gradient(to bottom, #fbae17, #fbae17)',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '40px',
              width: '100%',
              maxWidth: '1000px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}
              >
                {trackerName}
              </div>
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#6b7280',
                marginBottom: '30px',
              }}
            >
              by @{username}
            </div>
            {topPlayers.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {topPlayers.map((player, index) => {
                  const victories = player.victories || 0;
                  const percentage = totalVictories > 0 ? Math.round((victories / totalVictories) * 100) : 0;
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px',
                        backgroundColor: index === 0 ? '#fef3c7' : '#f9fafb',
                        borderRadius: '12px',
                        borderLeft: index === 0 ? '4px solid #fbae17' : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '32px',
                            fontWeight: 'bold',
                            color: '#fbae17',
                            width: '40px',
                            textAlign: 'center',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div
                          style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                          }}
                        >
                          {player.name || 'Unnamed Player'}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '24px',
                            color: '#6b7280',
                          }}
                        >
                          {victories} {victories === 1 ? 'win' : 'wins'}
                        </div>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#fbae17',
                          }}
                        >
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '24px',
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '40px',
                }}
              >
                No players added yet
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    // Return a simple fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fbae17',
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          Game Night Tracker by @{username}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
