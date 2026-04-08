// dashboard.js - Full Integrated Version with all Original Features
const BASE_URL = 'https://pharmacy-backend-api-31hh.onrender.com';

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
        
        const medicines = await response.json();
        updateDashboardUI(medicines);
        console.log('✅ Dashboard synced with Render');

    } catch (error) {
        console.error('❌ Stats Error:', error);
        useDemoDataForDashboard();
    }
}

// 4. Update UI Elements (All original calculations)
function updateDashboardUI(medicines) {
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
        'inStockCount': medicines.filter(m => m.quantity > 10).length,
        'lowStockCount': stats.lowStock,
        'emptyStockCount': stats.outOfStock
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    updateRecentMedicinesTable(medicines.slice(-5).reverse());
}

// 5. Recent Table Update
function updateRecentMedicinesTable(recentMeds) {
    const container = document.getElementById('recentMedicines');
    if (!container) return;

    let html = '<table class="table table-sm"><tbody>';
    recentMeds.forEach(med => {
        html += `<tr><td>${med.name}</td><td>${med.company || '-'}</td><td>${med.quantity || 0}</td></tr>`;
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