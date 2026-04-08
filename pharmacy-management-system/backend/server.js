const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============
// Isse Vercel frontend backend se baat kar payega
app.use(cors({
    origin: '*', // Production mein yahan apna Vercel link daal sakte ho
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files ke liye path theek kiya
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ MONGODB CONNECTION ============
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/pharmacyDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============ USER SCHEMA ============
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    role: { type: String, default: 'staff' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ============ NODEMAILER CONFIG ============
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'singhrajat28290@gmail.com',
        pass: 'stjz vjgx kjoq qvae'
    }
});

// ============ ROUTES ============

// 1. Health Check (Test karne ke liye)
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// 2. Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
        
        const newUser = new User({ fullName, username, email, password });
        await newUser.save();
        res.json({ success: true, message: 'Account created!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        if (user && user.password === password) {
            res.json({
                success: true,
                token: 'auth-token-' + user._id,
                user: { id: user._id, username: user.username, email: user.email }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login error' });
    }
});

// ============ MEDICINE ROUTES ============
// Iska dhyaan rakhna ki medicineRoutes.js file sahi folder mein ho
try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
} catch (e) {
    console.log('⚠️ Medicine routes loading error');
}

// 4. Sabse important: Kisi bhi route par index.html serve karna (SPA handling)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'), (err) => {
        if (err) {
            // Agar file nahi milti toh default error handle karo
            res.status(200).send("Pharmacy API is running...");
        }
    });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});