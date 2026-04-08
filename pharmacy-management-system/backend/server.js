const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============ 1. GLOBAL CORS FIX ============
// Isse Vercel aur Local dono se request allow hogi
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============ 2. MONGODB CONNECTION ============
const mongoURI = 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/pharmacyDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas Connected!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============ 3. USER SCHEMA & MODEL ============
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'staff' }
});
const User = mongoose.model('User', userSchema);

// ============ 4. AUTH ROUTES ============

// Health Check (Very Important for Render)
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Signup API
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

        const newUser = new User({ fullName, username, email, password });
        await newUser.save();
        res.json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        
        if (user && user.password === password) {
            res.json({
                success: true,
                message: 'Login successful!',
                token: 'auth-token-' + user._id,
                user: { id: user._id, fullName: user.fullName, username: user.username, role: user.role }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// ============ 5. MEDICINE ROUTES ============
// Make sure you have medicineRoutes.js in your routes folder
try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
} catch (error) {
    console.log('⚠️ Medicine routes file not found, creating dummy route');
    app.get('/api/medicines', (req, res) => res.json([]));
}

// ============ 6. SERVE FRONTEND (Optional) ============
app.get('/', (req, res) => {
    res.send('Pharmacy Backend API is Running...');
});

// ============ 7. START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});