const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ============ 1. MIDDLEWARE (Theek kiya gaya) ============
app.use(cors()); // Sabse simple version, Render/Vercel ke liye best hai
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ============ 2. MONGODB CONNECTION ============
const mongoURI = 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/pharmacyDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas Connected!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

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

// Health Check - Isse Render ko pata chalta hai server ON hai
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', database: mongoose.connection.readyState === 1 });
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        
        if (user && user.password === password) {
            res.json({
                success: true,
                token: 'auth-token-' + user._id,
                user: { username: user.username, fullName: user.fullName }
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
        res.json({ success: true, message: 'User created!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'User already exists or data invalid' });
    }
});

// Medicine Routes
try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
} catch (e) {
    app.get('/api/medicines', (req, res) => res.json([]));
}

// Home Route
app.get('/', (req, res) => res.send('Pharmacy API Live 🚀'));

// ============ 5. START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
});