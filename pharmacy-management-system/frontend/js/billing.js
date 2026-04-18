// billing.js - Complete Working Billing System (Cloud Integrated with Role Tracking)

// Global variables
var API_BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';
let cartItems = [];
let medicineData = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Billing System Initialized');
    loadMedicinesForBilling();
    initializeEventListeners();
    loadSavedCart();
});

// Initialize event listeners
function initializeEventListeners() {
    const addToBillBtn = document.getElementById('addToBillBtn');
    if (addToBillBtn) addToBillBtn.addEventListener('click', addToBill);
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', processBill);
    
    const clearBillBtn = document.getElementById('clearBillBtn');
    if (clearBillBtn) clearBillBtn.addEventListener('click', clearBill);
    
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); addToBill(); }
        });
    }
    
    const discountInput = document.getElementById('discountAmount');
    if (discountInput) discountInput.addEventListener('change', updateBillSummary);
}

// Load medicines for billing dropdown
async function loadMedicinesForBilling() {
    try {
        const medicineSelect = document.getElementById('medicineSelect');
        if (!medicineSelect) return;
        
        medicineSelect.innerHTML = '<option value="">Loading medicines...</option>';
        medicineSelect.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = JSON.parse(await response.text());
        }
        
        let medicinesArray = [];
        if (Array.isArray(data)) medicinesArray = data;
        else if (data && Array.isArray(data.medicines)) medicinesArray = data.medicines;
        else if (data && Array.isArray(data.data)) medicinesArray = data.data;
        else throw new Error('Invalid data format');
        
        medicineData = medicinesArray;
        populateMedicineDropdown(medicinesArray.filter(med => med.quantity > 0));
        
    } catch (error) {
        console.error('Error loading medicines:', error);
        medicineData = getFallbackMedicines();
        populateMedicineDropdown(medicineData.filter(med => med.quantity > 0));
        showMessage('⚠️ Using demo data. Connect to server for real-time inventory.', 'warning');
    }
}

// Populate medicine dropdown
function populateMedicineDropdown(medicines) {
    const medicineSelect = document.getElementById('medicineSelect');
    if (!medicineSelect) return;
    
    medicineSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Medicine';
    defaultOption.selected = true;
    medicineSelect.appendChild(defaultOption);
    
    if (medicines.length === 0) {
        const noStockOption = document.createElement('option');
        noStockOption.value = '';
        noStockOption.textContent = 'No medicines available';
        noStockOption.disabled = true;
        medicineSelect.appendChild(noStockOption);
        medicineSelect.disabled = true;
        return;
    }
    
    medicines.forEach(medicine => {
        const option = document.createElement('option');
        option.value = medicine._id || medicine.id;
        option.textContent = `${medicine.name} - ₹${medicine.price} (Stock: ${medicine.quantity})`;
        option.dataset.price = medicine.price;
        option.dataset.stock = medicine.quantity;
        option.dataset.name = medicine.name;
        medicineSelect.appendChild(option);
    });
    
    medicineSelect.disabled = false;
}

function getFallbackMedicines() {
    return [
        { _id: '1', name: 'Paracetamol 500mg', company: 'Cipla Ltd', price: 5.50, quantity: 100, expiryDate: '2025-12-31' }
    ];
}

// Add medicine to bill
function addToBill() {
    try {
        const medicineSelect = document.getElementById('medicineSelect');
        const quantityInput = document.getElementById('quantity');
        
        if (!medicineSelect || !quantityInput) return;
        
        const medicineId = medicineSelect.value;
        let quantity = parseInt(quantityInput.value);
        
        if (!medicineId) { showMessage('❌ Please select a medicine', 'error'); return; }
        if (isNaN(quantity) || quantity <= 0) { showMessage('❌ Please enter a valid quantity', 'error'); return; }
        
        const selectedOption = medicineSelect.options[medicineSelect.selectedIndex];
        const medicineName = selectedOption.dataset.name || selectedOption.textContent.split(' - ')[0];
        const price = parseFloat(selectedOption.dataset.price);
        const availableStock = parseInt(selectedOption.dataset.stock);
        
        if (quantity > availableStock) {
            showMessage(`❌ Only ${availableStock} units available in stock`, 'error');
            quantityInput.value = availableStock;
            return;
        }
        
        addToCart(medicineId, medicineName, price, quantity, availableStock);
        
        medicineSelect.selectedIndex = 0;
        quantityInput.value = 1;
        medicineSelect.focus();
        showMessage(`✅ Added ${quantity} × ${medicineName} to bill`, 'success');
        
    } catch (error) { showMessage('❌ Error adding item to bill', 'error'); }
}

function addToCart(medicineId, name, price, quantity, maxStock) {
    const existingItemIndex = cartItems.findIndex(item => item.id === medicineId);
    if (existingItemIndex !== -1) {
        const newQuantity = cartItems[existingItemIndex].quantity + quantity;
        if (newQuantity > maxStock) { showMessage(`❌ Cannot add more than ${maxStock} units`, 'error'); return; }
        cartItems[existingItemIndex].quantity = newQuantity;
        cartItems[existingItemIndex].total = newQuantity * price;
    } else {
        cartItems.push({ id: medicineId, name: name, price: price, quantity: quantity, total: price * quantity, maxStock: maxStock });
    }
    updateBillTable(); updateBillSummary(); saveCartToLocalStorage();
}

function updateBillTable() {
    const billTableBody = document.getElementById('billTableBody');
    const emptyBillMessage = document.getElementById('emptyBillMessage');
    
    if (!billTableBody) return;
    billTableBody.innerHTML = '';
    
    if (cartItems.length === 0) {
        if (emptyBillMessage) emptyBillMessage.style.display = 'table-row';
        return;
    }
    if (emptyBillMessage) emptyBillMessage.style.display = 'none';
    
    cartItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td><td>${item.name}</td><td>₹${item.price.toFixed(2)}</td>
            <td>
                <div class="quantity-control">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}><i class="fas fa-minus"></i></button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.maxStock}" onchange="updateQuantity(${index}, this.value)">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, ${item.quantity + 1})" ${item.quantity >= item.maxStock ? 'disabled' : ''}><i class="fas fa-plus"></i></button>
                </div>
            </td>
            <td>₹${item.total.toFixed(2)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button></td>
        `;
        billTableBody.appendChild(row);
    });
}

function updateQuantity(index, newQuantity) {
    if (isNaN(newQuantity) || newQuantity < 1) newQuantity = 1;
    const item = cartItems[index];
    newQuantity = Math.min(newQuantity, item.maxStock);
    if (newQuantity !== item.quantity) {
        cartItems[index].quantity = newQuantity; cartItems[index].total = newQuantity * item.price;
        updateBillTable(); updateBillSummary(); saveCartToLocalStorage();
    }
}

function removeFromCart(index) {
    if (confirm('Remove this item from bill?')) {
        cartItems.splice(index, 1); updateBillTable(); updateBillSummary(); saveCartToLocalStorage();
        showMessage('Item removed from bill', 'info');
    }
}

function updateBillSummary() {
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('billTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!subtotalElement || !taxElement || !totalElement) return;
    
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.05;
    const discount = parseFloat(document.getElementById('discountAmount')?.value || 0);
    const total = subtotal + tax - discount;
    
    subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
    taxElement.textContent = `₹${tax.toFixed(2)}`;
    totalElement.textContent = `₹${total.toFixed(2)}`;
    
    const discountElement = document.getElementById('discount');
    if (discountElement) discountElement.textContent = `-₹${discount.toFixed(2)}`;
    if (checkoutBtn) checkoutBtn.disabled = cartItems.length === 0;
}

function clearBill() {
    if (cartItems.length === 0) return;
    if (confirm('Clear all items from bill?')) {
        cartItems = []; updateBillTable(); updateBillSummary(); localStorage.removeItem('currentCart');
        showMessage('Bill cleared successfully', 'success');
    }
}

// ==========================================
// PROCESS BILL (With Role-Based Thappa)
// ==========================================
async function processBill() {
    if (cartItems.length === 0) { showMessage('❌ No items in bill to process', 'error'); return; }
    
    try {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) { checkoutBtn.disabled = true; checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }
        
        const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
        const tax = subtotal * 0.05;
        const discount = parseFloat(document.getElementById('discountAmount')?.value || 0);
        const total = subtotal + tax - discount;
        
        const customerName = document.getElementById('customerName')?.value || 'Walk-in Customer';
        const customerPhone = document.getElementById('customerPhone')?.value || '';
        
        // 🔥 LocalStorage se current user nikalna aur uska naam save karna
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const issuedBy = currentUser ? currentUser.username : 'Unknown';
        
        const billData = {
            customer: { name: customerName, phone: customerPhone },
            items: cartItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, total: item.total })),
            subtotal: subtotal, tax: tax, discount: discount, total: total,
            date: new Date().toISOString(),
            billNumber: 'BILL-' + Date.now(),
            issuedBy: issuedBy // 🔥 Thappa lag gaya yahan par!
        };
        
        // 1. Update medicine stock in backend
        try {
            await fetch(`${API_BASE_URL}/api/medicines/bill/process`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cartItems.map(item => ({ id: item.id, quantity: item.quantity })) })
            });
        } catch (error) { console.warn('⚠️ Could not update backend stock'); }
        
        // 2. Save Bill directly to MongoDB Cloud
        try {
            const saveResponse = await fetch(`${API_BASE_URL}/api/bills`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData)
            });
            if(saveResponse.ok) console.log('✅ Bill saved to cloud MongoDB successfully!');
        } catch (err) { console.error('⚠️ Failed to save bill to cloud:', err); }
        
        saveBillToHistory(billData);
        generateReceipt(billData);
        
        cartItems = [];
        if (document.getElementById('discountAmount')) document.getElementById('discountAmount').value = '0';
        
        updateBillTable(); updateBillSummary(); localStorage.removeItem('currentCart');
        loadMedicinesForBilling(); triggerDashboardUpdate();
        
        showMessage(`✅ Bill processed successfully by ${issuedBy}!`, 'success');
        
    } catch (error) {
        showMessage('❌ Error processing bill: ' + error.message, 'error');
    } finally {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Process Bill'; }
    }
}

function saveBillToHistory(billData) {
    try {
        let billHistory = JSON.parse(localStorage.getItem('billHistory') || '[]');
        billHistory.unshift(billData);
        if (billHistory.length > 50) billHistory = billHistory.slice(0, 50);
        localStorage.setItem('billHistory', JSON.stringify(billHistory));
    } catch (error) {}
}

function triggerDashboardUpdate() {
    localStorage.setItem('billProcessed', Date.now().toString());
    localStorage.setItem('medicinesUpdated', Date.now().toString());
}

function saveCartToLocalStorage() { try { localStorage.setItem('currentCart', JSON.stringify(cartItems)); } catch (e) {} }

function loadSavedCart() {
    try {
        const savedCart = localStorage.getItem('currentCart');
        if (savedCart) {
            cartItems = JSON.parse(savedCart);
            if (cartItems.length > 0) { updateBillTable(); updateBillSummary(); }
        }
    } catch (e) {}
}

function generateReceipt(billData) {
    const receiptContainer = document.createElement('div');
    receiptContainer.className = 'receipt-container';
    receiptContainer.style.cssText = `background: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 20px auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); font-family: 'Courier New', monospace;`;
    
    // Receipt me user ka naam dikhao
    const cashierName = billData.issuedBy !== 'Unknown' ? billData.issuedBy : 'Admin';

    receiptContainer.innerHTML = `
        <div class="text-center mb-4">
            <h3>🏥 PharmaCare Pharmacy</h3>
            <p>123 Medical Street, City - 560001</p>
            <p>📞 +91 9876543210 | GSTIN: 29ABCDE1234F1Z5</p>
            <hr>
        </div>
        <div class="row mb-3" style="display:flex; justify-content:space-between;">
            <div>
                <p><strong>Bill No:</strong> ${billData.billNumber}</p>
                <p><strong>Date:</strong> ${new Date(billData.date).toLocaleString()}</p>
            </div>
            <div style="text-align:right;">
                <p><strong>Cashier:</strong> ${cashierName}</p>
                <p><strong>Customer:</strong> ${billData.customer.name}</p>
                ${billData.customer.phone ? `<p><strong>Phone:</strong> ${billData.customer.phone}</p>` : ''}
            </div>
        </div>
        <table style="width:100%; text-align:left; border-collapse:collapse; margin-bottom:15px;">
            <thead style="border-bottom:1px solid #000; border-top:1px solid #000;">
                <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Amount</th></tr>
            </thead>
            <tbody>
                ${billData.items.map(item => `
                    <tr><td>${item.name}</td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">₹${item.price.toFixed(2)}</td><td style="text-align:right;">₹${item.total.toFixed(2)}</td></tr>
                `).join('')}
            </tbody>
        </table>
        <div style="text-align:right;">
            <p>Subtotal: ₹${billData.subtotal.toFixed(2)}</p>
            <p>Tax (5%): ₹${billData.tax.toFixed(2)}</p>
            <p>Discount: -₹${billData.discount.toFixed(2)}</p>
            <hr>
            <h4 style="margin:5px 0;">Total Amount: ₹${billData.total.toFixed(2)}</h4>
        </div>
        <hr>
        <div class="text-center mt-4">
            <button onclick="printReceipt(this)" class="btn btn-primary" style="padding:8px 15px; margin-right:10px;"><i class="fas fa-print"></i> Print</button>
            <button onclick="this.closest('.receipt-container').remove()" class="btn btn-secondary" style="padding:8px 15px;"><i class="fas fa-times"></i> Close</button>
        </div>
    `;
    document.querySelector('.main-content').appendChild(receiptContainer);
    receiptContainer.scrollIntoView({ behavior: 'smooth' });
}

function printReceipt(button) {
    const receiptContainer = button.closest('.receipt-container');
    if (!receiptContainer) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Receipt</title>
        <style>body{font-family:Arial;margin:20px}@media print{button{display:none!important}}</style>
        </head><body>${receiptContainer.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
}

function showMessage(message, type = 'info') {
    const existing = document.querySelectorAll('.alert-toast');
    existing.forEach(msg => msg.remove());
    const div = document.createElement('div');
    div.className = `alert alert-${type} alert-toast`;
    div.style.cssText = `position:fixed;top:20px;right:20px;z-index:10000;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:15px;border-radius:5px;background:white;border-left:4px solid ${type==='success'?'#28a745':'#dc3545'};`;
    div.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>${message}</span><strong style="cursor:pointer;" onclick="this.parentElement.parentElement.remove()">X</strong></div>`;
    document.body.appendChild(div);
    setTimeout(() => { if (div.parentElement) div.remove(); }, 5000);
}

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.printReceipt = printReceipt;
window.addToBill = addToBill;
window.processBill = processBill;
window.clearBill = clearBill;