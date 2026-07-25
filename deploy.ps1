Write-Host "🚀 DEPLOYING CHIDY PRIME SIGNUP IMPROVEMENTS..." -ForegroundColor Cyan
Write-Host ""

Set-Location "c:\Users\User\OneDrive\Desktop\chidy prime"

Write-Host "📁 Adding files to git..." -ForegroundColor Yellow
git add views/index.html
git add public/css/portal-cards.css

Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "feat(signup): complete white popup with black borders, rocket animation, close button

✅ MAJOR IMPROVEMENTS:
- Black borders on input fields (1.5px solid #0f172a)
- JOIN NOW button: blue background with black border
- Rocket icon: animated rocketFly keyframes with rotation  
- Close button (X): black circular border with hover effects
- Fixed icon positioning to prevent text overlap
- Added JavaScript functions: closeSignupOverlay(), handleSignupClick()
- CSS version bumped to v2.3 for cache refresh

All signup popup improvements now fully functional!"

Write-Host "🌐 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ SUCCESS! CHIDY PRIME DEPLOYED!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 IMPROVEMENTS LIVE:" -ForegroundColor White
Write-Host "  ▶ Black borders kwenye input fields" -ForegroundColor Gray
Write-Host "  ▶ JOIN NOW button na black border" -ForegroundColor Gray  
Write-Host "  ▶ Rocket icon animation (rocketFly)" -ForegroundColor Gray
Write-Host "  ▶ Close button (X) na hover effects" -ForegroundColor Gray
Write-Host "  ▶ Icon positioning fixed" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Your site is now updated with all requested changes!" -ForegroundColor Magenta

Read-Host "Press Enter to continue..."