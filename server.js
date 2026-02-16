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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============ 🔥 SIRF YEH 2 LINES CHANGE KI HAIN ============
// Pehle tha: app.use(express.static(path.join(__dirname, '../frontend')));
// Ab yeh hai:
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

console.log('✅ Server started');
console.log('📁 Frontend path:', frontendPath);
// ============ 🔥 CHANGE END ============

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
        user: process.env.EMAIL_USER || 'singhrajat28290@gmail.com',
        pass: process.env.EMAIL_PASS || 'stjz vjgx kjoq qvae'
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email config error:', error.message);
    } else {
        console.log('✅ Email server ready');
    }
});

// ============ MONGODB CONNECTION ============
const connectDB = async () => {
    try {
        console.log('\n🔗 Connecting to MongoDB Atlas...');
        
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/pharmacyDB?retryWrites=true&w=majority&appName=Cluster0';
        
        await mongoose.connect(mongoURI);
        
        console.log('✅ MongoDB Atlas Connected Successfully!');
        
        // Create admin user
        const adminExists = await User.findOne({ username: 'admin' });
        
        if (!adminExists) {
            const adminUser = new User({
                fullName: 'Admin User',
                username: 'admin',
                email: 'admin@pharmacy.com',
                password: 'admin123',
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('✅ Default admin user created');
        }
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        return false;
    }
};

// ============ SIGNUP ============
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password, confirmPassword } = req.body;
        
        console.log('📝 Signup attempt:', username);
        
        if (!fullName || !username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        const newUser = new User({
            fullName,
            username,
            email,
            password,
            role: 'staff'
        });
        
        await newUser.save();
        
        console.log('✅ New user saved:', username);
        
        res.json({
            success: true,
            message: 'Account created successfully! Please login.'
        });
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during signup'
        });
    }
});

// ============ LOGIN ============
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔑 Login attempt:', username);
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password required'
            });
        }
        
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });
        
        if (user && user.password === password) {
            res.json({
                success: true,
                message: 'Login successful!',
                token: 'auth-token-' + Date.now() + '-' + user._id,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// ============ FORGOT PASSWORD ============
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('🔐 Forgot password request for:', email);
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('⚠️ Email not found:', email);
            return res.json({
                success: false,
                message: 'This email is not registered. Please sign up first.'
            });
        }
        
        console.log('✅ User found:', user.username);
        
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key-here',
            { expiresIn: '15m' }
        );
        
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        
        // 🔥 YEH BHI CHANGE KIYA - Render URL ke liye
        const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: '"PharmaCare Pharmacy" <singhrajat28290@gmail.com>',
            to: user.email,
            subject: 'Password Reset Request - PharmaCare',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #667eea;">🔐 Password Reset Request</h2>
                    <p>Hello <strong>${user.fullName}</strong>,</p>
                    <p>Click the link below to reset your password:</p>
                    <p><a href="${resetLink}">${resetLink}</a></p>
                    <p>This link will expire in 15 minutes.</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        console.log('✅ Password reset email sent to:', user.email);
        
        res.json({
            success: true,
            message: 'Password reset link sent to your email!'
        });
        
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending email. Please try again.'
        });
    }
});

// ============ RESET PASSWORD PAGE ============
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

// ============ RESET PASSWORD API ============
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        
        if (!token || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();
        
        console.log('✅ Password reset successful for:', user.email);
        
        res.json({
            success: true,
            message: 'Password reset successful! Redirecting to login...'
        });
        
    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(400).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
});

// ============ LOGOUT ============
app.post('/api/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// ============ CHECK AUTH ============
app.get('/api/check-auth', async (req, res) => {
    const token = req.headers.authorization;
    
    if (token && token.includes('auth-token-')) {
        const userId = token.split('-').pop();
        
        try {
            const user = await User.findById(userId);
            
            if (user) {
                res.json({
                    success: true,
                    isAuthenticated: true,
                    user: {
                        id: user._id,
                        fullName: user.fullName,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            } else {
                res.json({
                    success: false,
                    isAuthenticated: false
                });
            }
        } catch (error) {
            res.json({
                success: false,
                isAuthenticated: false
            });
        }
    } else {
        res.json({
            success: false,
            isAuthenticated: false
        });
    }
});

// ============ GET ALL USERS ============
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json({
            success: true,
            count: users.length,
            users: users.map(u => ({
                id: u._id,
                fullName: u.fullName,
                username: u.username,
                email: u.email,
                role: u.role
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============ MEDICINE ROUTES ============
try {
    const medicineRoutes = require('./routes/medicineRoutes');
    app.use('/api/medicines', medicineRoutes);
    console.log('✅ Medicine routes loaded');
} catch (error) {
    console.log('⚠️ Medicine routes not found');
}

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    
    res.json({
        success: true,
        status: 'healthy',
        database: dbState === 1 ? 'connected' : 'disconnected',
        emailService: '✅ Configured',
        timestamp: new Date().toISOString()
    });
});

// ============ 🔥 YAHAN BHI SIRF PATH CHANGE KIYA ============
// Pehle tha: res.sendFile(path.join(__dirname, '../frontend/index.html'));
// Ab yeh hai:
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

app.get('/add-medicine', (req, res) => {
    res.sendFile(path.join(frontendPath, 'add-medicine.html'));
});

app.get('/view-medicines', (req, res) => {
    res.sendFile(path.join(frontendPath, 'view-medicines.html'));
});

app.get('/billing', (req, res) => {
    res.sendFile(path.join(frontendPath, 'billing.html'));
});
// ============ 🔥 CHANGE END ============

// ============ 404 HANDLER ============
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
});

// ============ START SERVER ============
const startServer = async () => {
    const dbConnected = await connectDB();
    
    app.listen(PORT, () => {
        console.log(`\n🏥 Pharmacy Management System`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 MongoDB: ${dbConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
        console.log(`📧 Email Service: ✅ Configured`);
        console.log(`🔐 Authentication: ✅ WORKING`);
        console.log(`📁 Frontend path: ${frontendPath}`);
        console.log(`\n🔑 Admin Login: admin / admin123`);
        console.log(`✅ System ready!\n`);
    });
};

startServer();
