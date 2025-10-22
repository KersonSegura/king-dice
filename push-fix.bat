@echo off
git add "app/api/games/[id]/route.ts"
git commit -m "Fix game detail API route to use correct database schema"
git push origin main
