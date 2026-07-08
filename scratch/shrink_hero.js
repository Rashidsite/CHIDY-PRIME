const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const shrinkHeroCSS = `
    <!-- SHRINK HERO SECTION ON MOBILE -->
    <style>
        @media (max-width: 768px) {
            .hero-section {
                padding: 1.5rem 1rem 0.5rem !important;
            }
            .hero-badge {
                margin-bottom: 0.5rem !important;
                font-size: 0.55rem !important;
                padding: 4px 10px !important;
            }
            .hero-title {
                font-size: 1.4rem !important;
                margin-bottom: 0.5rem !important;
                line-height: 1.2 !important;
            }
            .hero-subtitle {
                font-size: 0.75rem !important;
                margin-bottom: 0.5rem !important;
                line-height: 1.4 !important;
            }
            .hero-stats {
                display: none !important; /* Hide stats on mobile to bring games up */
            }
            .hero-content {
                margin-bottom: 1rem !important;
            }
            .hero-search input {
                padding: 10px 15px 10px 40px !important;
            }
            .hero-search .search-icon {
                top: 50% !important;
                transform: translateY(-50%) !important;
            }
            .category-section:first-of-type {
                margin-top: 0 !important;
            }
        }
    </style>
</head>
`;

if (!content.includes('SHRINK HERO SECTION ON MOBILE')) {
    content = content.replace('</head>', shrinkHeroCSS);
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('Successfully shrunk the hero section.');
} else {
    console.log('Hero section already shrunk.');
}
