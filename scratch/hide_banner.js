const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const hideBannerCSS = `
    <!-- HIDE REDUNDANT INSTALL BANNER -->
    <style>
        #installBanner {
            display: none !important;
        }
    </style>
</head>
`;

if (!content.includes('HIDE REDUNDANT INSTALL BANNER')) {
    content = content.replace('</head>', hideBannerCSS);
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('Successfully hid the redundant install banner.');
} else {
    console.log('Banner already hidden.');
}
