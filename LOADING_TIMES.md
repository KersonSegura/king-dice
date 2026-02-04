# Page Loading Times – How to Check

This document describes how to measure and monitor page load times for the King Dice app.

## Quick Checks (Browser DevTools)

1. **Open DevTools** (F12 or Right-click → Inspect)
2. **Network tab** – Reload the page and check:
   - **DOMContentLoaded** – When HTML is parsed
   - **Load** – When all resources (images, scripts) are loaded
   - **Finish** – Total time including async work
3. **Performance tab** – Record a page load and inspect:
   - **LCP** (Largest Contentful Paint) – Main content visible
   - **FID** (First Input Delay) – Time to first interaction
   - **CLS** (Cumulative Layout Shift) – Layout stability

## Key Pages to Test

| Page | Route | Notes |
|------|-------|-------|
| Home | `/` | Heavy – games carousel, gallery, feed |
| Feed | `/feed` | Medium – feed API, gallery images |
| Forums | `/forums` | Medium – posts list |
| Forum Post | `/forums/post/[id]` | Medium – post + comments |
| Gallery | `/community-gallery` | Heavy – images, categories |
| Chat | `/chat` | Medium – chat list |
| All Games | `/all-games` | Heavy – game catalog |
| Game Detail | `/game/[id]` | Medium – game data, rules |
| Shop | `/shop` | Medium – shop content |

## Lighthouse (Chrome)

1. Open DevTools → **Lighthouse** tab
2. Select **Performance**
3. Choose **Mobile** or **Desktop**
4. Click **Analyze page load**
5. Review Performance score and metrics

## Mobile App (WebView)

Loading times in the mobile app depend on:
- **API_BASE_URL** – Distance to server (localhost vs production)
- **Network** – Wi‑Fi vs cellular
- **WebView** – First load vs cached

To measure in the mobile app:
1. Enable **Remote debugging** (Chrome → `chrome://inspect`)
2. Inspect the WebView
3. Use the same Network/Performance tools as in the browser

## Common Slowdowns

- **API calls** – Multiple sequential fetches (consider batching)
- **Images** – Large unoptimized images (use Next.js Image)
- **Auth** – Session check blocking render
- **Heavy components** – Lazy load below-the-fold content
