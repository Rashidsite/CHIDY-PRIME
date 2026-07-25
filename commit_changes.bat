@echo off
cd /d "c:\Users\User\OneDrive\Desktop\chidy prime"
echo Adding files...
git add views/index.html
git add public/css/portal-cards.css
echo Committing changes...
git commit -m "feat(signup): complete white popup with black borders and rocket animation"
echo Pushing to GitHub...
git push origin main
echo.
echo ✅ COMPLETE! Signup popup improvements pushed to GitHub:
echo - Black borders on input fields (1.5px solid #0f172a)
echo - JOIN NOW button with blue background and black border  
echo - Rocket icon with animated rocketFly keyframes
echo - Close button (X) with black circular border
echo - Fixed icon positioning to prevent text overlap
echo - Added JavaScript functions for functionality
echo - CSS version bumped to v2.3 for cache refresh
echo.
echo The signup popup is now fully functional!
pause