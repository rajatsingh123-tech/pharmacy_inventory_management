// medicine.js - Pharmacy Management System
// Handles all medicine-related operations with dashboard integration

// Global variables
const BASE_URL = 'https://pharmacy-backend-api-31hh.onrender.com';
let medicineData = [];
let isBackendConnected = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Medicine.js full version loaded');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Load medicines for view page
    if (document.getElementById('medicinesContainer')) {
        loadMedicines();
    }
    
    // Load dashboard data if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        loadMedicines(); // This will update dashboard stats
    }
    
    // Handle medicine form submission
    const medicineForm = document.getElementById('medicineForm');
    if (medicineForm) {
        medicineForm.addEventListener('submit', handleMedicineFormSubmit);
    }
    
    // Handle search input
    const searchInputElem = document.getElementById('searchInput');
    if (searchInputElem) {
        searchInputElem.addEventListener('input', searchMedicines);
    }
    
    // Add CSS styles
    addStyles();
});

// Initialize DOM elements safely
function initializeDOMElements() {
    const submitBtn = document.getElementById('submitBtn') || document.querySelector('button[type="submit"]');
    const searchInput = document.getElementById('searchInput');
    const medicinesContainer = document.getElementById('medicinesContainer');
    console.log('DOM Elements initialized');
}

// Handle medicine form submission
async function handleMedicineFormSubmit(e) {
    e.preventDefault();
    
    try {
        const medicine = {
            name: document.getElementById('name').value.trim(),
            company: document.getElementById('company').value.trim(),
            price: parseFloat(document.getElementById('price').value),
            quantity: parseInt(document.getElementById('quantity').value),
            expiryDate: document.getElementById('expiryDate').value
        };
        
        if (!medicine.name || !medicine.company || isNaN(medicine.price) || 
            isNaN(medicine.quantity) || !medicine.expiryDate) {
            showMessage('Please fill all fields correctly!', 'error');
            return;
        }
        
        if (medicine.price <= 0 || medicine.quantity <= 0) {
            showMessage('Price and quantity must be positive numbers!', 'error');
            return;
        }
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        const response = await fetch(`${BASE_URL}/api/medicines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(medicine)
        });
        
        if (response.ok) {
            showMessage('✅ Medicine added successfully!', 'success');
            document.getElementById('medicineForm').reset();
            triggerDashboardUpdate();
            localStorage.setItem('medicineAdded', Date.now().toString());
            
            setTimeout(() => {
                window.location.href = 'view-medicines.html';
            }, 2000);
        } else {
            const error = await response.json();
            showMessage(`❌ Error: ${error.message}`, 'error');
        }
    } catch (error) {
        console.error('Error adding medicine:', error);
        showMessage('❌ Server error. Please try again later.', 'error');
    } finally {
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save Medicine';
        }
    }
}

// Load all medicines - FIXED VERSION FOR RENDER
async function loadMedicines() {
    try {
        console.log('🔄 Loading medicines from Render...');
        const medicinesContainer = document.getElementById('medicinesContainer');
        if (medicinesContainer) {
            medicinesContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-3">Loading medicines...</p></div>`;
        }
        
        const response = await fetch(`${BASE_URL}/api/medicines`);
        
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        const medicinesArray = Array.isArray(data) ? data : (data.medicines || []);
        
        medicineData = medicinesArray;
        isBackendConnected = true;
        
        localStorage.setItem('medicines', JSON.stringify(medicinesArray));
        localStorage.setItem('medicinesUpdated', Date.now().toString());
        
        if (medicinesContainer) {
            if (medicinesArray.length === 0) {
                medicinesContainer.innerHTML = `<div class="alert alert-info">No medicines found. <a href="add-medicine.html">Add some now</a>.</div>`;
            } else {
                displayMedicines(medicinesArray);
            }
        }
        
        if (window.location.pathname.includes('dashboard.html')) {
            if (window.updateDashboardUI) window.updateDashboardUI(medicinesArray);
        }
    } catch (error) {
        console.error('❌ Error loading medicines:', error);
        const medicinesContainer = document.getElementById('medicinesContainer');
        if (medicinesContainer) {
            medicinesContainer.innerHTML = `<div class="alert alert-danger"><h5>Failed to Load</h5><button onclick="loadMedicines()" class="btn btn-primary btn-sm mt-2">Try Again</button> <button onclick="useDemoData()" class="btn btn-secondary btn-sm mt-2">Use Demo Data</button></div>`;
        }
        if (window.location.pathname.includes('dashboard.html')) useDemoDataForDashboard();
    }
}

// Use demo data when API fails
function useDemoData() {
    const demoMedicines = [
        { _id: 'd1', name: 'Paracetamol 500mg', company: 'Cipla Ltd', price: 5.5, quantity: 150, expiryDate: '2025-12-31' },
        { _id: 'd2', name: 'Cetirizine 10mg', company: 'Sun Pharma', price: 8.75, quantity: 5, expiryDate: '2024-04-10' },
        { _id: 'd3', name: 'Aspirin 75mg', company: 'Bayer', price: 12.99, quantity: 25, expiryDate: '2026-08-15' }
    ];
    medicineData = demoMedicines;
    displayMedicines(demoMedicines);
    showMessage('Using demo data. Backend is offline.', 'warning');
}

function useDemoDataForDashboard() {
    const demo = [{ name: 'Test', company: 'Test', price: 0, quantity: 10, expiryDate: '2025-01-01' }];
    if (window.updateDashboardUI) window.updateDashboardUI(demo);
}

// Display medicines in table
function displayMedicines(medicines) {
    const container = document.getElementById('medicinesContainer');
    if (!container) return;
    
    let html = `<div class="table-responsive"><table class="table table-hover"><thead><tr><th>#</th><th>Medicine Name</th><th>Company</th><th>Price</th><th>Quantity</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    
    medicines.forEach((medicine, index) => {
        const expiryDate = new Date(medicine.expiryDate);
        const isExpired = expiryDate < new Date();
        const statusBadge = isExpired ? '<span class="badge bg-danger">Expired</span>' : '<span class="badge bg-success">In Stock</span>';
        
        html += `<tr>
            <td>${index + 1}</td>
            <td><strong>${medicine.name}</strong></td>
            <td>${medicine.company}</td>
            <td>₹${medicine.price}</td>
            <td>${medicine.quantity}</td>
            <td>${expiryDate.toLocaleDateString()}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editMedicine('${medicine._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMedicine('${medicine._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table></div>`;
}

// Edit/Update/Delete functions
async function updateMedicineQuantity(id, quantity) {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
        if (response.ok) {
            showMessage('✅ Updated successfully!', 'success');
            loadMedicines();
        }
    } catch (e) { showMessage('Update failed', 'error'); }
}

async function deleteMedicine(id) {
    if (!confirm('Delete this medicine?')) return;
    try {
        const response = await fetch(`${BASE_URL}/api/medicines/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showMessage('✅ Deleted!', 'success');
            loadMedicines();
            triggerDashboardUpdate();
        }
    } catch (e) { showMessage('Delete failed', 'error'); }
}

function editMedicine(id) {
    const newQty = prompt('Enter new quantity:');
    if (newQty && !isNaN(newQty)) updateMedicineQuantity(id, parseInt(newQty));
}

function searchMedicines() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = medicineData.filter(m => m.name.toLowerCase().includes(term) || m.company.toLowerCase().includes(term));
    displayMedicines(filtered);
}

function triggerDashboardUpdate() {
    loadMedicines();
    localStorage.setItem('dashboardNeedsUpdate', Date.now().toString());
}

function showMessage(message, type = 'info') {
    const existing = document.querySelectorAll('.alert-toast');
    existing.forEach(msg => msg.remove());
    const div = document.createElement('div');
    div.className = `alert alert-${type} alert-toast`;
    div.style.cssText = `position:fixed; top:20px; right:20px; z-index:10000; min-width:300px;`;
    div.innerHTML = `<strong>${message}</strong>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

function addStyles() {
    if (document.querySelector('style[data-medicine-css]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-medicine-css', 'true');
    style.textContent = `.alert-toast { animation: slideIn 0.3s ease; } @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
    document.head.appendChild(style);
}

// Global functions exposure
window.loadMedicines = loadMedicines;
window.editMedicine = editMedicine;
window.deleteMedicine = deleteMedicine;
window.searchMedicines = searchMedicines;
window.useDemoData = useDemoData;
window.triggerDashboardUpdate = triggerDashboardUpdate;