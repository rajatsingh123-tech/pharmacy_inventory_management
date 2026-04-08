// dashboard.js - Full Integrated Version (A to Z Original Features)
const BASE_URL = 'https://pharmacy-backend-api-31hh.onrender.com';

// 1. Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Dashboard - Full System Loaded');
    
    if (window.location.pathname.includes('dashboard.html')) {
        // Initial Health Check and Stats Load
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) {
                showMessage('⚠️ Backend connection issue. Using local/demo data.', 'warning');
            }
            loadDashboardStats();
        });

        // Setup Cross-tab update listener (Original Feature)
        window.addEventListener('storage', function(event) {
            const updates = ['medicineAdded', 'medicineUpdated', 'medicineDeleted', 'dashboardNeedsUpdate'];
            if (updates.includes(event.key)) {
                console.log('🔄 Remote change detected:', event.key);
                loadDashboardStats();
            }
        });

        // Auto-refresh every 30 seconds (Original Feature)
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('⏱️ Auto-refreshing dashboard...');
                loadDashboardStats();
            }
        }, 30000);
    }
});

// 2. Health Check Function
async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        return false;
    }
}

// 3. Core Function to Load Stats from Backend
async function loadDashboardStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error('API failed');
        
        const medicines = await response.json();
        
        // Save to localStorage for other pages
        localStorage.setItem('medicines', JSON.stringify(medicines));
        
        // Update all UI components
        updateDashboardUI(medicines);
        console.log('✅ Dashboard synced with Render');

    } catch (error) {
        console.error('❌ Stats Error:', error);
        useDemoData(); // Fallback
    }
}

// 4. Detailed UI Update (All Stats)
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

    // Update Text Elements (A to Z)
    setText('totalMedicines', stats.totalMedicines);
    setText('totalStock', stats.totalStock);
    setText('totalStockValue', '₹' + stats.totalValue.toFixed(2));
    setText('expiredMedicines', stats.expiredCount);
    setText('expiringSoon', stats.expiringSoon);
    setText('lowStock', stats.lowStock);
    setText('outOfStock', stats.outOfStock);
    
    // New Stock Summary Counts
    setText('inStockCount', medicines.filter(m => m.quantity > 10).length);
    setText('lowStockCount', stats.lowStock);
    setText('emptyStockCount', stats.outOfStock);

    // Update Tables
    updateRecentMedicinesTable(medicines.slice(-5).reverse());
}

// 5. Recent Medicines Table (Original HTML Logic)
function updateRecentMedicinesTable(recentMeds) {
    const container = document.getElementById('recentMedicines');
    if (!container) return;

    if (recentMeds.length === 0) {
        container.innerHTML = '<p class="text-muted">No medicines found</p>';
        return;
    }

    let html = '<table class="table table-sm"><tbody>';
    recentMeds.forEach(med => {
        const expiryDate = new Date(med.expiryDate);
        const daysToExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        let badge = '';
        if (daysToExpiry < 0) badge = '<span class="badge bg-danger">Expired</span>';
        else if (daysToExpiry <= 30) badge = `<span class="badge bg-warning">${daysToExpiry}d</span>`;
        else badge = `<span class="badge bg-success">Safe</span>`;

        html += `
            <tr>
                <td>${med.name}</td>
                <td>${med.company || '-'}</td>
                <td><strong>${med.quantity || 0}</strong></td>
                <td>${badge}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 6. Demo Data Feature (When backend is sleeping/offline)
function useDemoData() {
    console.warn('⚠️ Backend Offline - Loading Demo Data');
    const demo = [
        { name: 'Paracetamol 500mg', company: 'Cipla Ltd', price: 5.5, quantity: 150, expiryDate: '2025-12-31' },
        { name: 'Cetirizine 10mg', company: 'Sun Pharma', price: 8.75, quantity: 5, expiryDate: '2024-04-10' },
        { name: 'Aspirin 75mg', company: 'Bayer', price: 12.99, quantity: 25, expiryDate: '2026-08-15' }
    ];
    updateDashboardUI(demo);
    showMessage('Demo Mode: Backend currently offline or sleeping.', 'warning');
}

// 7. Utility: Set Text Content Safely
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// 8. Utility: Show Original Toast Message
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        messageDiv.innerHTML = `<div class="alert ${alertClass} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
        
        setTimeout(() => { messageDiv.innerHTML = ''; }, 5000);
    }
}

// Global Exposure for Manual Refresh
window.loadDashboardStats = loadDashboardStats;