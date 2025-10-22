@echo off
git add "app/not-found.tsx" "app/game/[id]/page.tsx"
git commit -m "Center 404 errors properly using fixed positioning to cover full viewport"
git push origin main
