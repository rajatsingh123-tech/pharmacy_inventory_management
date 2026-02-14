// ============ SIMPLE AUTHENTICATION ============

// Check if user is logged in
// ============ COMPLETE AUTHENTICATION HELPER ============

// Check if user is logged in
function isAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Logout function
async function logout() {
    const token = localStorage.getItem('authToken');
    
    try {
        await fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': token || ''
            }
        });
    } catch (error) {
        console.log('Logout API error:', error);
    }
    
    // Clear localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = 'login.html';
}

// Protect pages
function protectPage() {
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['index.html', 'login.html', 'view-medicines.html'];
    const protectedPages = ['dashboard.html', 'add-medicine.html', 'billing.html'];
    
    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Update navigation
function updateNavigation() {
    const nav = document.querySelector('nav ul');
    if (!nav) return;
    
    const isLoggedIn = isAuthenticated();
    const loginLink = nav.querySelector('a[href="login.html"]');
    const logoutBtn = nav.querySelector('.logout-btn');
    
    if (isLoggedIn) {
        if (loginLink) {
            loginLink.parentElement.style.display = 'none';
        }
        
        if (!logoutBtn) {
            const li = document.createElement('li');
            const user = getCurrentUser();
            li.innerHTML = `
                <a href="#" onclick="logout()" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout (${user?.username || 'Admin'})
                </a>
            `;
            nav.appendChild(li);
        }
    } else {
        if (loginLink) {
            loginLink.parentElement.style.display = '';
        }
        
        if (logoutBtn) {
            logoutBtn.parentElement.remove();
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    protectPage();
    updateNavigation();
});

// Global functions
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.protectPage = protectPage;

// Login function
async function loginUser(username, password) {
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save to localStorage
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', data.user.username);
            return { success: true, message: 'Login successful' };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Server connection error' };
    }
}

// Logout function
async function logout() {
    const token = localStorage.getItem('authToken');
    
    // Call logout API
    try {
        await fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': token || ''
            }
        });
    } catch (error) {
        console.log('Logout API error:', error);
    }
    
    // Clear localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    
    // Redirect to login
    window.location.href = 'login.html';
}

// Protect pages - har page pe yeh check karega
function protectPage() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Public pages - bina login ke open kar sakte hain
    const publicPages = ['index.html', 'login.html', 'view-medicines.html'];
    
    // Protected pages - login required
    const protectedPages = ['dashboard.html', 'add-medicine.html', 'billing.html'];
    
    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Navigation menu update karo (logout button add karo)
function updateNavigation() {
    const nav = document.querySelector('nav ul');
    if (!nav) return;
    
    const isLoggedIn = isAuthenticated();
    const loginLink = nav.querySelector('a[href="login.html"]');
    const logoutBtn = nav.querySelector('.logout-btn');
    
    if (isLoggedIn) {
        // Login link hide karo
        if (loginLink) {
            loginLink.parentElement.style.display = 'none';
        }
        
        // Logout button add karo agar nahi hai
        if (!logoutBtn) {
            const li = document.createElement('li');
            li.innerHTML = '<a href="#" onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</a>';
            nav.appendChild(li);
        }
    } else {
        // Login link show karo
        if (loginLink) {
            loginLink.parentElement.style.display = '';
        }
        
        // Logout button remove karo
        if (logoutBtn) {
            logoutBtn.parentElement.remove();
        }
    }
}

// Page load pe sab check karo
document.addEventListener('DOMContentLoaded', function() {
    protectPage();
    updateNavigation();
});

// Global functions
window.isAuthenticated = isAuthenticated;
window.loginUser = loginUser;
window.logout = logout;
window.protectPage = protectPage;