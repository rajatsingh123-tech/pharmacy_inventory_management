const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============ 1. MIDDLEWARE (Improved for Vercel/Render) ============
app.use(cors({
    origin: '*', // Isse frontend block nahi hoga
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Static files support (Frontend assets ke liye agar backend se serve ho rahe hon)
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ 2. MONGODB CONNECTION ============
const mongoURI = 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/pharmacyDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully!'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // Agar DB connect na ho toh server band ho jaye taaki error dikhe
    });

// ============ 3. USER SCHEMA ============
const userSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'staff' }
});
const User = mongoose.model('User', userSchema);

// ============ 4. API ROUTES ============

// Home Route
app.get('/', (req, res) => {
    res.status(200).send('<h1>Pharmacy API Live 🚀</h1><p>Health check at: /api/health</p>');
});

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        time: new Date().toISOString()
    });
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
                user: { id: user._id, username: user.username, fullName: user.fullName }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Signup API
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;
        const newUser = new User({ fullName, username, email, password });
        await newUser.save();
        res.json({ success: true, message: 'User created successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'User already exists or data invalid' });
    }
});

// Medicine Routes (Yahan error handling aur pakki kar di hai)
try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
    console.log('💊 Medicine routes integrated');
} catch (e) {
    console.log('⚠️ Medicine routes folder/file missing, using manual fallback');
    // Agar routes file nahi milti toh API crash nahi hogi
    app.get('/api/medicines', (req, res) => {
        res.json({ success: true, medicines: [], message: 'Backend working, but routes file not found' });
    });
}

// 404 Handler - Agar koi route galat type kare
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ============ 5. START SERVER ============
const PORT = process.env.PORT || 5000; // Render aksar 5000 prefer karta hai
app.listen(PORT, () => {
    console.log(`\n🚀 Server is blasting off on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});