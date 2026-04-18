// medicine.js - Instant Inline Editing (Fixed for 8 Columns)
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

// 2. Table Render Function (Inline Edit Logic with Status Column)
function renderTable() {
    const tbody = document.getElementById('medicineTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (globalMedicines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No medicines found.</td></tr>';
        return;
    }
    
    globalMedicines.forEach((med, index) => {
        const isEditing = med._id === editingId;
        const tr = document.createElement('tr');
        
        // Status Calculate karna
        let statusText = 'Active';
        let statusColor = 'green'; 
        const today = new Date();
        const expiry = new Date(med.expiryDate);
        
        if (med.quantity <= 0) {
            statusText = 'Out of Stock';
            statusColor = 'red';
        } else if (expiry < today) {
            statusText = 'Expired';
            statusColor = 'red';
        }

        if (isEditing) {
            // EDIT MODE: Chhote input fields dikhao
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" class="form-control form-control-sm" value="${med.name}" disabled style="width: 100px;"></td>
                <td>${med.company || '-'}</td>
                <td><input type="number" id="editPrice-${med._id}" class="form-control form-control-sm" value="${med.price}" style="width: 70px;"></td>
                <td><input type="number" id="editQty-${med._id}" class="form-control form-control-sm" value="${med.quantity}" style="width: 70px;"></td>
                <td>${expiry.toLocaleDateString()}</td>
                <td style="color: ${statusColor}; font-weight: bold;">${statusText}</td>
                <td>
                    <button onclick="saveInlineEdit('${med._id}')" class="btn btn-sm btn-success" title="Save"><i class="fas fa-check"></i></button>
                    <button onclick="cancelEdit()" class="btn btn-sm btn-secondary" title="Cancel"><i class="fas fa-times"></i></button>
                </td>
            `;
        } else {
            // VIEW MODE: Normal text dikhao
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${med.name}</strong></td>
                <td>${med.company || '-'}</td>
                <td>₹${med.price}</td>
                <td>${med.quantity}</td>
                <td>${expiry.toLocaleDateString()}</td>
                <td style="color: ${statusColor};">${statusText}</td>
                <td>
                    <button onclick="startEdit('${med._id}')" class="btn btn-sm btn-primary" title="Edit" style="background: none; border: none; color: #4864e4; font-size: 16px; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteMedicine('${med._id}')" class="btn btn-sm btn-danger" title="Delete" style="background: none; border: none; color: black; font-size: 16px;"><i class="fas fa-trash"></i></button>
                </td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// --- Inline Edit Actions ---

window.startEdit = function(id) {
    editingId = id;
    renderTable(); // Table ko edit mode mein reload karo
};

window.cancelEdit = function() {
    editingId = null;
    renderTable(); // Table ko normal mode mein wapas laao
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
            editingId = null; // Edit mode band karo
            fetchMedicines(); // Naya data cloud se fetch karo
            localStorage.setItem('medicineUpdated', Date.now().toString()); // Dashboard update trigger karo
        } else {
            alert('Failed to update medicine.');
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('Server error while updating.');
    }
};

// --- Add & Delete Functions (Purana logic) ---

async function addMedicine(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;

    const medicineData = {
        name: document.getElementById('name').value,
        company: document.getElementById('company').value,
        price: Number(document.getElementById('price').value),
        quantity: Number(document.getElementById('quantity').value),
        expiryDate: document.getElementById('expiryDate').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(medicineData)
        });
        
        if (response.ok) {
            document.getElementById('addMedicineForm').reset();
            localStorage.setItem('medicineAdded', Date.now().toString());
            alert("Medicine added successfully!");
        }
    } catch (error) {
        console.error("Add error:", error);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteMedicine(id) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines/${id}`, { method: 'DELETE' });
        if (response.ok) {
            localStorage.setItem('medicineDeleted', Date.now().toString());
            fetchMedicines();
        }
    } catch (error) {
        console.error("Delete error:", error);
    }
}