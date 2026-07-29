const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '../views/admin.html');
let html = fs.readFileSync(adminPath, 'utf8');

console.log('Original size:', html.length);

// 1. Add #vaultOverlay.vault-unlocked CSS rule right after #vaultOverlay CSS definition
const cssTarget = `#vaultOverlay {`;
const cssReplacement = `#vaultOverlay.vault-unlocked {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
            z-index: -9999 !important;
            visibility: hidden !important;
        }

        #vaultOverlay {`;

html = html.replace(cssTarget, cssReplacement);

// 2. Replace unlockVault & add lockVault
const oldUnlock = `function unlockVault() {
            const overlay = document.getElementById('vaultOverlay');
            overlay.style.transition = '1s cubic-bezier(0.16, 1, 0.3, 1)';
            overlay.style.filter = 'brightness(2) blur(20px)';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.5)';
            
            setTimeout(() => {
                overlay.style.display = "none";
                document.body.classList.remove('scanning');
            }, 1000);
        }`;

const newUnlock = `function unlockVault() {
            const overlay = document.getElementById('vaultOverlay');
            if (overlay) {
                overlay.style.pointerEvents = 'none';
                overlay.style.transition = '0.4s ease-out';
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(1.05)';
                overlay.classList.add('vault-unlocked');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    document.body.classList.remove('scanning');
                }, 400);
            }
        }

        function lockVault() {
            const overlay = document.getElementById('vaultOverlay');
            if (overlay) {
                overlay.classList.remove('vault-unlocked');
                overlay.style.pointerEvents = 'auto';
                overlay.style.display = 'flex';
                overlay.style.opacity = '1';
                overlay.style.visibility = 'visible';
                overlay.style.transform = 'none';
                document.body.classList.add('scanning');
            }
        }`;

html = html.replace(oldUnlock, newUnlock);

// 3. Replace fetch interceptor lock handling
const oldFetchLock = `if (isAdminApi && (response.status === 401 || response.status === 403)) {
                localStorage.removeItem('adminToken');
                document.getElementById('vaultOverlay').style.display = 'flex';
                document.getElementById('vaultOverlay').classList.remove('vault-unlocked');
                document.body.classList.add('scanning');
            }`;

const newFetchLock = `if (isAdminApi && (response.status === 401 || response.status === 403)) {
                localStorage.removeItem('adminToken');
                if (typeof lockVault === 'function') lockVault();
            }`;

html = html.replace(oldFetchLock, newFetchLock);

// 4. Update window load event around line 2234
const oldLoad = `window.addEventListener('load', () => {
            // PIN Login is default
        });`;

const newLoad = `window.addEventListener('load', () => {
            if (localStorage.getItem('adminToken')) {
                unlockVault();
                if (typeof refreshAllData === 'function') refreshAllData();
            } else {
                lockVault();
            }
        });`;

html = html.replace(oldLoad, newLoad);

// 5. Update initial view setup block at bottom around line 6310
const oldInitialSetup = `// Initial view setup if logged in
        if (localStorage.getItem('adminToken')) {
            refreshAllData();
            showView('dashboardView');
        }`;

const newInitialSetup = `// Initial view setup if logged in
        if (localStorage.getItem('adminToken')) {
            unlockVault();
            refreshAllData();
            showView('dashboardView');
        } else {
            lockVault();
        }`;

html = html.replace(oldInitialSetup, newInitialSetup);

fs.writeFileSync(adminPath, html, 'utf8');
console.log('Updated size:', html.length);
console.log('Fix successfully applied to views/admin.html');
