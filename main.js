// main.js - Main JavaScript without authentication

// Show message function
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-error' : 
                          type === 'warning' ? 'alert-warning' : 'alert';
        
        messageDiv.innerHTML = `
            <div class="alert ${alertClass}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                   type === 'error' ? 'exclamation-triangle' : 
                                   type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                ${message}
            </div>
        `;
        
        // Auto remove message after 5 seconds
        setTimeout(() => {
            if (messageDiv.innerHTML.includes(message)) {
                messageDiv.innerHTML = '';
            }
        }, 5000);
    }
    
    console.log(`${type.toUpperCase()}: ${message}`);
}

// API request helper
async function apiRequest(url, options = {}) {
    // Default headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Merge options
    const requestOptions = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(url, requestOptions);
        
        // Parse JSON response
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        showMessage(`API Error: ${error.message}`, 'error');
        throw error;
    }
}

// Check server health
async function checkServerHealth() {
    try {
        const response = await fetch('/api/health');
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        console.error('Server health check failed:', error);
        return false;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Management System loaded');
    
    // Check server health on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) {
                showMessage('⚠️ Backend server connection issue detected', 'warning');
            }
        });
    }
});

// Export functions for use in other files
window.utils = {
    showMessage,
    apiRequest,
    checkServerHealth
};