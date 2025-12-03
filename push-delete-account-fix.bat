@echo off
echo Adding files...
git add app/api/users/delete-account/route.ts app/settings/page.tsx
echo.
echo Committing changes...
git commit -m "Fix account deletion: correct auth token cookie name and add modern confirmation dialogs"
echo.
echo Pushing to origin...
git push origin main
echo.
echo Done! Deployment should start automatically on Vercel.



