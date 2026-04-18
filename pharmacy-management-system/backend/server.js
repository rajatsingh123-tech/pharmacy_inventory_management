const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
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

const userSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'staff' },
    // NAYA: OTP save karne ke liye
    resetOtp: { type: String },
    otpExpiry: { type: Date }
});
const User = mongoose.model('User', userSchema);

const billSchema = new mongoose.Schema({
    customer: { name: { type: String, default: 'Walk-in Customer' }, phone: { type: String, default: '' } },
    items: [{ name: String, price: Number, quantity: Number, total: Number }],
    subtotal: Number, tax: Number, discount: Number, total: Number,
    date: { type: Date, default: Date.now }, billNumber: String
});
const Bill = mongoose.model('Bill', billSchema);

// ============ 4. API ROUTES ============

app.get('/', (req, res) => {
    res.status(200).send('<h1>Pharmacy API Live 🚀</h1><p>Health check at: /api/health</p>');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        
        if (user && user.password === password) {
            res.json({ success: true, message: 'Login successful!', token: 'auth-token-' + user._id, user: { id: user._id, username: user.username, fullName: user.fullName } });
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

// ==========================================
// 🔥 NAYA: OTP SEND ROUTE 🔥
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Is email se koi account nahi mila.' });
        }

        // 6-digit OTP generate karo
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // OTP aur Expiry (15 mins) database me save karo
        user.resetOtp = otp;
        user.otpExpiry = Date.now() + 15 * 60 * 1000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'PharmaCare - Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #4864e4;">PharmaCare Security</h2>
                    <p>Hello <strong>${user.fullName}</strong>,</p>
                    <p>Aapne password reset karne ki request ki hai. Ye raha aapka 6-digit OTP (Ye 15 minute ke liye valid hai):</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 28px; text-align: center; letter-spacing: 5px; font-weight: bold; color: #4864e4; border-radius: 5px;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px;">Agar ye request aapne nahi ki thi, toh is email ko ignore karein.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP aapke email par bhej diya gaya hai!' });

    } catch (error) {
        console.error('OTP sending error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
});

// ==========================================
// 🔥 NAYA: VERIFY OTP & RESET PASSWORD ROUTE 🔥
// ==========================================
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // User dhoondo jiska email aur OTP match kare, aur OTP expire na hua ho
        const user = await User.findOne({ 
            email: email, 
            resetOtp: otp, 
            otpExpiry: { $gt: Date.now() } // OTP expiry aage ki honi chahiye
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid ya Expired OTP!' });
        }

        // Naya password save karo aur OTP delete kar do
        user.password = newPassword;
        user.resetOtp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ success: true, message: 'Aapka password successfully badal diya gaya hai! Ab login karein.' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Server error while resetting password.' });
    }
});
// ==========================================

app.get('/api/bills', async (req, res) => {
    try { const bills = await Bill.find().sort({ date: -1 }); res.json(bills); } 
    catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch bills' }); }
});

app.post('/api/bills', async (req, res) => {
    try { const newBill = new Bill(req.body); await newBill.save(); res.status(201).json({ success: true, bill: newBill }); } 
    catch (error) { res.status(500).json({ success: false, message: 'Failed to save bill' }); }
});

try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
} catch (e) {
    app.get('/api/medicines', (req, res) => { res.json({ success: true, medicines: [] }); });
}

app.use((req, res) => { res.status(404).json({ success: false, message: 'Route not found' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`\n🚀 Server is blasting off on port ${PORT}`); });