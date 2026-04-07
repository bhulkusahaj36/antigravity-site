@echo off
echo Preparing to deploy changes to GitHub...

REM Temporarily add Portable Git and GitHub CLI to the PATH
set PATH=%PATH%;%LOCALAPPDATA%\PortableGit\bin;%LOCALAPPDATA%\gh\bin

echo Adding changes...
git add .

echo Committing changes...
git commit -m "Auto deployment change"

echo Pushing to GitHub (Azure SWA auto-deploy will trigger)...
git push origin main

echo.
echo ======================================================
echo Success! Your changes have been dispatched.
echo.
echo GitHub Actions is now building and deploying to Azure.
echo Wait 2-3 minutes, then visit your live site at:
echo.
echo   https://black-rock-04f2a711e.azurestaticapps.net
echo.
echo (This URL has your API + paravanis - GitHub Pages does NOT)
echo ======================================================
pause
