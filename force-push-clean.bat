@echo off
echo Force pushing cleaned history...
echo.
echo WARNING: This will rewrite remote history!
echo Make sure you've removed the commit with secrets first.
echo.
pause
git push origin main --force-with-lease
echo.
echo Done!



