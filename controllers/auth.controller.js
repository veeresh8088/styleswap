const crypto = require('crypto');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

// Helper to set JWT cookie
const setAuthCookie = (res, token) => {
  const days = parseInt(process.env.COOKIE_EXPIRES_IN, 10) || 7;
  const cookieOptions = {
    expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  };
  res.cookie('token', token, cookieOptions);
};

// @desc Render Login Page
exports.renderLogin = (req, res) => {
  if (req.user) {
    if (req.user.role === ROLES.ADMIN) {
      return res.redirect('/admin');
    }
    return res.redirect('/user/dashboard');
  }
  res.render('pages/auth/login', {
    title: 'Login - Styleswap',
    redirect: req.query.redirect || ''
  });
};

// @desc Render Register Page
exports.renderRegister = (req, res) => {
  if (req.user) {
    if (req.user.role === ROLES.ADMIN) {
      return res.redirect('/admin');
    }
    return res.redirect('/user/dashboard');
  }
  res.render('pages/auth/register', {
    title: 'Register - Styleswap'
  });
};

// @desc Render Forgot Password Page
exports.renderForgotPassword = (req, res) => {
  res.render('pages/auth/forgot-password', {
    title: 'Forgot Password - Styleswap'
  });
};

// @desc Render Reset Password Page
exports.renderResetPassword = async (req, res) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now()}
  });

  if (!user) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/auth/forgot-password');
  }

  res.render('pages/auth/reset-password', {
    title: 'Reset Password - Styleswap',
    token
  });
};

// @desc Register User
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Email address is already registered' });
      }
      req.flash('error', 'An account with this email address already exists.');
      return res.redirect('/auth/register');
    }

    let profileImage = '/images/default-avatar.png';
    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    const user = await User.create({
      name,
      email,
      phone: phone || '',
      password,
      profileImage,
      role: ROLES.USER
    });

    const token = user.generateAuthToken();
    setAuthCookie(res, token);

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    req.flash('success', `Welcome to Styleswap, ${user.name}! Your account is ready.`);
    res.redirect('/user/dashboard');
  } catch (error) {
    next(error);
  }
};

// @desc Login User
exports.login = async (req, res, next) => {
  try {
    const { email, password, redirect } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      req.flash('error', 'Invalid email or password.');
      return res.redirect(`/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`);
    }

    if (user.isBanned) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }
      req.flash('error', 'Your account has been suspended by administration.');
      return res.redirect('/auth/login');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      req.flash('error', 'Invalid email or password.');
      return res.redirect(`/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`);
    }

    const token = user.generateAuthToken();
    setAuthCookie(res, token);

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    req.flash('success', `Welcome back, ${user.name}!`);

    // If user is Admin, ALWAYS redirect directly to Admin Control Panel
    if (user.role === ROLES.ADMIN) {
      return res.redirect('/admin');
    }

    // Redirect to requested URL or dashboard for regular users
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return res.redirect(redirect);
    }

    res.redirect('/user/dashboard');
  } catch (error) {
    next(error);
  }
};

// @desc Logout User
exports.logout = (req, res) => {
  res.clearCookie('token');
  if (req.session) {
    req.session.destroy();
  }

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  res.redirect('/auth/login');
};

// @desc Forgot Password Request
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      req.flash('info', 'If an account exists with that email, a password reset link has been generated.');
      return res.redirect('/auth/forgot-password');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 mins
    await user.save({ validateBeforeSave: false });

    // In demo environment, display reset link in flash message for convenience
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
    req.flash('success', `Password reset initiated. Reset link: ${resetUrl}`);
    res.redirect('/auth/forgot-password');
  } catch (error) {
    next(error);
  }
};

// @desc Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmNewPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      req.flash('error', 'New password must be at least 6 characters.');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    if (newPassword !== confirmNewPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/auth/forgot-password');
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const authToken = user.generateAuthToken();
    setAuthCookie(res, authToken);

    req.flash('success', 'Your password has been successfully reset.');
    res.redirect('/user/dashboard');
  } catch (error) {
    next(error);
  }
};

// @desc API Get Current User
exports.apiMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};
