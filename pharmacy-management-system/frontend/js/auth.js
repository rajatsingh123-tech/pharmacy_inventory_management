// ============ PHARMACY MANAGEMENT SYSTEM - AUTHENTICATION ============
const BASE_URL = 'https://pharmacy-backend-api-31hh.onrender.com';

// 1. Check if user is logged in
function isAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// 2. Get current user data
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { username: localStorage.getItem('username') || 'Admin' };
}

// 3. Login User Function
async function loginUser(username, password) {
    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Data ko localStorage mein save karein
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('loginTime', new Date().getTime());
            
            return { success: true, message: 'Login successful' };
        } else {
            return { success: false, message: data.message || 'Invalid username or password' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Server connection error. Please try again.' };
    }
}

// 4. Logout Function
async function logout() {
    const token = localStorage.getItem('authToken');
    
    // Server ko logout request bhejein (Optional but good practice)
    try {
        await fetch(`${BASE_URL}/api/logout`, {
            method: 'POST',
            headers: {
                'Authorization': token || ''
            }
        });
    } catch (error) {
        console.log('Logout API error:', error);
    }
    
    // Local data saaf karein
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    
    // Login page par wapas bhej dein
    window.location.href = 'login.html';
}

// 5. Page Protection - Unauthorized access rokne ke liye
function protectPage() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages jahan login zaroori hai
    const protectedPages = ['dashboard.html', 'add-medicine.html', 'billing.html'];
    
    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 6. Navigation Update - Login/Logout button dikhane ke liye
function updateNavigation() {
    const nav = document.querySelector('nav ul');
    if (!nav) return;
    
    const isLoggedIn = isAuthenticated();
    const loginLink = nav.querySelector('a[href="login.html"]');
    const logoutBtn = nav.querySelector('.logout-btn');
    
    if (isLoggedIn) {
        // Login link hide karein
        if (loginLink) {
            loginLink.parentElement.style.display = 'none';
        }
        
        // Logout button add karein agar nahi hai
        if (!logoutBtn) {
            const user = getCurrentUser();
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="#" onclick="logout()" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout (${user.username})
                </a>
            `;
            nav.appendChild(li);
        }
    } else {
        // Login link dikhayein
        if (loginLink) {
            loginLink.parentElement.style.display = '';
        }
        
        // Logout button hatayein
        if (logoutBtn) {
            logoutBtn.parentElement.remove();
        }
    }
}

// 7. Initialization on Page Load
document.addEventListener('DOMContentLoaded', function() {
    protectPage();
    updateNavigation();
});

// 8. Functions ko global banayein taaki HTML se call ho sakein
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.logout = logout;
window.protectPage = protectPage;