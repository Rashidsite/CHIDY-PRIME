const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const newCSS = `
    <!-- PRICE BADGE REDESIGN (PLAN A) -->
    <style>
        .price-badge {
            position: absolute !important;
            top: 6px !important;
            right: 6px !important;
            bottom: auto !important;
            left: auto !important;
            transform: none !important;
            background: rgba(10, 10, 15, 0.85) !important;
            color: #00f2ff !important;
            border: 1px solid rgba(0, 242, 255, 0.3) !important;
            padding: 3px 8px !important;
            border-radius: 8px !important;
            font-size: 0.55rem !important;
            font-weight: 800 !important;
            letter-spacing: 0.5px !important;
            backdrop-filter: blur(4px) !important;
            -webkit-backdrop-filter: blur(4px) !important;
            z-index: 10 !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
            width: auto !important;
            height: auto !important;
            line-height: 1.2 !important;
        }
        .price-badge.free {
            background: rgba(10, 20, 15, 0.85) !important;
            color: #00ff73 !important;
            border-color: rgba(0, 210, 91, 0.4) !important;
        }
    </style>
</head>
`;

if (!content.includes('PRICE BADGE REDESIGN (PLAN A)')) {
    content = content.replace('</head>', newCSS);
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('Successfully redesigned the price badge.');
} else {
    console.log('Price badge already redesigned.');
}
