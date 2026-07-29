// CHIDY ADMIN PANEL - MISSING FUNCTIONS FIX
// Add this to admin.html to fix button clicks

// Admin Tab Switching Function
function switchAdminTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Remove active from all tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active to clicked tab
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Hide all tab content
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected tab content
    const targetSection = document.getElementById(tabName + '-tab') || 
                         document.querySelector(`[data-tab="${tabName}"]`) ||
                         document.querySelector(`.admin-section.${tabName}`);
    
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Handle specific tab logic
    switch(tabName) {
        case 'dashboard':
            if (typeof loadDashboardData === 'function') loadDashboardData();
            break;
        case 'library':
            if (typeof loadGameLibrary === 'function') loadGameLibrary();
            break;
        case 'users':
            if (typeof loadUsers === 'function') loadUsers();
            break;
        case 'analytics':
            if (typeof loadAnalytics === 'function') loadAnalytics();
            break;
        case 'settings':
            if (typeof loadSettings === 'function') loadSettings();
            break;
        case 'push':
            if (typeof loadPushNotifications === 'function') loadPushNotifications();
            break;
    }
}

// Show/Hide Views Function
function showView(viewName) {
    console.log('Showing view:', viewName);
    
    // Hide all views
    document.querySelectorAll('.view-section').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show target view
    const targetView = document.getElementById(viewName) || 
                      document.querySelector(`[data-view="${viewName}"]`) ||
                      document.querySelector(`.view-${viewName}`);
    
    if (targetView) {
        targetView.style.display = 'block';
    }
}

// Handle Admin Login
function handleAdminLogin(event) {
    event.preventDefault();
    const pin = document.getElementById('admin-pin').value;
    
    if (!pin) {
        alert('Ingiza PIN ya admin');
        return;
    }
    
    // Show loading
    const btn = document.getElementById('admin-login-btn');
    const btnText = document.getElementById('admin-login-btn-text');
    
    if (btn && btnText) {
        btn.disabled = true;
        btnText.textContent = 'Inathibitisha...';
    }
    
    // Simulate login (replace with actual authentication)
    setTimeout(() => {
        if (pin === '2024' || pin === 'admin') {
            // Hide login section
            const loginSection = document.getElementById('admin-login-section');
            if (loginSection) {
                loginSection.style.display = 'none';
            }
            
            // Show admin dashboard
            const adminContent = document.querySelector('.admin-content');
            if (adminContent) {
                adminContent.style.display = 'block';
            }
            
            // Switch to dashboard
            switchAdminTab('dashboard');
        } else {
            alert('PIN si sahihi! Jaribu tena.');
            if (btn && btnText) {
                btn.disabled = false;
                btnText.textContent = 'Thibitisha Access';
            }
        }
    }, 1000);
}

// Handle Admin Logout  
function handleAdminLogout() {
    if (confirm('Una uhakika unataka kutoka admin panel?')) {
        // Show login section
        const loginSection = document.getElementById('admin-login-section');
        if (loginSection) {
            loginSection.style.display = 'block';
        }
        
        // Hide admin content
        const adminContent = document.querySelector('.admin-content');
        if (adminContent) {
            adminContent.style.display = 'none';
        }
        
        // Clear PIN
        const pinInput = document.getElementById('admin-pin');
        if (pinInput) {
            pinInput.value = '';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initialized');
    
    // Auto-switch to dashboard if no active tab
    const activeTabs = document.querySelectorAll('.admin-tab-btn.active');
    if (activeTabs.length === 0) {
        switchAdminTab('dashboard');
    }
    
    // Add click event listeners to all buttons
    document.querySelectorAll('[onclick]').forEach(element => {
        const onclickAttr = element.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('switchAdminTab')) {
            element.style.cursor = 'pointer';
            element.style.pointerEvents = 'auto';
        }
    });
});

console.log('Admin functions loaded successfully!');