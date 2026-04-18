// medicine.js - Pharmacy Management System (Full Render Version)
var BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';
let medicineData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Medicine.js Full Version Loaded');
    
    if (document.getElementById('medicinesContainer')) {
        loadMedicines();
    }
    
    const medicineForm = document.getElementById('medicineForm');
    if (medicineForm) {
        medicineForm.addEventListener('submit', handleMedicineFormSubmit);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchMedicines);
    }
    
    addStyles();
});

// 1. Load All Medicines
async function loadMedicines() {
    const container = document.getElementById('medicinesContainer');
    try {
        if (container) container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
        
        const response = await fetch(`${BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        medicineData = Array.isArray(data) ? data : (data.medicines || []);
        
        if (container) displayMedicines(medicineData);
        
        // Update dashboard if visible
        if (window.location.pathname.includes('dashboard.html')) {
            if (window.updateDashboardUI) window.updateDashboardUI(medicineData);
        }
    } catch (error) {
        console.error('Load Error:', error);
        if (container) container.innerHTML = '<div class="alert alert-danger">Failed to Load Medicines</div>';
    }
}

// 2. Form Submission
async function handleMedicineFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    const medicine = {
        name: document.getElementById('name').value.trim(),
        company: document.getElementById('company').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        quantity: parseInt(document.getElementById('quantity').value),
        expiryDate: document.getElementById('expiryDate').value
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const response = await fetch(`${BASE_URL}/api/medicines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(medicine)
        });

        if (response.ok) {
            alert('✅ Medicine added successfully!');
            localStorage.setItem('medicineAdded', Date.now());
            window.location.href = 'view-medicines.html';
        }
    } catch (error) {
        alert('❌ Server Error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save Medicine';
    }
}

// 3. Display Medicines Table
function displayMedicines(medicines) {
    const container = document.getElementById('medicinesContainer');
    if (!container) return;

    let html = `<div class="table-responsive"><table class="table table-hover">
        <thead><tr><th>#</th><th>Name</th><th>Company</th><th>Price</th><th>Qty</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>`;

    medicines.forEach((m, i) => {
        const isLow = m.quantity < 10;
        const isExpired = new Date(m.expiryDate) < new Date();
        
        html += `<tr class="${isExpired ? 'table-danger' : isLow ? 'table-warning' : ''}">
            <td>${i + 1}</td>
            <td><strong>${m.name}</strong></td>
            <td>${m.company}</td>
            <td>₹${m.price}</td>
            <td>${m.quantity}</td>
            <td>${new Date(m.expiryDate).toLocaleDateString()}</td>
            <td><span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">${isExpired ? 'Expired' : 'Active'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMedicine('${m._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + '</tbody></table></div>';
}

// 4. Delete Medicine
async function deleteMedicine(id) {
    if (!confirm('Are you sure?')) return;
    try {
        const response = await fetch(`${BASE_URL}/api/medicines/${id}`, { method: 'DELETE' });
        if (response.ok) {
            localStorage.setItem('medicineDeleted', Date.now());
            loadMedicines();
        }
    } catch (e) { alert('Delete failed'); }
}

// 5. Search & Styles
function searchMedicines() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = medicineData.filter(m => m.name.toLowerCase().includes(term));
    displayMedicines(filtered);
}

function addStyles() {
    const style = document.createElement('style');
    style.textContent = `.table-hover tbody tr:hover { background-color: rgba(0,0,0,0.05); }`;
    document.head.appendChild(style);
}

window.deleteMedicine = deleteMedicine;
window.loadMedicines = loadMedicines;