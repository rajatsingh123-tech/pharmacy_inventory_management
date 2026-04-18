const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer'); // NAYA: Email bhejne ke liye
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
    role: { type: String, default: 'staff' }
});
const User = mongoose.model('User', userSchema);

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

// ==========================================
// 🚀 NAYA: FORGOT PASSWORD ROUTE
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        // 1. Check if user exists
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        // 2. Generate new random password
        const tempPassword = Math.random().toString(36).slice(-8); // 8 character ka password

        // 3. Save new password to database
        user.password = tempPassword;
        await user.save();

        // 4. Setup Email config
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Render se aayega
                pass: process.env.EMAIL_PASS  // Render se aayega
            }
        });

        // 5. Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'PharmaCare - Your Password Has Been Reset',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #4864e4;">PharmaCare Security</h2>
                    <p>Hello <strong>${user.fullName}</strong>,</p>
                    <p>Your password has been successfully reset. Here is your new temporary login password:</p>
                    <div style="background: #f4f4f4; padding: 10px; font-size: 24px; text-align: center; letter-spacing: 2px; font-weight: bold; color: #d9534f; border-radius: 5px;">
                        ${tempPassword}
                    </div>
                    <p style="margin-top: 20px;">Please login using this password. Make sure to keep it secure.</p>
                    <p>Thank you,<br>PharmaCare Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Temporary password sent to your email successfully!' });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email. Check server configuration.' });
    }
});
// ==========================================

app.get('/api/bills', async (req, res) => {
    try {
        const bills = await Bill.find().sort({ date: -1 }); 
        res.json(bills);
    } catch (error) {
        console.error('Fetch bills error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bills from cloud' });
    }
});

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

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server is blasting off on port ${PORT}`);
});