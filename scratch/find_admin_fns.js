const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../views/admin.html'), 'utf8');
const lines = html.split('\n');

const terms = [
    'fetchOrders', 'fetchPayments', 'loadAllGames', 'loadUsers', 
    'editGame', 'deleteGame', 'confirmDelete', 'showConfirmModal',
    'showToast', 'loadPortalThumbs', 'loadStoreSettings', 'loadAdminVideos',
    'loadPromoCodesWithStats', 'addLinkBtn', 'toggleSidebar', 'initPushView'
];

terms.forEach(term => {
    const found = [];
    lines.forEach((line, idx) => {
        // Look for function definitions (not mere calls)
        if (line.includes(term) && (
            line.includes('function ' + term) ||
            line.includes(term + ' = function') ||
            line.includes(term + ' = async') ||
            line.includes('async ' + term + '(') ||
            line.includes('window.' + term)
        )) {
            found.push(`Line ${idx+1}: ${line.trim().substring(0, 100)}`);
        }
    });
    
    if (found.length === 0) {
        console.log(`❌ ${term}: NOT DEFINED`);
    } else {
        console.log(`✅ ${term}: defined at ${found.join(' | ')}`);
    }
});
