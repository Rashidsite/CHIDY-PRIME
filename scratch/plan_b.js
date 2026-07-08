const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

// 1. In renderCard (JS template)
content = content.replace(
    /<div class="price-badge \$\{priceClass\}">\$\{priceLabel\}<\/div>\s*<div class="card-rating">/g,
    '<div class="card-rating">'
);

content = content.replace(
    /<div class="card-title">\$\{game\.title\}<\/div>/g,
    '<div class="card-title">${game.title}</div>\n                        <div class="price-text ${priceClass}">${priceLabel}</div>'
);

// 2. In SSR (EJS or static HTML)
// Look for price-badge inside card-image-wrap and move it below card-title
// This is harder to do safely with simple regex for arbitrary HTML. 
// Instead, let's just add CSS to forcefully position .price-badge below the title!

// ACTUALLY, the best way without breaking HTML structure is CSS!
// Since .card-info and .card-image-wrap are siblings inside .game-card,
// We can just style .price-badge to be positioned at the bottom of .game-card (or inside card-info if we move it).
// But moving it via CSS is tricky.
// Let's just hide the old .price-badge and add a new one via JS? No.

// Let's do a reliable Regex to move it in the HTML text.
// The SSR part looks like this usually:
// <div class="card-image-wrap">
//    <img ...>
//    <div class="price-badge">TSh 4,000</div>

// Let's just write a CSS rule that overrides .price-badge to act as a relative block under the title?
// No, .price-badge is inside .card-image-wrap which has overflow: hidden usually.

// Let's just fix the CSS we added earlier to actually work! 
// The screenshot shows the price badge is still HUGE because the original CSS had width/padding that overrides ours, or it's centered by flexbox.
// BUT the user WANTS it below the image.
// So let's write CSS to move it:

const planBCSS = `
    <!-- PRICE BADGE REDESIGN (PLAN B - BELOW IMAGE) -->
    <style>
        /* Hide the old badge that was over the image */
        .card-image-wrap .price-badge {
            display: none !important;
        }
        
        /* Style the new price text */
        .price-text {
            color: #00f2ff;
            font-size: 0.65rem;
            font-weight: 800;
            margin: 3px 0 5px 0;
            letter-spacing: 0.5px;
            display: inline-block;
            background: rgba(0, 242, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(0, 242, 255, 0.2);
        }
        .price-text.free {
            color: #00ff73;
            background: rgba(0, 210, 91, 0.1);
            border-color: rgba(0, 210, 91, 0.3);
        }
    </style>
`;

if (!content.includes('PRICE BADGE REDESIGN (PLAN B')) {
    content = content.replace('</head>', planBCSS + '</head>');
}

// Ensure the JS template has the new price-text
if (!content.includes('<div class="price-text')) {
    content = content.replace(
        /<div class="card-title">\$\{game\.title\}<\/div>/g,
        '<div class="card-title">${game.title}</div>\n                        <div class="price-text ${priceClass}">${priceLabel}</div>'
    );
}

// Since the page might have hardcoded HTML blocks (SSR) like the "MALEO BUS MODE TZ" in the screenshot,
// let's do a global replace for those hardcoded blocks too.
// Find: <div class="price-badge">TSh 4,000</div>
// Actually, it's safer to use client-side JS to move them on page load!
const moveScript = `
    <!-- MOVE PRICE SCRIPT -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.game-card').forEach(card => {
                const oldBadge = card.querySelector('.price-badge');
                const cardTitle = card.querySelector('.card-title');
                
                // If there's an old badge and we haven't already added the new text
                if (oldBadge && cardTitle && !card.querySelector('.price-text')) {
                    const priceText = document.createElement('div');
                    priceText.className = 'price-text ' + (oldBadge.classList.contains('free') ? 'free' : '');
                    priceText.innerHTML = oldBadge.innerHTML;
                    
                    // Insert right after card title
                    cardTitle.parentNode.insertBefore(priceText, cardTitle.nextSibling);
                }
            });
        });
    </script>
</body>
`;

if (!content.includes('MOVE PRICE SCRIPT')) {
    content = content.replace('</body>', moveScript);
}

fs.writeFileSync(indexPath, content, 'utf-8');
console.log('Successfully implemented Plan B (Price Below Image)');
