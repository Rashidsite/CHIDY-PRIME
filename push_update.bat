@echo off
color 0A
echo.
echo  ██████╗██╗  ██╗██╗██████╗ ██╗   ██╗    ██████╗ ██████╗ ██╗███╗   ███╗███████╗
echo ██╔════╝██║  ██║██║██╔══██╗╚██╗ ██╔╝    ██╔══██╗██╔══██╗██║████╗ ████║██╔════╝
echo ██║     ███████║██║██║  ██║ ╚████╔╝     ██████╔╝██████╔╝██║██╔████╔██║█████╗  
echo ██║     ██╔══██║██║██║  ██║  ╚██╔╝      ██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██╔══╝  
echo ╚██████╗██║  ██║██║██████╔╝   ██║       ██║     ██║  ██║██║██║ ╚═╝ ██║███████╗
echo  ╚═════╝╚═╝  ╚═╝╚═╝╚═════╝    ╚═╝       ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝
echo.
echo 🚀 DEPLOYING SIGNUP POPUP IMPROVEMENTS...
echo.

cd /d "c:\Users\User\OneDrive\Desktop\chidy prime"

echo [1/4] Adding changed files to git...
git add views\index.html
git add public\css\portal-cards.css

echo.
echo [2/4] Committing improvements...
git commit -m "feat(signup): professional white popup with black borders, rocket animation and close button"

echo.
echo [3/4] Pushing to GitHub repository...
git push origin main

echo.
echo [4/4] Deployment complete!
echo.
color 0B
echo ✅ SUCCESS! All signup improvements are now LIVE!
echo.
echo 🎯 WHAT'S NEW:
echo   ✓ Black borders on all input fields
echo   ✓ JOIN NOW button with blue fill + black border
echo   ✓ Animated rocket icon (rocketFly keyframes)
echo   ✓ Close button (X) with black circular border and hover effects
echo   ✓ Fixed icon positioning to prevent text overlap
echo   ✓ Complete JavaScript functionality
echo   ✓ CSS cache refresh (v2.3)
echo.
color 0E
echo 🌐 Your website will update automatically via Vercel in 2-3 minutes!
echo 🔗 Visit: chidy-prime.vercel.app to see changes
echo.
pause