// billing.js - Complete Working Billing System (Cloud Integrated)

// Global variables
var API_BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';
let cartItems = [];
let medicineData = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Billing System Initialized');
    
    // Load medicines for dropdown
    loadMedicinesForBilling();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load any saved cart
    loadSavedCart();
});

// Initialize event listeners
function initializeEventListeners() {
    // Add to bill button
    const addToBillBtn = document.getElementById('addToBillBtn');
    if (addToBillBtn) {
        addToBillBtn.addEventListener('click', addToBill);
    }
    
    // Process bill button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processBill);
    }
    
    // Clear bill button
    const clearBillBtn = document.getElementById('clearBillBtn');
    if (clearBillBtn) {
        clearBillBtn.addEventListener('click', clearBill);
    }
    
    // Quantity input - Enter key support
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addToBill();
            }
        });
    }
    
    // Discount input
    const discountInput = document.getElementById('discountAmount');
    if (discountInput) {
        discountInput.addEventListener('change', updateBillSummary);
    }
}

// Load medicines for billing dropdown
async function loadMedicinesForBilling() {
    try {
        console.log('Loading medicines for billing...');
        
        const medicineSelect = document.getElementById('medicineSelect');
        if (!medicineSelect) {
            console.error('Medicine select element not found');
            return;
        }
        
        // Show loading state
        medicineSelect.innerHTML = '<option value="">Loading medicines...</option>';
        medicineSelect.disabled = true;
        
        // Fetch medicines from API
        const response = await fetch(`${API_BASE_URL}/api/medicines`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = JSON.parse(text);
        }
        
        // Process the data
        let medicinesArray = [];
        
        if (Array.isArray(data)) {
            medicinesArray = data;
        } else if (data && Array.isArray(data.medicines)) {
            medicinesArray = data.medicines;
        } else if (data && Array.isArray(data.data)) {
            medicinesArray = data.data;
        } else {
            throw new Error('Invalid data format');
        }
        
        // Store globally
        medicineData = medicinesArray;
        
        // Populate dropdown with available medicines
        populateMedicineDropdown(medicinesArray.filter(med => med.quantity > 0));
        
        console.log(`✅ Loaded ${medicinesArray.length} medicines`);
        
    } catch (error) {
        console.error('Error loading medicines:', error);
        
        // Use fallback data
        medicineData = getFallbackMedicines();
        populateMedicineDropdown(medicineData.filter(med => med.quantity > 0));
        
        showMessage('⚠️ Using demo data. Connect to server for real-time inventory.', 'warning');
    }
}

// Populate medicine dropdown
function populateMedicineDropdown(medicines) {
    const medicineSelect = document.getElementById('medicineSelect');
    if (!medicineSelect) return;
    
    // Clear existing options
    medicineSelect.innerHTML = '';
    
    // Add default option
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
    
    // Add medicine options
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

// Get fallback medicines
function getFallbackMedicines() {
    return [
        { _id: '1', name: 'Paracetamol 500mg', company: 'Cipla Ltd', price: 5.50, quantity: 100, expiryDate: '2025-12-31' },
        { _id: '2', name: 'Cetirizine 10mg', company: 'Sun Pharma', price: 8.75, quantity: 50, expiryDate: '2024-11-30' },
        { _id: '3', name: 'Aspirin 75mg', company: 'Bayer', price: 12.99, quantity: 30, expiryDate: '2024-08-15' }
    ];
}

// Add medicine to bill
function addToBill() {
    try {
        const medicineSelect = document.getElementById('medicineSelect');
        const quantityInput = document.getElementById('quantity');
        
        if (!medicineSelect || !quantityInput) {
            showMessage('Form elements not found', 'error');
            return;
        }
        
        const medicineId = medicineSelect.value;
        let quantity = parseInt(quantityInput.value);
        
        // Validate
        if (!medicineId) {
            showMessage('❌ Please select a medicine', 'error');
            medicineSelect.focus();
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            showMessage('❌ Please enter a valid quantity', 'error');
            quantityInput.focus();
            quantityInput.select();
            return;
        }
        
        // Get selected medicine details
        const selectedOption = medicineSelect.options[medicineSelect.selectedIndex];
        const medicineName = selectedOption.dataset.name || selectedOption.textContent.split(' - ')[0];
        const price = parseFloat(selectedOption.dataset.price);
        const availableStock = parseInt(selectedOption.dataset.stock);
        
        // Check stock availability
        if (quantity > availableStock) {
            showMessage(`❌ Only ${availableStock} units available in stock`, 'error');
            quantityInput.value = availableStock;
            quantityInput.focus();
            quantityInput.select();
            return;
        }
        
        // Add to cart
        addToCart(medicineId, medicineName, price, quantity, availableStock);
        
        // Clear form
        medicineSelect.selectedIndex = 0;
        quantityInput.value = 1;
        medicineSelect.focus();
        
        // Show success message
        showMessage(`✅ Added ${quantity} × ${medicineName} to bill`, 'success');
        
    } catch (error) {
        console.error('Error adding to bill:', error);
        showMessage('❌ Error adding item to bill', 'error');
    }
}

// Add item to cart
function addToCart(medicineId, name, price, quantity, maxStock) {
    const existingItemIndex = cartItems.findIndex(item => item.id === medicineId);
    
    if (existingItemIndex !== -1) {
        const newQuantity = cartItems[existingItemIndex].quantity + quantity;
        if (newQuantity > maxStock) {
            showMessage(`❌ Cannot add more than ${maxStock} units`, 'error');
            return;
        }
        cartItems[existingItemIndex].quantity = newQuantity;
        cartItems[existingItemIndex].total = newQuantity * price;
    } else {
        cartItems.push({ id: medicineId, name: name, price: price, quantity: quantity, total: price * quantity, maxStock: maxStock });
    }
    
    updateBillTable();
    updateBillSummary();
    saveCartToLocalStorage();
}

// Update bill table
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
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>
                <div class="quantity-control">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}><i class="fas fa-minus"></i></button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.maxStock}" onchange="updateQuantity(${index}, this.value)" style="width: 60px; text-align: center;">
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
        cartItems[index].quantity = newQuantity;
        cartItems[index].total = newQuantity * item.price;
        updateBillTable();
        updateBillSummary();
        saveCartToLocalStorage();
    }
}

function removeFromCart(index) {
    if (confirm('Remove this item from bill?')) {
        cartItems.splice(index, 1);
        updateBillTable();
        updateBillSummary();
        saveCartToLocalStorage();
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
    const tax = subtotal * 0.05; // 5% tax
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
    if (cartItems.length === 0) { showMessage('Bill is already empty', 'info'); return; }
    if (confirm('Clear all items from bill? This action cannot be undone.')) {
        cartItems = [];
        updateBillTable();
        updateBillSummary();
        localStorage.removeItem('currentCart');
        showMessage('Bill cleared successfully', 'success');
    }
}

// ==========================================
// PROCESS BILL (Updated for MongoDB Cloud)
// ==========================================
async function processBill() {
    if (cartItems.length === 0) {
        showMessage('❌ No items in bill to process', 'error');
        return;
    }
    
    try {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
        
        const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
        const tax = subtotal * 0.05;
        const discount = parseFloat(document.getElementById('discountAmount')?.value || 0);
        const total = subtotal + tax - discount;
        
        const customerName = document.getElementById('customerName')?.value || 'Walk-in Customer';
        const customerPhone = document.getElementById('customerPhone')?.value || '';
        
        const billData = {
            customer: {
                name: customerName,
                phone: customerPhone
            },
            items: cartItems.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.total
            })),
            subtotal: subtotal,
            tax: tax,
            discount: discount,
            total: total,
            date: new Date().toISOString(),
            billNumber: 'BILL-' + Date.now()
        };
        
        // 1. Update medicine stock in backend
        try {
            await fetch(`${API_BASE_URL}/api/medicines/bill/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    items: cartItems.map(item => ({ id: item.id, quantity: item.quantity }))
                })
            });
        } catch (error) {
            console.warn('⚠️ Could not update backend stock:', error.message);
        }
        
        // 2. NAYA: Save Bill directly to MongoDB Cloud
        try {
            const saveResponse = await fetch(`${API_BASE_URL}/api/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData)
            });
            if(saveResponse.ok) {
                console.log('✅ Bill saved to cloud MongoDB successfully!');
            }
        } catch (err) {
            console.error('⚠️ Failed to save bill to cloud:', err);
        }
        
        // 3. Save locally as backup
        saveBillToHistory(billData);
        
        // Generate receipt
        generateReceipt(billData);
        
        // Clear cart
        cartItems = [];
        if (document.getElementById('discountAmount')) {
            document.getElementById('discountAmount').value = '0';
        }
        
        updateBillTable();
        updateBillSummary();
        localStorage.removeItem('currentCart');
        loadMedicinesForBilling();
        triggerDashboardUpdate();
        
        showMessage('✅ Bill processed successfully! Receipt generated.', 'success');
        
    } catch (error) {
        console.error('Error processing bill:', error);
        showMessage('❌ Error processing bill: ' + error.message, 'error');
    } finally {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fas fa-cash-register"></i> Process Bill';
        }
    }
}

// Save bill to history (Local backup)
function saveBillToHistory(billData) {
    try {
        let billHistory = JSON.parse(localStorage.getItem('billHistory') || '[]');
        billHistory.unshift(billData);
        if (billHistory.length > 50) billHistory = billHistory.slice(0, 50);
        localStorage.setItem('billHistory', JSON.stringify(billHistory));
    } catch (error) { console.error('Error saving bill to history:', error); }
}

function updateDashboardStats() {
    // Left empty here because dashboard.js handles fetching from cloud now
    localStorage.setItem('dashboardUpdated', Date.now().toString());
}

function triggerDashboardUpdate() {
    localStorage.setItem('billProcessed', Date.now().toString());
    localStorage.setItem('medicinesUpdated', Date.now().toString());
}

function saveCartToLocalStorage() {
    try { localStorage.setItem('currentCart', JSON.stringify(cartItems)); } catch (e) {}
}

function loadSavedCart() {
    try {
        const savedCart = localStorage.getItem('currentCart');
        if (savedCart) {
            cartItems = JSON.parse(savedCart);
            if (cartItems.length > 0) {
                updateBillTable();
                updateBillSummary();
                showMessage('Loaded saved cart from previous session', 'info');
            }
        }
    } catch (e) {}
}

function generateReceipt(billData) {
    const receiptContainer = document.createElement('div');
    receiptContainer.className = 'receipt-container';
    receiptContainer.style.cssText = `
        background: white; padding: 20px; border-radius: 10px; max-width: 600px;
        margin: 20px auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); font-family: 'Courier New', monospace;
    `;
    
    receiptContainer.innerHTML = `
        <div class="text-center mb-4">
            <h3>🏥 PharmaCare Pharmacy</h3>
            <p>123 Medical Street, City - 560001</p>
            <p>📞 +91 9876543210 | GSTIN: 29ABCDE1234F1Z5</p>
            <hr>
        </div>
        <div class="row mb-3">
            <div class="col-6">
                <p><strong>Bill No:</strong> ${billData.billNumber}</p>
                <p><strong>Date:</strong> ${new Date(billData.date).toLocaleString()}</p>
            </div>
            <div class="col-6 text-end">
                <p><strong>Cashier:</strong> Admin</p>
                <p><strong>Customer:</strong> ${billData.customer.name}</p>
                ${billData.customer.phone ? `<p><strong>Phone:</strong> ${billData.customer.phone}</p>` : ''}
            </div>
        </div>
        <table class="table table-sm mb-3">
            <thead>
                <tr><th>#</th><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Amount</th></tr>
            </thead>
            <tbody>
                ${billData.items.map((item, index) => `
                    <tr><td>${index + 1}</td><td>${item.name}</td><td class="text-center">${item.quantity}</td><td class="text-end">₹${item.price.toFixed(2)}</td><td class="text-end">₹${item.total.toFixed(2)}</td></tr>
                `).join('')}
            </tbody>
        </table>
        <div class="receipt-totals">
            <div class="d-flex justify-content-between"><span>Subtotal:</span><span>₹${billData.subtotal.toFixed(2)}</span></div>
            <div class="d-flex justify-content-between"><span>Tax (5%):</span><span>₹${billData.tax.toFixed(2)}</span></div>
            <div class="d-flex justify-content-between"><span>Discount:</span><span>-₹${billData.discount.toFixed(2)}</span></div>
            <hr>
            <div class="d-flex justify-content-between fw-bold fs-5"><span>Total Amount:</span><span>₹${billData.total.toFixed(2)}</span></div>
        </div>
        <hr class="my-4">
        <div class="text-center">
            <p class="mb-1"><strong>Thank you for your purchase!</strong></p>
            <p class="text-muted small">Goods sold are not returnable without original receipt</p>
        </div>
        <div class="text-center mt-4">
            <button onclick="printReceipt(this)" class="btn btn-primary me-2"><i class="fas fa-print"></i> Print</button>
            <button onclick="this.closest('.receipt-container').remove()" class="btn btn-secondary"><i class="fas fa-times"></i> Close</button>
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
        <style>body{font-family:Arial;margin:20px}@media print{.btn{display:none!important}}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{padding:8px;border:1px solid #ddd}.text-center{text-align:center}.text-end{text-align:right}</style>
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
    div.style.cssText = `position:fixed;top:20px;right:20px;z-index:10000;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s ease;`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle';
    div.innerHTML = `<div class="d-flex align-items-start"><i class="fas fa-${icon} mt-1 me-2"></i><div class="flex-grow-1">${message}</div><button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button></div>`;
    document.body.appendChild(div);
    setTimeout(() => { if (div.parentElement) div.remove(); }, 5000);
}

function addStyles() {
    if (document.querySelector('style[data-billing-css]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-billing-css', 'true');
    style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}.alert-toast{position:fixed!important;top:20px!important;right:20px!important;z-index:10000!important}.quantity-control{display:flex;align-items:center;gap:5px}.quantity-input{width:60px;text-align:center;padding:5px;border:1px solid #dee2e6;border-radius:4px}`;
    document.head.appendChild(style);
}
addStyles();

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.printReceipt = printReceipt;
window.addToBill = addToBill;
window.processBill = processBill;
window.clearBill = clearBill;