@echo off
echo Preparing to deploy changes to Vercel...

REM Temporarily add Portable Git and GitHub CLI to the PATH
set PATH=%PATH%;%LOCALAPPDATA%\PortableGit\bin;%LOCALAPPDATA%\gh\bin

echo Adding changes...
git add .

echo Committing changes...
if "%~1"=="" (
    for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set TODAY=%%c-%%b-%%a
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set NOW=%%a%%b
    git commit -m "Deploy update %TODAY% %NOW%"
) else (
    git commit -m "%~1"
)

echo Pushing to GitHub (Vercel deployment will trigger)...
git push origin main

echo.
echo ======================================================
echo Success! Your changes have been pushed to GitHub.
echo.
echo Vercel is now building and deploying your site.
echo Wait 1-2 minutes, then visit your Vercel Dashboard
echo to see the live URL and set Environment Variables.
echo.
echo   https://vercel.com/dashboard
echo ======================================================
pause
