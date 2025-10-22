@echo off
git add "app/game/[id]/page.tsx" "app/not-found.tsx"
git commit -m "Fix game detail pages: correct API endpoint and centered 404 error"
git push origin main
