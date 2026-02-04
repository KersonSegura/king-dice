# Functionality Checklist – King Dice

This document summarizes the status of all main pages and features for verification.

## Website (Next.js) Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ | Home page |
| `/feed` | ✅ | Standalone community feed |
| `/chat` | ✅ | Dedicated chat page |
| `/forums` | ✅ | Forums list |
| `/forums/post/[id]` | ✅ | Forum post detail |
| `/forums/create-post` | ✅ | Create forum post |
| `/community-gallery` | ✅ | Gallery with grid/feed/explore views |
| `/all-games` | ✅ | Game catalog with search/filters |
| `/hot-games` | ✅ | Hot games |
| `/top-ranked` | ✅ | Top ranked games |
| `/shop` | ✅ | Shop |
| `/my-dice` | ✅ | My Dice (auth required) |
| `/game-night-tracker` | ✅ | Game night tracker |
| `/catan-map-generator` | ✅ | Catan map generator |
| `/pixel-canvas` | ✅ | Pixel canvas |
| `/boardle` | ✅ | Boardle |
| `/dice-roller` | ✅ | Dice roller |
| `/digital-corner` | ✅ | Digital corner |
| `/game/[id]` | ✅ | Game detail |
| `/profile/[username]` | ✅ | User profile |
| `/collection/[username]` | ✅ | User collection |
| `/settings` | ✅ | Settings |
| `/login` / `/register` | ✅ | Auth (mobile uses native screens) |

## Mobile App (Expo) – WebView Screens

All of these load the website via WebView with `embed=1` and `x-kd-embed: 1` header.

| Screen | Path | Status |
|--------|------|--------|
| Home | `/` | ✅ |
| Feed | `/feed` | ✅ |
| Chat | `/chat` | ✅ |
| Shop | `/shop` | ✅ |
| Forums | `/forums` | ✅ |
| Gallery | `/community-gallery` | ✅ |
| All Games | `/all-games` | ✅ |
| Hot Games | `/hot-games` | ✅ |
| Top Ranked | `/top-ranked` | ✅ |
| My Dice | `/my-dice` | ✅ |
| Game Night Tracker | `/game-night-tracker` | ✅ |
| Catan Maps | `/catan-map-generator` | ✅ |
| Pixel Canvas | `/pixel-canvas` | ✅ |
| Boardle | `/boardle` | ✅ |
| Dice Roller | `/dice-roller` | ✅ |
| Digital Corner | `/digital-corner` | ✅ |
| Game detail | `/game/[id]` | ✅ |
| Profile | `/profile/[username]` | ✅ |
| Collection | `/collection/[username]` | ✅ |
| Settings | `/settings` | ✅ |

## Tools Menu (Mobile Header star icon)

- My Dice
- Game Night Tracker
- Catan Maps
- Pixel Canvas
- Boardle
- Dice Roller
- Digital Corner

All load the corresponding website route via WebView.

## Hamburger Menu (Mobile Header)

- Home, All Games, Hot Games, Top Ranked
- Forums, Gallery, Shop
- Join Discord (external link)

## Bottom Nav (Mobile)

- Home (logo)
- Feed
- Chat
- Shop
- Profile (avatar)

## Known Issues / Gaps (Resolved)

1. **Gallery deep link** – Fixed: `/gallery/[id]` now passes `?image=id` so a specific image opens in the gallery modal.
2. **Search** – Fixed: Search now loads `/all-games` in WebView so users can search games there.
3. **Stack screens** – `_layout.tsx` only declares a subset of routes. Expo Router file-based routing discovers the rest; all routes should work.

## Testing Checklist

- [ ] Home: loads, scroll, sections visible
- [ ] Feed: loads, grid, click item → modal or forum post
- [ ] Chat: loads, list, open chat, send message
- [ ] Forums: list, open post, create post (if logged in)
- [ ] Gallery: grid/feed/explore, click image → modal, upload (if logged in)
- [ ] All Games: list, search, filters, open game
- [ ] Shop: loads
- [ ] Tools: each tool loads (My Dice, Boardle, etc.)
- [ ] Profile: from avatar menu, view profile
- [ ] Login/Register: native screens, auth flow
- [ ] Header: hides on scroll down, shows on scroll up
- [ ] Bottom nav: always visible, tab switching
