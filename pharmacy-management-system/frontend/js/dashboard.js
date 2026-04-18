// dashboard.js - Full Integrated Version with all Original Features
// const ko var mein badal diya taaki main.js se clash na ho
var BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';

// 1. Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Dashboard - Full System Loaded');
    
    if (window.location.pathname.includes('dashboard.html')) {
        // Initial Health Check and Stats Load
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) {
                console.warn('⚠️ Backend connection issue. Using local/demo data.');
            }
            loadDashboardStats();
        });

        // Setup Cross-tab update listener (Original Feature)
        window.addEventListener('storage', function(event) {
            const updates = ['medicineAdded', 'medicineUpdated', 'medicineDeleted', 'dashboardNeedsUpdate'];
            if (updates.includes(event.key)) {
                console.log('🔄 Remote change detected, refreshing dashboard...');
                loadDashboardStats();
            }
        });

        // Auto-refresh every 30 seconds (Original Feature)
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadDashboardStats();
            }
        }, 30000);
    }
});

// 2. Check Server Health
async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        return false;
    }
}

// 3. Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error('Backend failed');
        
        const data = await response.json();
        
        // FIX: Handle API response format properly (API usually wraps data in 'medicines' array)
        const medicinesArray = Array.isArray(data) ? data : (data.medicines || []);
        
        updateDashboardUI(medicinesArray);
        console.log('✅ Dashboard synced with Render. Total items:', medicinesArray.length);

    } catch (error) {
        console.error('❌ Stats Error:', error);
        useDemoDataForDashboard();
    }
}

// 4. Update UI Elements (All original calculations)
function updateDashboardUI(medicines) {
    if (!medicines || medicines.length === 0) {
        console.warn("⚠️ No medicines data received for dashboard calculation");
    }

    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    let stats = {
        totalMedicines: medicines.length,
        totalStock: 0,
        totalValue: 0,
        expiredCount: 0,
        expiringSoon: 0,
        lowStock: 0,
        outOfStock: 0
    };

    medicines.forEach(m => {
        const qty = parseInt(m.quantity) || 0;
        const price = parseFloat(m.price) || 0;
        const expiry = new Date(m.expiryDate);

        stats.totalStock += qty;
        stats.totalValue += (qty * price);

        if (qty <= 0) stats.outOfStock++;
        else if (qty < 10) stats.lowStock++;

        if (expiry < today) {
            stats.expiredCount++;
        } else if (expiry <= thirtyDaysLater) {
            stats.expiringSoon++;
        }
    });

    // Mapping to HTML IDs
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

    // Update HTML elements safely
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            // Animation for numbers
            let start = 0;
            const end = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
            if(!isNaN(end) && id !== 'totalStockValue') {
                const duration = 1000;
                const stepTime = Math.abs(Math.floor(duration / (end || 1)));
                const timer = setInterval(() => {
                    start += 1;
                    el.textContent = start;
                    if (start >= end) {
                        clearInterval(timer);
                        el.textContent = value;
                    }
                }, stepTime);
                if (end === 0) el.textContent = 0;
            } else {
                el.textContent = value;
            }
        }
    }

    // Update recent table (last 5 added)
    updateRecentMedicinesTable(medicines.slice(-5).reverse());
}

// 5. Recent Table Update
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

// 6. Demo Data Fallback
function useDemoDataForDashboard() {
    const demo = [
        { name: 'Paracetamol', company: 'Cipla', price: 5, quantity: 150, expiryDate: '2025-12-31' },
        { name: 'Aspirin', company: 'Bayer', price: 10, quantity: 5, expiryDate: '2024-04-10' }
    ];
    updateDashboardUI(demo);
}

window.loadDashboardStats = loadDashboardStats;