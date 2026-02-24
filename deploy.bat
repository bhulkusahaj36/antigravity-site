@echo off
echo Preparing to deploy changes to GitHub...

REM Temporarily add Portable Git and GitHub CLI to the PATH
set PATH=%PATH%;%LOCALAPPDATA%\PortableGit\bin;%LOCALAPPDATA%\gh\bin

echo Adding changes...
git add .

echo Committing changes...
git commit -m "Auto deployment change"

echo Pushing and deploying directly to GitHub Pages...
git push origin main

echo.
echo ======================================================
echo Success! Your website changes have been dispatched.
echo.
echo Wait 1-2 minutes, then visit your freshly updated site at:
echo https://bhulkusahaj36.github.io/antigravity-site/
echo ======================================================
pause
