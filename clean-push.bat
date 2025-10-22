@echo off
git reset --soft HEAD~1
git reset HEAD .env.production .env.local.backup
git add "app/api/games/[id]/route.ts"
git commit -m "Fix game detail API route to use correct database schema"
git push origin main
