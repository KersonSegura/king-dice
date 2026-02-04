/**
 * Website SVG icons (from public/*.svg).
 * Use with SvgIcon; base URL = API_BASE_URL (Next.js serves public at /).
 */
export const ICONS = {
  // Nav
  Home: 'HomeIcon.svg',
  Forums: 'ForumsIcon.svg',
  Gallery: 'GalleryIcon.svg?v=2',
  Shop: 'ShopIcon.svg?v=4',
  ShopGray: 'ShopIconGray.svg?v=2',
  Feed: 'AllPostsIcon.svg',
  Community: 'CommunityIcon.svg',
  Chat: 'ChatIcon.svg',
  ChatGray: 'ChatIconGray.svg',
  DiceBotSmallYellow: 'DiceBotIconSmallYellow.svg',
  DiceBotSmallGray: 'DiceBotIconSmallGray.svg',
  CommunityFeed: 'CommunityFeedIcon.svg?v=4',
  CommunityFeedGray: 'CommunityFeedIconGray.svg',
  // Board games
  AllGames: 'AllIcon.svg',
  HotGames: 'FireIcon.svg',
  TopRanked: 'TrophyIcon.svg',
  BoardGames: 'BoardGamesIcon.svg',
  // Features
  MyDice: 'MyDiceIcon.svg',
  GameNightTracker: 'GameNightTrackerIconWhite.svg',
  Catan: 'CatanIcon.svg',
  Boardle: 'BoardleIcon.svg',
  DiceRoller: 'DiceRollerIcon.svg',
  DigitalCorner: 'PCIcon.svg',
  PixelCanvas: 'PixelCanvasIconWhiteSquare.svg',
  PixelCanvasPage: 'PixelCanvasIconYellowStroke.svg',
  // User / Auth (same as web LoginModal)
  Profile: 'ProfileIconOn.svg',
  ProfileOff: 'ProfileIconOff.svg',
  ProfileWhite: 'ProfileIconWhite.svg',
  Lock: 'LockIcon.svg',
  MyCollection: 'MyCollectionIcon.svg',
  Notifications: 'NotificationsIcon.svg',
  NotificationsGray: 'NotificationsIconGray.svg?v=2',
  Settings: 'SettingsIcon.svg',
  SignOut: 'SingOutIcon.svg',
  DiceLogo: 'DiceLogo.svg',
  DefaultAvatar: 'DefaultDiceAvatar.svg',
} as const;

export type IconName = keyof typeof ICONS;
