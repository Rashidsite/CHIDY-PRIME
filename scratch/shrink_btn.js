const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const shrinkBtnCSS = `
    <!-- SHRINK HEADER INSTALL BUTTON -->
    <style>
        #headerInstallBtn {
            padding: 4px 10px !important;
            font-size: 0.55rem !important;
            border-radius: 12px !important;
            box-shadow: 0 0 8px rgba(0, 242, 255, 0.3) !important;
            letter-spacing: 0.5px !important;
            height: 24px !important;
        }
        #headerInstallBtn i {
            font-size: 0.6rem !important;
        }
    </style>
</head>
`;

if (!content.includes('SHRINK HEADER INSTALL BUTTON')) {
    content = content.replace('</head>', shrinkBtnCSS);
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('Successfully shrunk the install button.');
} else {
    console.log('Button already shrunk.');
}
