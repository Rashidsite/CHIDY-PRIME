const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '../views/admin.html');
let html = fs.readFileSync(adminPath, 'utf8');

// Combine refreshAllData
const unifiedRefreshAllData = `function refreshAllData() {
            if (typeof fetchAdminData === 'function') fetchAdminData();
            if (typeof fetchUserStats === 'function') fetchUserStats();
            if (typeof fetchMaintenanceState === 'function') fetchMaintenanceState();
            if (typeof loadCategories === 'function') loadCategories();
            if (typeof fetchActivity === 'function') fetchActivity();
            if (typeof fetchOrders === 'function') fetchOrders();
            if (typeof initSalesChart === 'function') initSalesChart();
            if (typeof fetchAnalytics === 'function') fetchAnalytics();
            if (typeof loadStoreSettings === 'function') loadStoreSettings();
            if (typeof loadSystemHealth === 'function') loadSystemHealth();
            if (typeof loadPromoCodesWithStats === 'function' && typeof currentActiveViewId !== 'undefined' && currentActiveViewId === 'promoView') {
                loadPromoCodesWithStats();
            }
        }`;

// Replace first instance of refreshAllData (around line 4794)
const firstRefreshRegex = /function refreshAllData\(\) \{[\s\S]*?showToast\("✅ Core Data Refreshed!"\);\s*\}/;
html = html.replace(firstRefreshRegex, unifiedRefreshAllData);

// Replace second instance of refreshAllData (around line 6299) with comment
const secondRefreshRegex = /function refreshAllData\(\) \{[\s\S]*?if \(currentActiveViewId === 'promoView'\) loadPromoCodesWithStats\(\);\s*\}/;
html = html.replace(secondRefreshRegex, `// (refreshAllData unified above)`);

fs.writeFileSync(adminPath, html, 'utf8');
console.log('Deduplicated refreshAllData');
