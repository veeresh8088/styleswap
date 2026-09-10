const { ROLES } = require('../config/constants');

const isAdmin = (req, res, next) => {
  if (!req.user) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    req.flash('error', 'Please log in to access the administrator portal.');
    return res.redirect('/admin/login');
  }

  if (req.user.role !== ROLES.ADMIN) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Administrator privileges required.'
      });
    }
    return res.status(403).render('error', {
      title: '403 - Forbidden',
      statusCode: 403,
      message: 'Access Denied: You do not have permission to access the Administrator Portal.',
      currentUser: req.user
    });
  }

  next();
};

module.exports = isAdmin;
