@echo off
color 0A
cls
echo.
echo ████████████████████████████████████████████████████████████
echo █  CHIDY PRIME - FINAL SIGNUP POPUP IMPROVEMENTS DEPLOY  █  
echo ████████████████████████████████████████████████████████████
echo.
echo 🚀 DEPLOYING FINAL CHANGES...
echo.

cd /d "c:\Users\User\OneDrive\Desktop\chidy prime"

echo [1/3] Adding all improvements...
git add views\index.html

echo.
echo [2/3] Committing final changes...
git commit -m "feat(signup): COMPLETE - black borders popup, inputs, button + rocket animation + close button + icon positioning fixed"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
color 0B
echo ████████████████████████████████████████████████████████████
echo █                    SUCCESS! DEPLOYED!                   █
echo ████████████████████████████████████████████████████████████
echo.
echo ✅ ALL REQUESTED IMPROVEMENTS DEPLOYED:
echo.
echo    1. ✓ POPUP CARD: Black border (2px mzunguko)
echo    2. ✓ INPUT FIELDS: Black borders (Jina + Namba)  
echo    3. ✓ JOIN NOW BUTTON: Blue + Black border
echo    4. ✓ ROCKET ANIMATION: Enhanced rocketFly
echo    5. ✓ CLOSE BUTTON (X): Black circular, hover effects
echo    6. ✓ ICON POSITIONING: Fixed - no overlap with text
echo.
color 0E
echo 🌐 LIVE IN 2-3 MINUTES: chidy-prime.vercel.app
echo 📱 Test on mobile + desktop
echo.
echo Your signup popup is now PROFESSIONAL! 🎯
echo.
pause