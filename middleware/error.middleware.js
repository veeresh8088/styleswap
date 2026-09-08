// 404 Handler
const notFoundHandler = (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Resource not found at ${req.originalUrl}`
    });
  }

  res.status(404).render('error', {
    title: '404 - Page Not Found',
    statusCode: 404,
    message: 'The Thai ware or page you are looking for does not exist or has been moved.',
    currentUser: req.user || null
  });
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Handle Multer upload errors
  let message = err.message || 'An unexpected error occurred';
  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'Uploaded file is too large (max 5MB allowed)';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Too many files uploaded (max 5 files allowed)';
  }

  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      message: message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  res.status(statusCode).render('error', {
    title: `${statusCode} - Error`,
    statusCode: statusCode,
    message: message,
    currentUser: req.user || null
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
