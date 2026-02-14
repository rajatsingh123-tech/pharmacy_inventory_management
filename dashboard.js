// dashboard.js - Pharmacy Management System Dashboard
// Handles all dashboard updates and real-time data

let stockChart = null;
let lastUpdateTime = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard JS loaded');
    loadDashboardData();
    
    // Listen for medicine updates from other pages
    setupRealTimeUpdates();
    
    // Add welcome activity
    addActivity('Dashboard initialized successfully', 'success');
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        console.log('🔄 Loading dashboard data...');
        
        // Show loading state
        showLoading(true);
        
        // Load all data in parallel
        const [medicines, salesData] = await Promise.all([
            fetchMedicines(),
            fetchSalesData()
        ]);
        
        console.log(`📦 Loaded ${medicines.length} medicines`);
        
        // Update all dashboard components
        updateStats(medicines, salesData);
        updateRecentMedicines(medicines);
        updateAlerts(medicines);
        updateStockChart(medicines);
        updateRecentSales(salesData);
        updateStockSummary(medicines);
        
        // Update timestamp
        lastUpdateTime = new Date();
        updateLastUpdateTime();
        
        // Add activity log
        addActivity(`Dashboard updated with ${medicines.length} medicines`, 'info');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please check your connection.');
    } finally {
        showLoading(false);
    }
}

// Fetch medicines from API
async function fetchMedicines() {
    try {
        const response = await fetch('http://localhost:3000/api/medicines');
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
            return data;
        } else if (data && Array.isArray(data.medicines)) {
            return data.medicines;
        } else if (data && Array.isArray(data.data)) {
            return data.data;
        } else {
            console.warn('Unexpected data format:', data);
            return [];
        }
        
    } catch (error) {
        console.error('Error fetching medicines:', error);
        
        // Try to get from localStorage as fallback
        const localMedicines = localStorage.getItem('medicines');
        if (localMedicines) {
            return JSON.parse(localMedicines);
        }
        
        return [];
    }
}

// Fetch sales data
async function fetchSalesData() {
    try {
        // For now, get from localStorage
        const billHistory = localStorage.getItem('billHistory');
        if (billHistory) {
            return JSON.parse(billHistory);
        }
        return [];
    } catch (error) {
        console.error('Error fetching sales data:', error);
        return [];
    }
}

// Update all statistics
function updateStats(medicines, salesData) {
    // Calculate totals
    const totalMedicines = medicines.length;
    const totalStock = medicines.reduce((sum, med) => sum + (med.quantity || 0), 0);
    const totalValue = medicines.reduce((sum, med) => sum + ((med.price || 0) * (med.quantity || 0)), 0);
    
    // Calculate today's sales
    const today = new Date().toDateString();
    const todaySales = salesData.filter(sale => 
        new Date(sale.date).toDateString() === today
    ).length;
    
    const todaySalesAmount = salesData.filter(sale => 
        new Date(sale.date).toDateString() === today
    ).reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    // Update DOM
    document.getElementById('totalMedicines').textContent = totalMedicines;
    document.getElementById('totalStock').textContent = totalStock;
    document.getElementById('totalValue').textContent = '₹' + totalValue.toFixed(2);
    document.getElementById('todaySales').textContent = todaySales;
    document.getElementById('salesAmount').textContent = '₹' + todaySalesAmount.toFixed(2);
    
    // Calculate changes (simplified - in real app, compare with yesterday)
    const medicinesChange = document.getElementById('medicinesChange');
    medicinesChange.textContent = '+0 today';
    medicinesChange.style.color = '#28a745';
}

// Update recent medicines list
function updateRecentMedicines(medicines) {
    const container = document.getElementById('recentMedicines');
    if (!container) return;
    
    // Sort by creation date (newest first)
    const recentMedicines = [...medicines]
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .slice(0, 5);
    
    if (recentMedicines.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-pills fa-3x text-muted mb-3"></i>
                <p class="text-muted">No medicines found</p>
                <a href="add-medicine.html" class="btn btn-sm btn-primary">
                    <i class="fas fa-plus"></i> Add First Medicine
                </a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="medicine-list">';
    
    recentMedicines.forEach(medicine => {
        const expiryDate = new Date(medicine.expiryDate);
        const today = new Date();
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        let expiryBadge = '';
        if (daysToExpiry < 0) {
            expiryBadge = '<span class="expiry-badge expired">Expired</span>';
        } else if (daysToExpiry <= 30) {
            expiryBadge = `<span class="expiry-badge expiry-soon">${daysToExpiry} days</span>`;
        }
        
        let stockIndicator = 'stock-high';
        if (medicine.quantity <= 0) {
            stockIndicator = 'stock-empty';
        } else if (medicine.quantity < 10) {
            stockIndicator = 'stock-low';
        } else if (medicine.quantity < 50) {
            stockIndicator = 'stock-medium';
        }
        
        html += `
            <div class="medicine-item">
                <div style="flex: 1;">
                    <strong>${medicine.name}</strong>
                    <div style="font-size: 12px; color: #666;">
                        ${medicine.company} • ₹${medicine.price}
                        <span class="stock-indicator ${stockIndicator}"></span> ${medicine.quantity} units
                    </div>
                </div>
                <div>
                    ${expiryBadge}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Update alerts section
function updateAlerts(medicines) {
    const today = new Date();
    
    // Calculate alerts
    const expiredMedicines = medicines.filter(med => {
        const expiryDate = new Date(med.expiryDate);
        return expiryDate < today;
    });
    
    const expiringSoon = medicines.filter(med => {
        const expiryDate = new Date(med.expiryDate);
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        return daysToExpiry > 0 && daysToExpiry <= 30;
    });
    
    const lowStock = medicines.filter(med => med.quantity > 0 && med.quantity < 10);
    const outOfStock = medicines.filter(med => med.quantity <= 0);
    
    // Update counts
    document.getElementById('expiredMedicines').textContent = expiredMedicines.length;
    document.getElementById('expiringSoon').textContent = expiringSoon.length;
    document.getElementById('lowStock').textContent = lowStock.length;
    document.getElementById('outOfStock').textContent = outOfStock.length;
    
    // Update lists
    updateAlertList('expiredList', expiredMedicines, 'Expired');
    updateAlertList('expiringList', expiringSoon, 'Expiring soon');
    updateAlertList('lowStockList', lowStock, 'Low stock');
    updateAlertList('outOfStockList', outOfStock, 'Out of stock');
}

// Update alert list
function updateAlertList(elementId, medicines, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (medicines.length === 0) {
        element.innerHTML = '<em style="color: #666;">None</em>';
        return;
    }
    
    let html = '';
    medicines.slice(0, 3).forEach(med => {
        html += `<div>${med.name} (${med.quantity})</div>`;
    });
    
    if (medicines.length > 3) {
        html += `<div>+${medicines.length - 3} more</div>`;
    }
    
    element.innerHTML = html;
}

// Update stock chart
function updateStockChart(medicines) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    
    // Prepare chart data
    const categories = {
        'High Stock (>50)': medicines.filter(m => m.quantity > 50).length,
        'Medium Stock (11-50)': medicines.filter(m => m.quantity >= 11 && m.quantity <= 50).length,
        'Low Stock (1-10)': medicines.filter(m => m.quantity >= 1 && m.quantity <= 10).length,
        'Out of Stock': medicines.filter(m => m.quantity <= 0).length
    };
    
    const colors = {
        'High Stock (>50)': '#4caf50',
        'Medium Stock (11-50)': '#ff9800',
        'Low Stock (1-10)': '#f44336',
        'Out of Stock': '#9e9e9e'
    };
    
    // Destroy existing chart
    if (stockChart) {
        stockChart.destroy();
    }
    
    // Create new chart
    stockChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: Object.keys(categories).map(key => colors[key]),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = Object.values(categories).reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} medicines (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update recent sales
function updateRecentSales(salesData) {
    const container = document.getElementById('recentSales');
    if (!container) return;
    
    // Get recent sales (last 5)
    const recentSales = salesData.slice(0, 5);
    
    if (recentSales.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-shopping-cart fa-2x text-muted mb-3"></i>
                <p class="text-muted">No recent sales</p>
                <p class="text-muted small">Sales will appear here after billing</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-sm">';
    html += '<thead><tr><th>Bill No</th><th>Customer</th><th>Amount</th><th>Time</th></tr></thead><tbody>';
    
    recentSales.forEach(sale => {
        const time = new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        html += `
            <tr>
                <td>${sale.billNumber || 'N/A'}</td>
                <td>${sale.customer?.name || 'Walk-in'}</td>
                <td>₹${sale.total?.toFixed(2) || '0.00'}</td>
                <td>${time}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Update stock summary
function updateStockSummary(medicines) {
    const inStock = medicines.filter(m => m.quantity > 10).length;
    const lowStock = medicines.filter(m => m.quantity >= 1 && m.quantity <= 10).length;
    const emptyStock = medicines.filter(m => m.quantity <= 0).length;
    
    document.getElementById('inStockCount').textContent = inStock;
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('emptyStockCount').textContent = emptyStock;
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Listen for medicine updates from medicine.js
    window.addEventListener('medicineAdded', function() {
        console.log('Medicine added event received');
        setTimeout(loadDashboardData, 1000); // Wait 1 second for DB update
        addActivity('New medicine added to inventory', 'success');
    });
    
    window.addEventListener('medicineUpdated', function() {
        console.log('Medicine updated event received');
        setTimeout(loadDashboardData, 1000);
        addActivity('Medicine inventory updated', 'info');
    });
    
    window.addEventListener('medicineDeleted', function() {
        console.log('Medicine deleted event received');
        setTimeout(loadDashboardData, 1000);
        addActivity('Medicine removed from inventory', 'warning');
    });
    
    // Listen for sales updates
    window.addEventListener('saleCompleted', function() {
        console.log('Sale completed event received');
        setTimeout(loadDashboardData, 1000);
        addActivity('New sale completed', 'success');
    });
    
    // Save medicines to localStorage for offline access
    window.addEventListener('medicinesLoaded', function(event) {
        if (event.detail && Array.isArray(event.detail.medicines)) {
            localStorage.setItem('medicines', JSON.stringify(event.detail.medicines));
            localStorage.setItem('medicinesUpdated', Date.now().toString());
        }
    });
}

// Update last update time
function updateLastUpdateTime() {
    const timeElement = document.querySelector('.last-update');
    if (timeElement && lastUpdateTime) {
        timeElement.textContent = `Last updated: ${lastUpdateTime.toLocaleTimeString()}`;
    }
}

// Show loading state
function showLoading(show) {
    const loadingElement = document.querySelector('.loading-spinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
        <button onclick="this.parentElement.remove()" class="btn btn-sm btn-outline-danger ms-3">
            Dismiss
        </button>
    `;
    
    // Add to top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.prepend(errorDiv);
    }
}

// Add activity to feed
function addActivity(message, type = 'info') {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const icon = type === 'success' ? 'check-circle' :
                type === 'error' ? 'exclamation-triangle' :
                type === 'warning' ? 'exclamation-circle' : 'info-circle';
    
    activityItem.innerHTML = `
        <strong><i class="fas fa-${icon}"></i> ${message}</strong>
        <div class="activity-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    activityFeed.insertBefore(activityItem, activityFeed.firstChild);
    
    // Keep only last 5 activities
    if (activityFeed.children.length > 5) {
        activityFeed.removeChild(activityFeed.lastChild);
    }
}

// Trigger dashboard update from other pages
function triggerDashboardUpdate() {
    // Dispatch custom event
    const event = new Event('updateDashboard');
    window.dispatchEvent(event);
    
    // Also update localStorage to trigger storage event
    localStorage.setItem('dashboardUpdate', Date.now().toString());
}

// Export for use in other files
window.dashboard = {
    loadData: loadDashboardData,
    triggerUpdate: triggerDashboardUpdate,
    addActivity: addActivity
};