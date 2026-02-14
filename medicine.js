// medicine.js - Pharmacy Management System
// Handles all medicine-related operations with dashboard integration

// Global variables
let medicineData = [];
let isBackendConnected = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Medicine.js loaded');
    
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
    // These elements are used in different pages
    const submitBtn = document.getElementById('submitBtn') || document.querySelector('button[type="submit"]');
    const searchInput = document.getElementById('searchInput');
    const medicinesContainer = document.getElementById('medicinesContainer');
    
    console.log('DOM Elements initialized');
}

// Handle medicine form submission
async function handleMedicineFormSubmit(e) {
    e.preventDefault();
    
    try {
        // Get form values
        const medicine = {
            name: document.getElementById('name').value.trim(),
            company: document.getElementById('company').value.trim(),
            price: parseFloat(document.getElementById('price').value),
            quantity: parseInt(document.getElementById('quantity').value),
            expiryDate: document.getElementById('expiryDate').value
        };
        
        // Validate inputs
        if (!medicine.name || !medicine.company || isNaN(medicine.price) || 
            isNaN(medicine.quantity) || !medicine.expiryDate) {
            showMessage('Please fill all fields correctly!', 'error');
            return;
        }
        
        if (medicine.price <= 0 || medicine.quantity <= 0) {
            showMessage('Price and quantity must be positive numbers!', 'error');
            return;
        }
        
        // Disable submit button to prevent multiple submissions
        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        console.log('Submitting medicine:', medicine);
        
        const response = await fetch('http://localhost:3000/api/medicines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(medicine)
        });
        
        if (response.ok) {
            const newMedicine = await response.json();
            showMessage('✅ Medicine added successfully!', 'success');
            document.getElementById('medicineForm').reset();
            
            // TRIGGER DASHBOARD UPDATE HERE
            triggerDashboardUpdate();
            
            // Dispatch event for other tabs
            localStorage.setItem('medicineAdded', Date.now().toString());
            
            // Redirect to view medicines page after 2 seconds
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
        // Re-enable submit button
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save Medicine';
        }
    }
}

// Load all medicines - FIXED VERSION
async function loadMedicines() {
    try {
        console.log('🔄 Loading medicines...');
        
        const medicinesContainer = document.getElementById('medicinesContainer');
        if (medicinesContainer) {
            medicinesContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading medicines from server...</p>
                </div>
            `;
        }
        
        // Try multiple API endpoints
        const apiEndpoints = [
            'http://localhost:3000/api/medicines',
            '/api/medicines'
        ];
        
        let response = null;
        let endpointUsed = '';
        
        // Try each endpoint until one works
        for (const endpoint of apiEndpoints) {
            try {
                console.log(`Trying endpoint: ${endpoint}`);
                response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                endpointUsed = endpoint;
                console.log(`Response status: ${response.status}`);
                
                // Check if we got HTML instead of JSON
                const contentType = response.headers.get('content-type') || '';
                const isHTML = contentType.includes('text/html');
                
                if (isHTML) {
                    console.warn(`⚠️ Endpoint ${endpoint} returned HTML instead of JSON`);
                    continue; // Try next endpoint
                }
                
                if (response.ok) {
                    break; // Found working endpoint
                }
                
            } catch (error) {
                console.warn(`Failed with ${endpoint}:`, error.message);
                continue; // Try next endpoint
            }
        }
        
        if (!response || !response.ok) {
            throw new Error('API endpoint failed. Server may be down.');
        }
        
        // Get response text first
        const responseText = await response.text();
        
        // Check if it's HTML
        if (responseText.trim().startsWith('<!DOCTYPE') || 
            responseText.trim().startsWith('<html')) {
            throw new Error('Server returned HTML page. API endpoint may not exist.');
        }
        
        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('✅ Successfully parsed JSON response');
            isBackendConnected = true;
        } catch (parseError) {
            console.error('❌ Failed to parse response as JSON:', parseError.message);
            throw new Error(`Invalid JSON response from server`);
        }
        
        // Process the data
        let medicinesArray = [];
        
        if (Array.isArray(data)) {
            medicinesArray = data;
        } else if (data && Array.isArray(data.medicines)) {
            medicinesArray = data.medicines;
        } else if (data && Array.isArray(data.data)) {
            medicinesArray = data.data;
        } else if (data && data.message) {
            throw new Error(`API Error: ${data.message}`);
        } else {
            // Try to convert object to array
            medicinesArray = Object.values(data);
        }
        
        console.log(`✅ Loaded ${medicinesArray.length} medicines from ${endpointUsed}`);
        
        // Store globally
        medicineData = medicinesArray;
        
        // Save to localStorage for dashboard access
        localStorage.setItem('medicines', JSON.stringify(medicinesArray));
        localStorage.setItem('medicinesUpdated', Date.now().toString());
        
        // Display medicines if on view-medicines page
        if (medicinesContainer) {
            if (medicinesArray.length === 0) {
                medicinesContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> No medicines found in database.
                        <a href="add-medicine.html" class="alert-link">Add some medicines</a> to get started.
                    </div>
                `;
            } else {
                displayMedicines(medicinesArray);
            }
        }
        
        // Update dashboard if on dashboard page
        if (window.location.pathname.includes('dashboard.html')) {
            updateDashboardStats(medicinesArray);
        }
        
        return medicinesArray;
        
    } catch (error) {
        console.error('❌ Error loading medicines:', error);
        
        const medicinesContainer = document.getElementById('medicinesContainer');
        if (medicinesContainer) {
            medicinesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle"></i> Failed to Load Medicines</h5>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <div class="mt-3">
                        <button onclick="loadMedicines()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        <button onclick="useDemoData()" class="btn btn-secondary">
                            <i class="fas fa-desktop"></i> Use Demo Data
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Use demo data for dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            useDemoDataForDashboard();
        }
        
        isBackendConnected = false;
        return [];
    }
}

// Use demo data when API fails
function useDemoData() {
    console.log('Using demo data...');
    
    const demoMedicines = [
        {
            _id: 'demo-1',
            name: 'Paracetamol 500mg',
            company: 'Cipla Ltd',
            price: 5.50,
            quantity: 150,
            expiryDate: '2025-12-31',
            createdAt: new Date()
        },
        {
            _id: 'demo-2',
            name: 'Cetirizine 10mg',
            company: 'Sun Pharma',
            price: 8.75,
            quantity: 80,
            expiryDate: '2024-11-30',
            createdAt: new Date()
        },
        {
            _id: 'demo-3',
            name: 'Aspirin 75mg',
            company: 'Bayer',
            price: 12.99,
            quantity: 25,
            expiryDate: '2024-08-15',
            createdAt: new Date()
        }
    ];
    
    medicineData = demoMedicines;
    
    const medicinesContainer = document.getElementById('medicinesContainer');
    if (medicinesContainer) {
        displayMedicines(demoMedicines);
    }
    
    if (window.location.pathname.includes('dashboard.html')) {
        updateDashboardStats(demoMedicines);
    }
    
    showMessage('Using demo data. Connect to server for real-time updates.', 'warning');
}

// Use demo data for dashboard
function useDemoDataForDashboard() {
    const demoMedicines = [
        { 
            name: 'Paracetamol', 
            company: 'Cipla',
            price: 5.50,
            quantity: 150, 
            expiryDate: '2025-12-31' 
        },
        { 
            name: 'Cetirizine', 
            company: 'Sun Pharma',
            price: 8.75,
            quantity: 80, 
            expiryDate: '2024-11-30' 
        },
        { 
            name: 'Aspirin', 
            company: 'Bayer',
            price: 12.99,
            quantity: 25, 
            expiryDate: '2024-08-15' 
        }
    ];
    
    updateDashboardStats(demoMedicines);
}

// Update dashboard statistics - FIXED VERSION
function updateDashboardStats(medicines) {
    try {
        console.log('📊 Updating dashboard stats with', medicines.length, 'medicines');
        
        // Calculate statistics
        const today = new Date();
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);
        
        let totalMedicines = 0;
        let totalStock = 0;
        let totalValue = 0;
        let expiredCount = 0;
        let expiringSoonCount = 0;
        let lowStockCount = 0;
        
        medicines.forEach(medicine => {
            totalMedicines++;
            totalStock += medicine.quantity || 0;
            totalValue += (medicine.price || 0) * (medicine.quantity || 0);
            
            // Check expiry
            if (medicine.expiryDate) {
                try {
                    const expiryDate = new Date(medicine.expiryDate);
                    if (expiryDate < today) {
                        expiredCount++;
                    } else if (expiryDate <= thirtyDaysLater) {
                        expiringSoonCount++;
                    }
                } catch (e) {
                    console.warn('Invalid expiry date:', medicine.expiryDate);
                }
            }
            
            // Check low stock
            if ((medicine.quantity || 0) < 10) {
                lowStockCount++;
            }
        });
        
        console.log('Dashboard calculations:', {
            totalMedicines,
            totalStock,
            totalValue,
            expiredCount,
            expiringSoonCount,
            lowStockCount
        });
        
        // Update DOM elements - CHECK ALL POSSIBLE IDs
        const elements = {
            'totalMedicines': totalMedicines,
            'totalStock': totalStock,
            'totalStockValue': '₹' + totalValue.toFixed(2),
            'expiredMedicines': expiredCount,
            'expiringSoon': expiringSoonCount,
            'lowStock': lowStockCount,
            'outOfStock': medicines.filter(m => !m.quantity || m.quantity <= 0).length,
            'inStockCount': medicines.filter(m => m.quantity && m.quantity > 10).length,
            'lowStockCount': lowStockCount,
            'emptyStockCount': medicines.filter(m => !m.quantity || m.quantity <= 0).length
        };
        
        // Update all elements
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`Updated ${id}: ${value}`);
            }
        }
        
        // Update recent medicines table
        updateRecentMedicinesTable(medicines.slice(0, 5));
        
        // Update stock summary
        updateStockSummary(medicines);
        
        console.log('✅ Dashboard stats updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating dashboard stats:', error);
    }
}

// Update recent medicines table
function updateRecentMedicinesTable(recentMedicines) {
    const recentContainer = document.getElementById('recentMedicines');
    if (!recentContainer) return;
    
    if (recentMedicines.length === 0) {
        recentContainer.innerHTML = '<p class="text-muted">No recent medicines</p>';
        return;
    }
    
    let html = '<table class="table table-sm"><tbody>';
    
    recentMedicines.forEach(med => {
        const expiryDate = new Date(med.expiryDate);
        const today = new Date();
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        let expiryBadge = '';
        if (daysToExpiry < 0) {
            expiryBadge = '<span class="badge bg-danger">Expired</span>';
        } else if (daysToExpiry <= 30) {
            expiryBadge = `<span class="badge bg-warning">${daysToExpiry}d</span>`;
        }
        
        html += `
            <tr>
                <td>${med.name}</td>
                <td>${med.company || '-'}</td>
                <td>${med.quantity || 0}</td>
                <td>${expiryBadge}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    recentContainer.innerHTML = html;
}

// Update stock summary
function updateStockSummary(medicines) {
    const inStock = medicines.filter(m => m.quantity > 10).length;
    const lowStock = medicines.filter(m => m.quantity >= 1 && m.quantity <= 10).length;
    const outOfStock = medicines.filter(m => !m.quantity || m.quantity <= 0).length;
    
    // Update elements if they exist
    ['inStockCount', 'lowStockCount', 'emptyStockCount'].forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            const values = [inStock, lowStock, outOfStock];
            element.textContent = values[index];
        }
    });
}

// Display medicines in table
function displayMedicines(medicines) {
    const container = document.getElementById('medicinesContainer');
    if (!container) return;
    
    if (!Array.isArray(medicines)) {
        console.error('displayMedicines called with non-array:', medicines);
        container.innerHTML = `
            <div class="alert alert-warning">
                Invalid data received. Expected array but got ${typeof medicines}
            </div>
        `;
        return;
    }
    
    if (medicines.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> No medicines found.
                <a href="add-medicine.html" class="alert-link">Add a medicine</a> to get started.
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Medicine Name</th>
                        <th>Company</th>
                        <th>Price (₹)</th>
                        <th>Quantity</th>
                        <th>Expiry Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    medicines.forEach((medicine, index) => {
        const expiryDate = new Date(medicine.expiryDate);
        const today = new Date();
        const isExpired = expiryDate < today;
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        const isLowStock = medicine.quantity < 10;
        const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry >= 0;
        
        let statusBadge = '';
        if (isExpired) {
            statusBadge = '<span class="badge bg-danger">Expired</span>';
        } else if (isExpiringSoon) {
            statusBadge = `<span class="badge bg-warning">${daysToExpiry}d</span>`;
        } else if (isLowStock) {
            statusBadge = '<span class="badge bg-warning">Low Stock</span>';
        } else {
            statusBadge = '<span class="badge bg-success">In Stock</span>';
        }
        
        html += `
            <tr class="${isExpired ? 'table-danger' : isLowStock ? 'table-warning' : ''}">
                <td>${index + 1}</td>
                <td><strong>${medicine.name}</strong></td>
                <td>${medicine.company || '-'}</td>
                <td>₹${medicine.price?.toFixed(2) || '0.00'}</td>
                <td class="${isLowStock ? 'fw-bold text-danger' : ''}">
                    ${medicine.quantity || 0}
                    ${isLowStock ? ' <i class="fas fa-exclamation-triangle"></i>' : ''}
                </td>
                <td class="${isExpired ? 'fw-bold text-danger' : ''}">
                    ${expiryDate.toLocaleDateString()}
                    ${isExpired ? ' <i class="fas fa-exclamation-circle"></i>' : ''}
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editMedicine('${medicine._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteMedicine('${medicine._id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <p class="text-muted">Showing ${medicines.length} medicines</p>
        </div>
    `;
    
    container.innerHTML = html;
}

// Search medicines
function searchMedicines() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!medicineData || medicineData.length === 0) {
        return;
    }
    
    const filtered = medicineData.filter(medicine => 
        medicine.name.toLowerCase().includes(searchTerm) ||
        (medicine.company && medicine.company.toLowerCase().includes(searchTerm))
    );
    
    displayMedicines(filtered);
}

// Edit medicine
function editMedicine(id) {
    // For now, show a simple prompt
    const newQuantity = prompt('Enter new quantity:');
    
    if (newQuantity !== null && !isNaN(newQuantity) && newQuantity.trim() !== '') {
        const quantity = parseInt(newQuantity);
        
        if (quantity < 0) {
            showMessage('Quantity cannot be negative!', 'error');
            return;
        }
        
        updateMedicineQuantity(id, quantity);
    }
}

// Update medicine quantity
async function updateMedicineQuantity(id, quantity) {
    try {
        const response = await fetch(`http://localhost:3000/api/medicines/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity })
        });
        
        if (response.ok) {
            const updatedMedicine = await response.json();
            showMessage('✅ Medicine quantity updated successfully!', 'success');
            
            // Reload medicines
            loadMedicines();
            
            // Trigger dashboard update
            triggerDashboardUpdate();
            
            // Dispatch event for other tabs
            localStorage.setItem('medicineUpdated', Date.now().toString());
            
        } else {
            const error = await response.json();
            showMessage(`❌ Error: ${error.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Error updating medicine:', error);
        showMessage('❌ Server error. Please try again later.', 'error');
    }
}

// Delete medicine
async function deleteMedicine(id) {
    if (!confirm('Are you sure you want to delete this medicine?\nThis action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/medicines/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('✅ Medicine deleted successfully!', 'success');
            
            // Reload medicines
            loadMedicines();
            
            // Trigger dashboard update
            triggerDashboardUpdate();
            
            // Dispatch event for other tabs
            localStorage.setItem('medicineDeleted', Date.now().toString());
            
        } else {
            const error = await response.json();
            showMessage(`❌ Error: ${error.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Error deleting medicine:', error);
        showMessage('❌ Server error. Please try again later.', 'error');
    }
}

// Trigger dashboard update
function triggerDashboardUpdate() {
    // Force reload medicines which will update dashboard
    loadMedicines();
    
    // Dispatch custom event for dashboard.js
    const event = new CustomEvent('dashboardUpdate', {
        detail: { timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
    
    // Update localStorage to trigger storage events for other tabs
    localStorage.setItem('dashboardNeedsUpdate', Date.now().toString());
}

// Test backend connection
async function testBackendConnection() {
    try {
        const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        console.log('Backend health:', data);
        return data.status === 'healthy';
    } catch (error) {
        console.error('Backend connection test failed:', error);
        return false;
    }
}

// Show message function
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert-toast');
    existingMessages.forEach(msg => msg.remove());
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-toast`;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-triangle' :
                 type === 'warning' ? 'exclamation-circle' : 'info-circle';
    
    messageDiv.innerHTML = `
        <div class="d-flex align-items-start">
            <i class="fas fa-${icon} mt-1 me-2"></i>
            <div class="flex-grow-1">${message}</div>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// Add CSS styles
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .alert-toast {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 10000 !important;
        }
        
        .badge {
            font-size: 0.75em;
            padding: 0.35em 0.65em;
        }
        
        .table-hover tbody tr:hover {
            background-color: rgba(0, 123, 255, 0.1);
        }
    `;
    
    // Only add if not already added
    if (!document.querySelector('style[data-medicine-css]')) {
        style.setAttribute('data-medicine-css', 'true');
        document.head.appendChild(style);
    }
}

// Setup storage event listener for cross-tab updates
window.addEventListener('storage', function(event) {
    if (event.key === 'medicineAdded' || 
        event.key === 'medicineUpdated' || 
        event.key === 'medicineDeleted' ||
        event.key === 'dashboardNeedsUpdate') {
        
        console.log('Storage event detected:', event.key);
        
        // Reload medicines to get updated data
        if (document.getElementById('medicinesContainer') || 
            window.location.pathname.includes('dashboard.html')) {
            loadMedicines();
        }
    }
});

// Auto-refresh for dashboard
if (window.location.pathname.includes('dashboard.html')) {
    // Refresh dashboard every 30 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadMedicines();
        }
    }, 30000);
}

// Make functions available globally
window.loadMedicines = loadMedicines;
window.editMedicine = editMedicine;
window.deleteMedicine = deleteMedicine;
window.updateMedicineQuantity = updateMedicineQuantity;
window.searchMedicines = searchMedicines;
window.useDemoData = useDemoData;
window.triggerDashboardUpdate = triggerDashboardUpdate;