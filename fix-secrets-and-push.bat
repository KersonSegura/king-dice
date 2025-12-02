@echo off
echo Removing secrets from files...
echo.
echo Adding all changes...
git add -A
echo.
echo Committing changes to remove secrets...
git commit -m "Remove OAuth secrets from files and add to .gitignore"
echo.
echo Pushing to origin...
git push origin main
echo.
echo Done!

