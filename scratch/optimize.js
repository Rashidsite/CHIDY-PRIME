const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

// 1. Mobile CSS Optimizations
const mobileCSS = `
    <!-- MOBILE PERFORMANCE OPTIMIZATIONS -->
    <style>
        @media (max-width: 768px) {
            /* Disable expensive blur filters on mobile */
            .header, .sidebar, .sidebar-overlay, .pulse-toast, #pushPrompt, .premium-overlay, .modal-content, .vp-glass {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            
            /* Replace blur with solid or semi-transparent backgrounds for readability */
            .header { background: rgba(10, 10, 15, 0.98) !important; }
            .sidebar { background: #0a0a0f !important; }
            .pulse-toast, #pushPrompt { background: rgba(20, 20, 25, 0.98) !important; border: 1px solid #00f2ff; }
            
            /* Hardware acceleration for smooth scrolling */
            body, .categories-container, .game-card {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
            }
            
            /* Simplify heavy animations on mobile */
            .startup-logo, .brand-prime, .notif-badge {
                animation: none !important;
                filter: none !important;
            }
        }
    </style>
</head>
`;

if (!content.includes('MOBILE PERFORMANCE OPTIMIZATIONS')) {
    content = content.replace('</head>', mobileCSS);
}

// 2. Add lazy loading to images (if not already present)
// This regex looks for <img tags that don't have loading="lazy"
content = content.replace(/<img\s+(?![^>]*loading=)([^>]*)>/gi, '<img loading="lazy" $1>');

// 3. Delay the push prompt modal (it currently shows quickly if it's there)
// We will look for the setTimeout that shows modals and increase it, but since we don't know the exact JS,
// we can inject a script at the end of the body to delay the push prompt and login modals.

const jsOptimizations = `
    <!-- MODAL PERFORMANCE OVERRIDES -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Delay the Push Prompt if it exists
            const pushPrompt = document.getElementById('pushPrompt');
            if (pushPrompt && pushPrompt.style.display !== 'none') {
                pushPrompt.style.display = 'none';
                setTimeout(() => {
                    pushPrompt.style.display = 'block';
                }, 8000); // Wait 8 seconds before showing
            }
            
            // Delay Authentication Modal if it pops up automatically
            const authModal = document.getElementById('authOverlay');
            if (authModal && authModal.classList.contains('show')) {
                authModal.classList.remove('show');
                setTimeout(() => {
                    authModal.classList.add('show');
                }, 12000); // Wait 12 seconds
            }
        });
    </script>
</body>
`;

if (!content.includes('MODAL PERFORMANCE OVERRIDES')) {
    content = content.replace('</body>', jsOptimizations);
}

fs.writeFileSync(indexPath, content, 'utf-8');
console.log('Optimization applied successfully to views/index.html');
