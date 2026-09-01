const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');

// ─── Helper: Generate temporary password ──────────────────
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// ─── Helper: Generate reset token ─────────────────────────
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ═══════════════════════════════════════════════════════════
// POST /api/auth/login
// Handles login for all roles, detects password-not-set
// ═══════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username.toLowerCase() }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Validate role if provided
    if (role && user.role !== role) {
      return res.status(403).json({ 
        error: `This account is not registered as ${role.toUpperCase()}. Please select the correct role.` 
      });
    }

    // Check if account is disabled
    if (user.accountStatus === 'disabled') {
      return res.status(403).json({ error: 'Your account has been disabled. Contact HR.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check if user must set a new password
    if (user.accountStatus === 'password-not-set' || user.mustChangePassword) {
      // Generate a short-lived token for password setup
      const setupToken = jwt.sign(
        { id: user._id.toString(), purpose: 'set-password' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.json({
        requirePasswordChange: true,
        setupToken,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role
        },
        message: 'You must set a new password before continuing.'
      });
    }

    // Normal login
    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId ? user.employeeId.toString() : null,
        accountStatus: user.accountStatus
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/signup
// Public HR registration
// ═══════════════════════════════════════════════════════════
exports.signup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'hr',
      accountStatus: 'active',
      mustChangePassword: false
    });

    // Auto-login after signup
    const token = jwt.sign(
      { id: newUser._id.toString(), role: newUser.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        accountStatus: newUser.accountStatus
      },
      message: 'HR account created successfully!'
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Server error during signup.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/register (protected — admin/HR only)
// Creates a user account linked to an employee
// Auto-generates temporary password
// ═══════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, employeeId } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    // Use provided password or auto-generate a temporary one
    const rawPassword = password || generateTempPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'employee',
      employeeId: employeeId || null,
      accountStatus: password ? 'active' : 'password-not-set',
      mustChangePassword: !password,
      tempPassword: password ? null : rawPassword  // Store readable temp password for HR to share
    });

    res.status(201).json({
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        employeeId: newUser.employeeId ? newUser.employeeId.toString() : null,
        accountStatus: newUser.accountStatus
      },
      tempPassword: password ? null : rawPassword,
      message: password
        ? 'User account created.'
        : `User account created with temporary password: ${rawPassword}`
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/set-password
// For employees setting their password for the first time
// Requires a setupToken from login response
// ═══════════════════════════════════════════════════════════
exports.setPassword = async (req, res) => {
  try {
    const { setupToken, newPassword, confirmPassword } = req.body;

    if (!setupToken || !newPassword) {
      return res.status(400).json({ error: 'Setup token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Verify the setup token
    let decoded;
    try {
      decoded = jwt.verify(setupToken, config.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired setup token. Please login again.' });
    }

    if (decoded.purpose !== 'set-password') {
      return res.status(401).json({ error: 'Invalid token type.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Update password and account status
    user.password = await bcrypt.hash(newPassword, 10);
    user.accountStatus = 'active';
    user.mustChangePassword = false;
    user.tempPassword = null;
    await user.save();

    // Issue a real auth token
    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId ? user.employeeId.toString() : null,
        accountStatus: 'active'
      },
      message: 'Password set successfully! You are now logged in.'
    });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Server error during password setup.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Generates a reset token (in real app, would send email)
// ═══════════════════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If that email is registered, a reset link has been generated.' });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    user.resetToken = await bcrypt.hash(resetToken, 10);
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // In a real app, you'd send an email with the reset link
    // For demo purposes, we return the token directly
    res.json({
      message: 'If that email is registered, a reset link has been generated.',
      // Demo only — in production, this would be sent via email
      resetToken: resetToken,
      resetUrl: `/reset-password?token=${resetToken}&email=${email}`
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// Resets password using token from forgot-password
// ═══════════════════════════════════════════════════════════
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user || !user.resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Verify the reset token
    const isValid = await bcrypt.compare(resetToken, user.resetToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.accountStatus = 'active';
    user.mustChangePassword = false;
    user.tempPassword = null;
    await user.save();

    res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════════
exports.getMe = (req, res) => {
  res.json({ user: req.user });
};
