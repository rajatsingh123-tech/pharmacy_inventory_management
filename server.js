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

// ============ 🔥 IMPORTANT - RENDER PATH FIX ============
// Render pe current directory resolve karo
const __dirname = path.resolve();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============ 🔥 STATIC FILES - RENDER KE LIYE FIXED PATH ============
// Render pe frontend folder root mein hona chahiye
app.use(express.static(path.join(__dirname, 'frontend')));

// Debugging - path check karo
console.log('📁 Current directory (__dirname):', __dirname);
console.log('📁 Frontend path:', path.join(__dirname, 'frontend'));

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
        console.log('❌ Email config error:', error);
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
        
        await createAdminUser();
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        return false;
    }
};

// Create default admin
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
        }
    } catch (error) {
        console.log('⚠️ Error creating admin:', error.message);
    }
}

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
        console.log('📧 Email registered:', email);
        
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
        
        const user = await User.findOne({ email: email });
        
        if (user) {
            console.log('✅ User found in database:', user.username);
            
            const resetToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET || 'your-secret-key-here',
                { expiresIn: '15m' }
            );
            
            user.resetToken = resetToken;
            user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();
            
            // ============ 🔥 RENDER URL FIX ============
            const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
            const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
            
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
                        <p>If the button doesn't work, copy this link:</p>
                        <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
                        <hr style="border: 1px solid #e0e0e0;">
                        <p style="color: #666; font-size: 12px; text-align: center;">PharmaCare Pharmacy Management System</p>
                    </div>
                `
            };
            
            await transporter.sendMail(mailOptions);
            
            console.log('✅ Password reset email sent to:', user.email);
            
            res.json({
                success: true,
                message: 'Password reset link sent to your email!'
            });
            
        } else {
            console.log('⚠️ Email not found in database:', email);
            res.json({
                success: true,
                message: 'If this email is registered, you will receive a reset link.'
            });
        }
        
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
    const { token } = req.query;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reset Password</title>
            <style>
                body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; }
                .container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
                h2 { color: #333; text-align: center; margin-bottom: 30px; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
                input { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
                input:focus { border-color: #667eea; outline: none; }
                button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
                button:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102,126,234,0.4); }
                .message { margin-top: 20px; padding: 12px; border-radius: 8px; display: none; }
                .message.success { background: #d4edda; color: #155724; display: block; }
                .message.error { background: #f8d7da; color: #721c24; display: block; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🔐 Reset Password</h2>
                <form id="resetForm">
                    <input type="hidden" id="token" value="${token}">
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="password" placeholder="Enter new password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="confirmPassword" placeholder="Confirm new password" required>
                    </div>
                    <button type="submit">Reset Password</button>
                </form>
                <div id="message" class="message"></div>
            </div>
            
            <script>
                document.getElementById('resetForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const password = document.getElementById('password').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;
                    const token = document.getElementById('token').value;
                    const messageDiv = document.getElementById('message');
                    
                    if (password !== confirmPassword) {
                        messageDiv.className = 'message error';
                        messageDiv.textContent = 'Passwords do not match';
                        return;
                    }
                    
                    if (password.length < 6) {
                        messageDiv.className = 'message error';
                        messageDiv.textContent = 'Password must be at least 6 characters';
                        return;
                    }
                    
                    try {
                        const response = await fetch('/api/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token, password, confirmPassword })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            messageDiv.className = 'message success';
                            messageDiv.textContent = '✅ ' + data.message;
                            
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 3000);
                        } else {
                            messageDiv.className = 'message error';
                            messageDiv.textContent = '❌ ' + data.message;
                        }
                        
                    } catch (error) {
                        messageDiv.className = 'message error';
                        messageDiv.textContent = '❌ Error resetting password';
                    }
                });
            </script>
        </body>
        </html>
    `);
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
    console.log('⚠️ Medicine routes not found - using default routes');
}

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    
    res.json({
        success: true,
        status: 'healthy',
        database: dbState === 1 ? 'connected' : 'disconnected',
        emailService: '✅ Configured',
        environment: process.env.NODE_ENV || 'development',
        renderUrl: process.env.RENDER_EXTERNAL_URL || 'local',
        timestamp: new Date().toISOString()
    });
});

// ============ 🔥 SERVE HTML PAGES - RENDER FIXED PATHS ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

app.get('/add-medicine', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'add-medicine.html'));
});

app.get('/view-medicines', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'view-medicines.html'));
});

app.get('/billing', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'billing.html'));
});

// ============ START SERVER ============
const startServer = async () => {
    const dbConnected = await connectDB();
    
    app.listen(PORT, () => {
        console.log(`\n🏥 Pharmacy Management System`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 MongoDB: ${dbConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
        console.log(`📧 Email Service: ✅ Configured`);
        console.log(`🔐 Authentication: ✅ DYNAMIC FORGOT PASSWORD`);
        console.log(`📁 Current directory: ${__dirname}`);
        console.log(`📁 Frontend path: ${path.join(__dirname, 'frontend')}`);
        console.log(`🌍 Render URL: ${process.env.RENDER_EXTERNAL_URL || 'local'}`);
        
        // Check if frontend files exist
        const fs = require('fs');
        const frontendPath = path.join(__dirname, 'frontend');
        if (fs.existsSync(frontendPath)) {
            console.log(`✅ Frontend folder found at: ${frontendPath}`);
            try {
                const files = fs.readdirSync(frontendPath);
                console.log(`📄 Frontend files: ${files.join(', ')}`);
            } catch (e) {
                console.log(`⚠️ Cannot read frontend files:`, e.message);
            }
        } else {
            console.log(`❌ Frontend folder NOT found at: ${frontendPath}`);
            console.log(`📁 Please check your project structure on Render`);
        }
        
        console.log(`\n📡 Available Endpoints:`);
        console.log(`   🔐 POST   /api/signup - Signup`);
        console.log(`   🔐 POST   /api/login - Login`);
        console.log(`   🔐 POST   /api/forgot-password - Forgot Password`);
        console.log(`   🔐 GET    /reset-password - Reset Password Page`);
        console.log(`   🔐 POST   /api/reset-password - Reset Password API`);
        console.log(`   🔐 POST   /api/logout - Logout`);
        console.log(`   🔐 GET    /api/check-auth - Check Auth`);
        console.log(`   📊 GET    /api/health - Health Check`);
        console.log(`   📊 GET    /api/users - All Users`);
        console.log(`\n🔑 Admin Login: admin / admin123`);
        console.log(`✅ System ready!\n`);
    });
};

startServer();
