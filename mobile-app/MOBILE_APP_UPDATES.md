# Mobile App Updates – Website Parity (Icons, Nav, Routes)

## Summary
- **Icons:** The app now uses the **same SVG icons as the website** (`public/*.svg`) rendered via **react-native-svg** (no custom icons).
- **Navigation:** Header hamburger menu matches the **website mobile nav** (sections, labels, links): Home, Board Games, Forums, Gallery, Shop, Features, Account, Join Discord.
- **Routes:** Every menu link has a route. Most open **in-app WebViews** of the corresponding website page (all-games, forums, gallery, shop, game-night-tracker, etc.) so behavior matches the site.

## New Dependency
- **react-native-webview** – used for in-app WebView screens.
- **react-native-svg** – renders the website SVG icons.

**Install:**
```powershell
cd "E:\King Dice\mobile-app"
npm install
```

## Icons (SVGs)
- **Config:** `config/icons.ts` maps icon names to website SVG paths (e.g. `Home` → `HomeIcon.svg`).
- **Component:** `components/SvgIcon.tsx` renders SVGs via `SvgUri` from `react-native-svg` using `API_BASE_URL + /path` (served from Next.js `public/`).
- **Usage:** Header menu and tab bar use `SvgIcon` for nav items. Search, menu, and close stay as Ionicons (no dedicated website SVGs).

**Ensure Next.js is running** when developing so the app can load the SVGs (and WebViews) from the API origin.

## Routes Added
| Path | Screen | Notes |
|------|--------|-------|
| `/all-games` | WebView | website /all-games |
| `/hot-games` | WebView | website /hot-games |
| `/top-ranked` | WebView | website /top-ranked |
| `/forums` | WebView | website /forums |
| `/community-gallery` | WebView | website /community-gallery |
| `/shop` | WebView | website /shop |
| `/game-night-tracker` | WebView | website /game-night-tracker |
| `/my-dice` | WebView | website /my-dice |
| `/catan-map-generator` | WebView | website /catan-map-generator |
| `/pixel-canvas` | WebView | website /pixel-canvas |
| `/boardle` | WebView | website /boardle |
| `/dice-roller` | WebView | website /dice-roller |
| `/digital-corner` | WebView | website /digital-corner |
| `/settings` | WebView | website /settings |
| `/profile/[username]` | WebView | website /profile/… |
| `/collection/[username]` | WebView | website /collection/… |
| `/game/[id]` | WebView | website /game/… |
| `/gallery/[id]` | WebView | opens /community-gallery |

## Tabs
Tabs use **website SVGs**: Home, Forums, Gallery, Collection, Profile.
The Forums/Gallery/Profile/Collection tabs now load the **website pages** in-app (WebView) for parity.

## Menu Highlights
- **Join Discord** opens the Discord invite link externally; menu item is styled like the website (blue button).
- **Home** uses `replace` so it doesn’t stack over WebView screens.
- **Account** section: My Profile, My Collection, Settings, Logout (with website icons).
