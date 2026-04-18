// dashboard.js - Full Integrated Version with Recent Sales Table
var BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';

// 1. Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Dashboard - Full System Loaded');
    
    if (window.location.pathname.includes('dashboard.html')) {
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) console.warn('⚠️ Backend connection issue. Using local data.');
            loadDashboardStats();
        });

        // Setup Cross-tab update listener
        window.addEventListener('storage', function(event) {
            const updates = ['medicineAdded', 'medicineUpdated', 'medicineDeleted', 'dashboardNeedsUpdate', 'billProcessed'];
            if (updates.includes(event.key)) {
                console.log('🔄 Remote change detected, refreshing dashboard...');
                loadDashboardStats();
            }
        });

        setInterval(() => {
            if (document.visibilityState === 'visible') loadDashboardStats();
        }, 30000);
    }
});

// 2. Check Server Health
async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) { return false; }
}

// 3. Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error('Backend failed');
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = JSON.parse(text);
        }
        
        const medicinesArray = Array.isArray(data) ? data : (data.medicines || data.data || []);
        
        updateDashboardUI(medicinesArray);
        updateSalesStats(); // This handles both top stats AND the recent sales table
    } catch (error) {
        console.error('❌ Stats Error:', error);
        useDemoDataForDashboard();
    }
}

// 4. Update UI Elements
function updateDashboardUI(medicines) {
    if (!medicines || medicines.length === 0) console.warn("⚠️ No medicines data");

    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    let stats = { totalMedicines: medicines.length, totalStock: 0, totalValue: 0, expiredCount: 0, expiringSoon: 0, lowStock: 0, outOfStock: 0 };

    medicines.forEach(m => {
        const qty = parseInt(m.quantity) || 0;
        const price = parseFloat(m.price) || 0;
        const expiry = new Date(m.expiryDate);

        stats.totalStock += qty;
        stats.totalValue += (qty * price);

        if (qty <= 0) stats.outOfStock++;
        else if (qty < 10) stats.lowStock++;

        if (expiry < today) stats.expiredCount++;
        else if (expiry <= thirtyDaysLater) stats.expiringSoon++;
    });

    const elements = {
        'totalMedicines': stats.totalMedicines,
        'totalStock': stats.totalStock,
        'totalStockValue': '₹' + stats.totalValue.toFixed(2),
        'expiredMedicines': stats.expiredCount,
        'expiringSoon': stats.expiringSoon,
        'lowStock': stats.lowStock,
        'outOfStock': stats.outOfStock,
        'inStockCount': medicines.filter(m => parseInt(m.quantity || 0) >= 10).length,
        'lowStockCount': stats.lowStock,
        'emptyStockCount': stats.outOfStock
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            let start = 0;
            const end = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
            
            if(!isNaN(end) && end > 0 && id !== 'totalStockValue') {
                const duration = 1000;
                let stepTime = Math.abs(Math.floor(duration / end));
                if (stepTime < 10) stepTime = 10;
                let stepJump = Math.ceil(end / (duration / stepTime));

                const timer = setInterval(() => {
                    start += stepJump;
                    if (start >= end) { clearInterval(timer); el.textContent = value; } 
                    else { el.textContent = start; }
                }, stepTime);
            } else {
                el.textContent = value;
            }
        }
    }
    updateRecentMedicinesTable(medicines.slice(-5).reverse());
}

// 5. Update Sales Stats & Recent Sales Table
function updateSalesStats() {
    try {
        const billHistory = JSON.parse(localStorage.getItem('billHistory') || '[]');
        const todayStr = new Date().toDateString();

        // 1. Update Top Summary Cards
        const todaySales = billHistory.filter(bill => new Date(bill.date).toDateString() === todayStr);
        const todaySalesCount = todaySales.length;
        const todaySalesAmount = todaySales.reduce((sum, bill) => sum + (bill.total || 0), 0);

        const salesCountEl = document.getElementById('todaySales');
        const salesAmtEl = document.getElementById('salesAmount');

        if(salesCountEl) salesCountEl.textContent = todaySalesCount;
        if(salesAmtEl) salesAmtEl.textContent = '₹' + todaySalesAmount.toFixed(2) + ' total';

        // 2. Generate Bottom Table HTML
        updateRecentSalesTable(billHistory);
    } catch (error) {
        console.error("Sales Calculation Error:", error);
    }
}

// NAYA FUNCTION: Recent Sales ka Table Banane ke liye
function updateRecentSalesTable(billHistory) {
    const container = document.getElementById('recentSales');
    if (!container) return;

    if (!billHistory || billHistory.length === 0) {
        container.innerHTML = '<p class="text-muted p-3">No recent sales data available</p>';
        return;
    }

    // Top 5 bills nikal rahe hain
    const recentBills = billHistory.slice(0, 5);
    
    let html = `
        <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
                <thead>
                    <tr>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    recentBills.forEach(bill => {
        // Time format: 02:30 PM
        const time = new Date(bill.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const customerName = bill.customer && bill.customer.name ? bill.customer.name : 'Walk-in Customer';
        const totalAmount = bill.total ? bill.total.toFixed(2) : '0.00';
        
        html += `
            <tr>
                <td><small class="text-muted">${bill.billNumber || '-'}</small></td>
                <td><strong>${customerName}</strong></td>
                <td><span style="color: #28a745; font-weight: bold;">₹${totalAmount}</span></td>
                <td><span class="badge" style="background: #e9ecef; color: #495057;">${time}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 6. Recent Medicines Table Update
function updateRecentMedicinesTable(recentMeds) {
    const container = document.getElementById('recentMedicines');
    if (!container) return;

    if (recentMeds.length === 0) {
        container.innerHTML = '<p class="text-muted p-2">No recent medicines found.</p>';
        return;
    }

    let html = '<table class="table table-sm"><tbody>';
    recentMeds.forEach(med => {
        html += `<tr>
            <td><strong>${med.name}</strong></td>
            <td><span class="badge ${med.quantity < 10 ? 'bg-warning' : 'bg-success'}">${med.quantity || 0} in stock</span></td>
        </tr>`;
    });
    container.innerHTML = html + '</tbody></table>';
}

// 7. Demo Data Fallback
function useDemoDataForDashboard() {
    const demo = [{ name: 'Paracetamol', company: 'Cipla', price: 5, quantity: 150, expiryDate: '2025-12-31' }];
    updateDashboardUI(demo);
}

window.loadDashboardStats = loadDashboardStats;