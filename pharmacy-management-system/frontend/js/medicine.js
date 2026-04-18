// medicine.js - Instant Inline Editing (No Popups)
var API_BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';
let globalMedicines = []; 
let editingId = null; // Track karne ke liye ki kaunsi row edit ho rahi hai

document.addEventListener('DOMContentLoaded', function() {
    console.log('💊 Medicine System Loaded (Inline Edit Mode)');
    
    const addForm = document.getElementById('addMedicineForm');
    if (addForm) {
        addForm.addEventListener('submit', addMedicine);
    }
    
    if (window.location.pathname.includes('view-medicines.html')) {
        fetchMedicines();
    }
});

// 1. Fetch Data from Cloud
async function fetchMedicines() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines`);
        let data = await response.json();
        globalMedicines = Array.isArray(data) ? data : (data.medicines || data.data || []);
        renderTable();
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// 2. Table Render Function (Inline Logic)
function renderTable() {
    const tbody = document.getElementById('medicineTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    globalMedicines.forEach((med, index) => {
        const isEditing = med._id === editingId;
        const tr = document.createElement('tr');

        if (isEditing) {
            // EDIT MODE: Input fields dikhao
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" id="editName-${med._id}" class="form-control form-control-sm" value="${med.name}" disabled></td>
                <td>${med.company || '-'}</td>
                <td><input type="number" id="editPrice-${med._id}" class="form-control form-control-sm" value="${med.price}"></td>
                <td><input type="number" id="editQty-${med._id}" class="form-control form-control-sm" value="${med.quantity}"></td>
                <td>${new Date(med.expiryDate).toLocaleDateString()}</td>
                <td>
                    <button onclick="saveInlineEdit('${med._id}')" class="btn btn-sm btn-success">Save</button>
                    <button onclick="cancelEdit()" class="btn btn-sm btn-secondary">Cancel</button>
                </td>
            `;
        } else {
            // VIEW MODE: Normal text dikhao
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${med.name}</strong></td>
                <td>${med.company || '-'}</td>
                <td>₹${med.price}</td>
                <td><span class="badge ${med.quantity < 10 ? 'bg-danger' : 'bg-success'}">${med.quantity}</span></td>
                <td>${new Date(med.expiryDate).toLocaleDateString()}</td>
                <td>
                    <button onclick="startEdit('${med._id}')" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="deleteMedicine('${med._id}')" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i></button>
                </td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// --- Inline Actions ---

window.startEdit = function(id) {
    editingId = id;
    renderTable();
};

window.cancelEdit = function() {
    editingId = null;
    renderTable();
};

window.saveInlineEdit = async function(id) {
    const newPrice = document.getElementById(`editPrice-${id}`).value;
    const newQty = document.getElementById(`editQty-${id}`).value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: Number(newPrice), quantity: Number(newQty) })
        });

        if (response.ok) {
            editingId = null;
            fetchMedicines(); // Refresh data
            localStorage.setItem('medicineUpdated', Date.now().toString());
        }
    } catch (error) {
        alert('Update failed');
    }
};

// Add/Delete functions (Purana logic same rahega)
async function addMedicine(e) {
    e.preventDefault();
    const medicineData = {
        name: document.getElementById('name').value,
        company: document.getElementById('company').value,
        price: Number(document.getElementById('price').value),
        quantity: Number(document.getElementById('quantity').value),
        expiryDate: document.getElementById('expiryDate').value
    };
    const response = await fetch(`${API_BASE_URL}/api/medicines`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicineData)
    });
    if (response.ok) {
        document.getElementById('addMedicineForm').reset();
        fetchMedicines();
    }
}

async function deleteMedicine(id) {
    if (!confirm('Delete this medicine?')) return;
    const response = await fetch(`${API_BASE_URL}/api/medicines/${id}`, { method: 'DELETE' });
    if (response.ok) fetchMedicines();
}