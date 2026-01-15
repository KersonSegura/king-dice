import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const username = params?.username as string;
  
  // Try to fetch tracker data for metadata
  let trackerName = 'Game Night Tracker';
  let playerCount = 0;
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingdice.gg';
    const response = await fetch(`${baseUrl}/api/game-night-tracker?username=${username}`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.tracker) {
        trackerName = data.tracker.tracker_name || trackerName;
        if (data.tracker.game_tabs && Array.isArray(data.tracker.game_tabs) && data.tracker.game_tabs.length > 0) {
          playerCount = data.tracker.game_tabs[0].players?.length || 0;
        } else {
          playerCount = data.tracker.players?.length || 0;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching tracker for metadata:', error);
  }

  const title = `${trackerName} by @${username} | King Dice`;
  const description = playerCount > 0 
    ? `View ${playerCount} player${playerCount !== 1 ? 's' : ''} game night statistics and victory records`
    : 'Track your game night statistics and victory records';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://kingdice.gg/game-night-tracker/${username}`,
      siteName: 'King Dice',
      images: [
        {
          url: `https://kingdice.gg/api/og/game-night-tracker?username=${username}`,
          width: 1200,
          height: 630,
          alt: trackerName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://kingdice.gg/api/og/game-night-tracker?username=${username}`],
    },
  };
}

export default function GameNightTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
