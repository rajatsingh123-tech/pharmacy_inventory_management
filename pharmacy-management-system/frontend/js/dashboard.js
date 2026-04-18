// dashboard.js - Full Integrated Version with Role-Based Cloud Bills
var BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';
let stockChartInstance = null; 

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Dashboard - Role Based System Loaded');
    
    if (window.location.pathname.includes('dashboard.html')) {
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) console.warn('⚠️ Backend connection issue. Using local data.');
            loadDashboardStats();
        });

        window.addEventListener('storage', function(event) {
            const updates = ['medicineAdded', 'medicineUpdated', 'medicineDeleted', 'dashboardNeedsUpdate', 'billProcessed'];
            if (updates.includes(event.key)) {
                loadDashboardStats();
            }
        });

        setInterval(() => {
            if (document.visibilityState === 'visible') loadDashboardStats();
        }, 30000);
    }
});

async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) { return false; }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error('Backend failed');
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = JSON.parse(await response.text());
        }
        
        const medicinesArray = Array.isArray(data) ? data : (data.medicines || data.data || []);
        
        updateDashboardUI(medicinesArray);
        updateSalesStats(); 
    } catch (error) {
        console.error('❌ Stats Error:', error);
        updateSalesStats(); 
    }
}

function updateDashboardUI(medicines) {
    if (!medicines || medicines.length === 0) return;

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

    const inStockCount = medicines.filter(m => parseInt(m.quantity || 0) >= 10).length;

    const elements = {
        'totalMedicines': stats.totalMedicines,
        'totalStock': stats.totalStock,
        'totalStockValue': '₹' + stats.totalValue.toFixed(2),
        'expiredMedicines': stats.expiredCount,
        'expiringSoon': stats.expiringSoon,
        'lowStock': stats.lowStock,
        'outOfStock': stats.outOfStock,
        'inStockCount': inStockCount,
        'lowStockCount': stats.lowStock,
        'emptyStockCount': stats.outOfStock
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
    
    updateStockChart(inStockCount, stats.lowStock, stats.outOfStock);
    updateRecentMedicinesTable(medicines.slice(-5).reverse());
}

function updateStockChart(inStock, lowStock, outOfStock) {
    const ctx = document.getElementById('stockChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (stockChartInstance) stockChartInstance.destroy();

    stockChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['In Stock (Good)', 'Low Stock (<10)', 'Out of Stock (0)'],
            datasets: [{
                data: [inStock, lowStock, outOfStock],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                hoverOffset: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// ==========================================
// 🔥 NAYA: Role-Based Sales Fetching 🔥
// ==========================================
async function updateSalesStats() {
    try {
        // Current user ko check karo ki kon login hai
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        
        let username = '';
        let role = 'staff';

        if(currentUser) {
            username = currentUser.username || '';
            role = currentUser.role || 'staff';
        }

        // URL mein role aur username pass karo
        const fetchUrl = `${BASE_URL}/api/bills?username=${username}&role=${role}`;
        
        const response = await fetch(fetchUrl);
        let billHistory = [];
        
        if (response.ok) {
            billHistory = await response.json(); 
            
            // Dashboard par header change karo taaki user ko pata chale wo kiska data dekh raha hai
            const salesHeader = document.querySelector('#recentSales')?.parentElement?.querySelector('h3');
            if(salesHeader) {
                if(role === 'admin') {
                    salesHeader.innerHTML = '<i class="fas fa-chart-line"></i> All Pharmacy Sales (Admin)';
                } else {
                    salesHeader.innerHTML = `<i class="fas fa-chart-line"></i> My Sales (${username})`;
                }
            }

        } else {
            console.warn("Cloud bills fail, using local storage");
            const localBills = localStorage.getItem('billHistory');
            billHistory = localBills ? JSON.parse(localBills) : [];
        }

        const todayStr = new Date().toDateString();
        const todaySales = billHistory.filter(bill => new Date(bill.date).toDateString() === todayStr);
        const todaySalesCount = todaySales.length;
        const todaySalesAmount = todaySales.reduce((sum, bill) => sum + (bill.total || 0), 0);

        const salesCountEl = document.getElementById('todaySales');
        const salesAmtEl = document.getElementById('salesAmount');

        if(salesCountEl) salesCountEl.textContent = todaySalesCount;
        if(salesAmtEl) salesAmtEl.textContent = '₹' + todaySalesAmount.toFixed(2) + ' total';

        updateRecentSalesTable(billHistory);
    } catch (error) { console.error("Sales Calculation Error:", error); }
}

function updateRecentSalesTable(billHistory) {
    try {
        const container = document.getElementById('recentSales');
        if (!container) return;

        if (!billHistory || billHistory.length === 0) {
            container.innerHTML = '<p class="text-muted p-3">No sales data available yet.</p>';
            return;
        }

        const recentBills = billHistory.slice(0, 5);
        let html = `<div class="table-responsive"><table class="table table-sm table-hover mb-0">
                    <thead><tr><th>Bill No</th><th>Customer</th><th>Issued By</th><th>Amount</th><th>Time</th></tr></thead><tbody>`;
        
        recentBills.forEach(bill => {
            const dateObj = new Date(bill.date || Date.now());
            const time = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const customerName = (bill.customer && bill.customer.name) ? bill.customer.name : 'Walk-in';
            const totalAmount = bill.total ? parseFloat(bill.total).toFixed(2) : '0.00';
            const issuedBy = bill.issuedBy || 'Unknown'; // NAYA: Table me bill bananey wale ka naam
            
            html += `<tr>
                <td><small class="text-muted">${bill.billNumber || '-'}</small></td>
                <td><strong>${customerName}</strong></td>
                <td><span class="badge" style="background:#e0e0e0; color:black;">${issuedBy}</span></td>
                <td><span style="color: #28a745; font-weight: bold;">₹${totalAmount}</span></td>
                <td><span class="badge" style="background: #e9ecef; color: #495057;">${time}</span></td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) { console.error("Table render error:", e); }
}

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

window.loadDashboardStats = loadDashboardStats;