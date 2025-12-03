@echo off
echo Removing commit with secrets from history...
echo.
echo This will rewrite git history. Make sure you have a backup!
echo.
pause
echo.
echo Starting rebase...
git rebase -i 7119bf1^
echo.
echo If the rebase editor opens, change 'pick' to 'drop' for commit 7119bf1
echo Then save and close the editor.
echo.
echo After rebase completes, force push with:
echo git push origin main --force-with-lease
echo.
pause



