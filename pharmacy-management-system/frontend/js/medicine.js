// medicine.js - Ghost Bypass Version (100% Conflict Free)
var API_BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';
let globalMedicines = []; 
let editingId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('💊 Medicine System Loaded (Ghost Bypass Mode)');
    
    const addForm = document.getElementById('addMedicineForm');
    if (addForm) {
        addForm.addEventListener('submit', addNewMedicine);
    }
    
    if (window.location.pathname.includes('view-medicines.html')) {
        fetchMedicinesData(); // Naya function naam
    }
});

// 1. Fetch Data
window.fetchMedicinesData = async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines`);
        let data = await response.json();
        globalMedicines = Array.isArray(data) ? data : (data.medicines || data.data || []);
        drawMedicineTable(); // Naya function naam
    } catch (error) {
        console.error('Fetch error:', error);
    }
};

// 2. Render Full Table
window.drawMedicineTable = function() {
    const container = document.getElementById('inventoryContainer'); // NAYA ID
    if (!container) return;
    
    if (globalMedicines.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><p>No medicines found.</p></div>';
        return;
    }
    
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <thead>
                <tr style="background-color: #6a5acd; color: white; text-align: left;">
                    <th style="padding: 15px;">#</th>
                    <th style="padding: 15px;">Name</th>
                    <th style="padding: 15px;">Company</th>
                    <th style="padding: 15px;">Price</th>
                    <th style="padding: 15px;">Qty</th>
                    <th style="padding: 15px;">Expiry</th>
                    <th style="padding: 15px;">Status</th>
                    <th style="padding: 15px;">Action</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    globalMedicines.forEach((med, index) => {
        const isEditing = med._id === editingId;
        
        let statusText = 'Active';
        let statusColor = '#28a745'; 
        const today = new Date();
        const expiry = new Date(med.expiryDate);
        
        if (med.quantity <= 0) {
            statusText = 'Out of Stock';
            statusColor = '#dc3545';
        } else if (expiry < today) {
            statusText = 'Expired';
            statusColor = '#dc3545';
        }

        if (isEditing) {
            // EDIT MODE
            tableHTML += `
                <tr style="background-color: #f8f9fa; border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">${index + 1}</td>
                    <td style="padding: 15px;"><input type="text" value="${med.name}" disabled style="width: 100px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; background: #e9ecef;"></td>
                    <td style="padding: 15px;">${med.company || '-'}</td>
                    <td style="padding: 15px;"><input type="number" id="editPrice-${med._id}" value="${med.price}" style="width: 70px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;"></td>
                    <td style="padding: 15px;"><input type="number" id="editQty-${med._id}" value="${med.quantity}" style="width: 70px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;"></td>
                    <td style="padding: 15px;">${expiry.toLocaleDateString()}</td>
                    <td style="padding: 15px; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                    <td style="padding: 15px; white-space: nowrap;">
                        <button onclick="saveInlineEdit('${med._id}')" title="Save" style="background: none; border: none; color: #28a745; font-size: 18px; cursor: pointer;"><i class="fas fa-check-circle"></i></button>
                        <button onclick="cancelEdit()" title="Cancel" style="background: none; border: none; color: #6c757d; font-size: 18px; cursor: pointer; margin-left: 10px;"><i class="fas fa-times-circle"></i></button>
                    </td>
                </tr>
            `;
        } else {
            // VIEW MODE
            tableHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">${index + 1}</td>
                    <td style="padding: 15px;"><strong>${med.name}</strong></td>
                    <td style="padding: 15px;">${med.company || '-'}</td>
                    <td style="padding: 15px;">₹${med.price}</td>
                    <td style="padding: 15px;">${med.quantity}</td>
                    <td style="padding: 15px;">${expiry.toLocaleDateString()}</td>
                    <td style="padding: 15px; color: ${statusColor}; font-weight: 500;">${statusText}</td>
                    <td style="padding: 15px; white-space: nowrap;">
                        <button onclick="startEdit('${med._id}')" title="Edit" style="background: none; border: none; color: #4864e4; font-size: 16px; cursor: pointer; margin-right: 10px;"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteMedicineEntry('${med._id}')" title="Delete" style="background: none; border: none; color: black; font-size: 16px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }
    });
    
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
};

// --- Inline Edit Actions ---
window.startEdit = function(id) {
    editingId = id;
    drawMedicineTable(); 
};

window.cancelEdit = function() {
    editingId = null;
    drawMedicineTable(); 
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
            fetchMedicinesData(); 
            localStorage.setItem('medicineUpdated', Date.now().toString()); 
        } else {
            alert('Failed to update medicine.');
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('Server error while updating.');
    }
};

// --- Add & Delete Functions ---
window.addNewMedicine = async function(e) {
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
};

window.deleteMedicineEntry = async function(id) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/medicines/${id}`, { method: 'DELETE' });
        if (response.ok) {
            localStorage.setItem('medicineDeleted', Date.now().toString());
            fetchMedicinesData();
        }
    } catch (error) {
        console.error("Delete error:", error);
    }
};