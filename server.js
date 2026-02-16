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

// ============ 🔥 PATH FIX - TUMHARE STRUCTURE KE HISAB SE ============
// Tumhara structure: backend/ (andar server.js) aur frontend/ (bahar)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

console.log('✅ Server.js loaded successfully');
console.log('📁 Backend path:', __dirname);
console.log('📁 Frontend path:', frontendPath);

// ============ USER SCHEMA - MONGODB MODEL ============
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
        
        // Create admin user if not exists
        await createAdminUser();
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('1. MongoDB Atlas me IP whitelist karo (0.0.0.0/0)');
        console.log('2. Check karo username/password sahi hai');
        return false;
    }
};

// Create admin user if not exists
async function createAdminUser() {
    try {
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
            console.log('   → Username: admin');
            console.log('   → Password: admin123');
            console.log('   → Email: admin@pharmacy.com');
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.log('⚠️ Error creating admin:', error.message);
    }
}

// ============ SIGNUP - Koi bhi user register kar sakta hai ============
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password, confirmPassword } = req.body;
        
        console.log('📝 Signup attempt:', username);
        
        // Validation
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
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        // Create new user in MongoDB
        const newUser = new User({
            fullName,
            username,
            email,
            password,
            role: 'staff'
        });
        
        await newUser.save();
        
        console.log('✅ New user saved to MongoDB:', username);
        console.log('📧 Email registered:', email);
        
        res.json({
            success: true,
            message: 'Account created successfully! Please login.'
        });
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        
        // Check for duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
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
        
        // Find user in MongoDB
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

// ============ FORGOT PASSWORD - DYNAMIC for ANY user ============
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
        
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('⚠️ Email not found:', email);
            return res.json({
                success: false,
                message: 'This email is not registered. Please sign up first.'
            });
        }
        
        console.log('✅ User found:', user.username);
        
        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key-here',
            { expiresIn: '15m' }
        );
        
        // Save token to user
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        
        // Create reset link with dynamic URL
        const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
        
        // Email content
        const mailOptions = {
            from: '"PharmaCare Pharmacy" <singhrajat28290@gmail.com>',
            to: user.email,
            subject: 'Password Reset Request - PharmaCare',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #667eea; text-align: center;">🔐 Password Reset Request</h2>
                    <p>Hello <strong>${user.fullName}</strong>,</p>
                    <p>We received a request to reset your password for your PharmaCare account.</p>
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p>Click the button below to reset your password. This link will expire in <strong>15 minutes</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        };
        
        // Send email
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
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        
        // Find user
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        // Update password
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

// ============ GET ALL USERS (for testing) ============
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
    const dbStatus = dbState === 1 ? 'connected' : 
                     dbState === 0 ? 'disconnected' : 
                     dbState === 2 ? 'connecting' : 'error';
    
    res.json({
        success: true,
        status: 'healthy',
        database: dbStatus,
        emailService: '✅ Configured',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// ============ SERVE HTML PAGES ============
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
        
        if (dbConnected) {
            console.log(`\n📊 Users are saved in MongoDB`);
            console.log(`   - ANY user can reset password`);
            console.log(`   - Check users: http://localhost:${PORT}/api/users\n`);
        }
        
        console.log('📡 Available Endpoints:');
        console.log(`   🔐 POST   /api/signup - Signup`);
        console.log(`   🔐 POST   /api/login - Login`);
        console.log(`   🔐 POST   /api/forgot-password - Forgot Password`);
        console.log(`   🔐 GET    /reset-password - Reset Password Page`);
        console.log(`   🔐 POST   /api/reset-password - Reset Password API`);
        console.log(`   🔐 POST   /api/logout - Logout`);
        console.log(`   🔐 GET    /api/check-auth - Check Auth`);
        console.log(`   📊 GET    /api/health - Health Check`);
        console.log(`   📊 GET    /api/users - All Users`);
        console.log(`   💊 GET    /api/medicines - Get Medicines`);
        console.log(`\n🔑 Admin Login: admin / admin123`);
        console.log(`✅ System ready!\n`);
    });
};

startServer();
