require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const helmet = require('helmet');
const cors = require('cors');

const connectDB = require('./config/db');
const { optionalAuth } = require('./middleware/auth.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security Headers (Helmet with permissive CSP for CDNs & images)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.tailwindcss.com',
          'https://unpkg.com',
          'https://cdn.jsdelivr.net'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.tailwindcss.com',
          'https://unpkg.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session Configuration (for flash messages & notifications)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret_smart_wear_exchange_session_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

// Flash Messages
app.use(flash());

// View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files & Uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Global Template Variables & JWT Cookie Authentication Extraction
app.use(optionalAuth);

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.currentPath = req.path;
  next();
});

// --- Routes Mounting ---
app.use('/', require('./routes/index.routes'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/listings', require('./routes/listing.routes'));
app.use('/transactions', require('./routes/transaction.routes'));
app.use('/checkout', require('./routes/checkout.routes'));
app.use('/user', require('./routes/user.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/api', require('./routes/api.routes'));

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server only if run directly or not on Vercel
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`✨ Styleswap Server Running`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`👑 Admin Portal: http://localhost:${PORT}/admin`);
    console.log(`🔌 REST API Base: http://localhost:${PORT}/api`);
    console.log(`📦 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
  });
}

module.exports = app;

