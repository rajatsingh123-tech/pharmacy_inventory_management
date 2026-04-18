const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============ 1. MIDDLEWARE ============
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

// ============ 2. MONGODB CONNECTION ============
const mongoURI = 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/pharmacyDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully!'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); 
    });

// ============ 3. SCHEMAS (Database Structure) ============

// User Schema (Purana)
const userSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'staff' }
});
const User = mongoose.model('User', userSchema);

// NAYA: Bill Schema (Cloud mein bills save karne ke liye)
const billSchema = new mongoose.Schema({
    customer: {
        name: { type: String, default: 'Walk-in Customer' },
        phone: { type: String, default: '' }
    },
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        total: Number
    }],
    subtotal: Number,
    tax: Number,
    discount: Number,
    total: Number,
    date: { type: Date, default: Date.now },
    billNumber: String
});
const Bill = mongoose.model('Bill', billSchema);


// ============ 4. API ROUTES ============

app.get('/', (req, res) => {
    res.status(200).send('<h1>Pharmacy API Live 🚀</h1><p>Health check at: /api/health</p>');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        time: new Date().toISOString()
    });
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        
        if (user && user.password === password) {
            res.json({
                success: true, message: 'Login successful!', token: 'auth-token-' + user._id,
                user: { id: user._id, username: user.username, fullName: user.fullName }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;
        const newUser = new User({ fullName, username, email, password });
        await newUser.save();
        res.json({ success: true, message: 'User created successfully!' });
    } catch (error) { res.status(400).json({ success: false, message: 'User already exists or data invalid' }); }
});

// --- NAYE BILLING ROUTES START ---

// Get all bills (Dashboard ke liye)
app.get('/api/bills', async (req, res) => {
    try {
        const bills = await Bill.find().sort({ date: -1 }); // Latest bill sabse upar aayega
        res.json(bills);
    } catch (error) {
        console.error('Fetch bills error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bills from cloud' });
    }
});

// Save a new bill (Billing page ke liye)
app.post('/api/bills', async (req, res) => {
    try {
        const newBill = new Bill(req.body);
        await newBill.save();
        res.status(201).json({ success: true, message: 'Bill saved to MongoDB successfully!', bill: newBill });
    } catch (error) {
        console.error('Save bill error:', error);
        res.status(500).json({ success: false, message: 'Failed to save bill to cloud' });
    }
});
// --- NAYE BILLING ROUTES END ---

// Medicine Routes
try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
    console.log('💊 Medicine routes integrated');
} catch (e) {
    console.log('⚠️ Medicine routes folder/file missing, using manual fallback');
    app.get('/api/medicines', (req, res) => {
        res.json({ success: true, medicines: [], message: 'Backend working, but routes file not found' });
    });
}

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ============ 5. START SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server is blasting off on port ${PORT}`);
});