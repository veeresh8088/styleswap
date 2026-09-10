const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to optionally populate user if JWT token exists (for all public pages)
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      res.locals.currentUser = null;
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_for_smart_wear_exchange'
    );

    const user = await User.findById(decoded.id).select('-password');

    if (!user || user.isBanned) {
      // Clear invalid cookie
      res.clearCookie('token');
      req.user = null;
      res.locals.currentUser = null;
      return next();
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    req.user = null;
    res.locals.currentUser = null;
    next();
  }
};

// Middleware to strictly protect routes (requires logged in user)
const protect = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in to proceed.'
      });
    }
    if (req.originalUrl.startsWith('/admin')) {
      req.flash('error', 'Please log in to access the administrator portal.');
      return res.redirect('/admin/login');
    }
    req.flash('error', 'Please log in to access this page.');
    return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_for_smart_wear_exchange'
    );

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.clearCookie('token');
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'User account not found' });
      }
      req.flash('error', 'Session expired. Please log in again.');
      return res.redirect('/auth/login');
    }

    if (user.isBanned) {
      res.clearCookie('token');
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact support.'
        });
      }
      req.flash('error', 'Your account has been suspended. Please contact support.');
      return res.redirect('/auth/login');
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/auth/login');
  }
};

// Middleware to prevent Admin from accessing regular user & marketplace routes
const forbidAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    // Whitelist admin routes and auth logout
    if (
      req.originalUrl.startsWith('/admin') ||
      req.originalUrl.startsWith('/auth/logout') ||
      req.originalUrl.startsWith('/api/admin')
    ) {
      return next();
    }
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot access user marketplace features.'
      });
    }
    req.flash('info', 'Admin accounts cannot access marketplace features. Redirected to Admin Control Panel.');
    return res.redirect('/admin');
  }
  next();
};

module.exports = {
  optionalAuth,
  protect,
  forbidAdmin
};
