const User = require('../models/User');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { ROLES, LISTING_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

// @desc Admin Dashboard Overview & Analytics
exports.getDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const approvedListings = await Listing.countDocuments({ status: LISTING_STATUS.APPROVED });
    const pendingListings = await Listing.countDocuments({ status: LISTING_STATUS.PENDING });
    const soldListings = await Listing.countDocuments({ status: LISTING_STATUS.SOLD });
    const exchangedListings = await Listing.countDocuments({ status: LISTING_STATUS.EXCHANGED });

    const totalTransactions = await Transaction.countDocuments();
    const purchaseTransactions = await Transaction.countDocuments({ type: TRANSACTION_TYPES.PURCHASE });
    const exchangeTransactions = await Transaction.countDocuments({ type: TRANSACTION_TYPES.EXCHANGE });

    // Calculate total transaction volume (GMV)
    const gmvAggregate = await Transaction.aggregate([
      { $match: { type: TRANSACTION_TYPES.PURCHASE, status: TRANSACTION_STATUS.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalGMV = gmvAggregate.length > 0 ? gmvAggregate[0].total : 0;

    // Category distribution
    const categories = await Category.find();
    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const count = await Listing.countDocuments({ category: cat._id });
        return { name: cat.name, count };
      })
    );

    // Recent items needing approval or recent activity
    const recentPendingListings = await Listing.find({ status: LISTING_STATUS.PENDING })
      .populate('sellerId', 'name email')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTransactions = await Transaction.find()
      .populate('listingId', 'title price')
      .populate('buyerId', 'name')
      .populate('sellerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const stats = {
      totalUsers,
      totalListings,
      approvedListings,
      pendingListings,
      soldListings,
      exchangedListings,
      totalTransactions,
      purchaseTransactions,
      exchangeTransactions,
      totalGMV
    };

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        stats,
        categoryStats,
        recentPendingListings,
        recentUsers,
        recentTransactions
      });
    }

    res.render('pages/admin/dashboard', {
      title: 'Admin Control Center - Styleswap',
      stats,
      categoryStats,
      recentPendingListings,
      recentUsers,
      recentTransactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Users List
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    if (role && role !== 'all') query.role = role;
    if (status === 'banned') query.isBanned = true;
    if (status === 'active') query.isBanned = false;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, count: users.length, total, data: users });
    }

    res.render('pages/admin/users', {
      title: 'User Management - Admin Portal',
      users,
      total,
      query: req.query,
      pagination: { page: pageNum, totalPages, total, limit: limitNum }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle User Ban Status
exports.toggleUserBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    if (user.role === ROLES.ADMIN && user._id.toString() === req.user._id.toString()) {
      req.flash('error', 'You cannot ban your own administrator account.');
      return res.redirect('/admin/users');
    }

    user.isBanned = !user.isBanned;
    await user.save();

    const action = user.isBanned ? 'banned' : 'unbanned';

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: `User successfully ${action}`,
        isBanned: user.isBanned
      });
    }

    req.flash('success', `User ${user.name} has been ${action}.`);
    res.redirect('/admin/users');
  } catch (error) {
    next(error);
  }
};

// @desc Get All Listings for Admin Moderation
exports.getListings = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Listing.countDocuments(query);
    const listings = await Listing.find(query)
      .populate('sellerId', 'name email')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const categories = await Category.find().sort({ name: 1 });
    const totalPages = Math.ceil(total / limitNum) || 1;

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, total, data: listings });
    }

    res.render('pages/admin/listings', {
      title: 'Listing Moderation - Admin Portal',
      listings,
      categories,
      total,
      query: req.query,
      statuses: LISTING_STATUS,
      pagination: { page: pageNum, totalPages, total, limit: limitNum }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Approve Listing
exports.approveListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found.');
      return res.redirect('/admin/listings');
    }

    listing.status = LISTING_STATUS.APPROVED;
    await listing.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Listing approved', data: listing });
    }

    req.flash('success', `Listing "${listing.title}" has been approved.`);
    res.redirect('/admin/listings');
  } catch (error) {
    next(error);
  }
};

// @desc Reject Listing
exports.rejectListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/admin/listings');
    }

    listing.status = LISTING_STATUS.REJECTED;
    await listing.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Listing rejected', data: listing });
    }

    req.flash('info', `Listing "${listing.title}" has been rejected.`);
    res.redirect('/admin/listings');
  } catch (error) {
    next(error);
  }
};

// @desc Delete Listing (Admin)
exports.deleteListingAdmin = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndDelete(req.params.id);
    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/admin/listings');
    }

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Listing deleted' });
    }

    req.flash('success', 'Listing has been permanently removed.');
    res.redirect('/admin/listings');
  } catch (error) {
    next(error);
  }
};

// @desc Get Categories List
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Listing.countDocuments({ category: cat._id });
        return {
          ...cat.toObject(),
          itemCount: count
        };
      })
    );

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, data: categoriesWithCount });
    }

    res.render('pages/admin/categories', {
      title: 'Category Management - Admin Portal',
      categories: categoriesWithCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create Category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      req.flash('error', 'A category with this name already exists.');
      return res.redirect('/admin/categories');
    }

    let image = '';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const category = await Category.create({
      name,
      description: description || '',
      icon: icon || 'tag',
      image
    });

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({ success: true, data: category });
    }

    req.flash('success', `Category "${category.name}" created successfully.`);
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
};

// @desc Update Category
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      req.flash('error', 'Category not found.');
      return res.redirect('/admin/categories');
    }

    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.icon = icon || category.icon;

    if (req.file) {
      category.image = `/uploads/${req.file.filename}`;
    }

    await category.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, data: category });
    }

    req.flash('success', `Category "${category.name}" updated successfully.`);
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
};

// @desc Delete Category
exports.deleteCategory = async (req, res, next) => {
  try {
    const listingCount = await Listing.countDocuments({ category: req.params.id });
    if (listingCount > 0) {
      req.flash('error', `Cannot delete category: ${listingCount} listings are currently assigned to it.`);
      return res.redirect('/admin/categories');
    }

    await Category.findByIdAndDelete(req.params.id);

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Category deleted' });
    }

    req.flash('success', 'Category deleted successfully.');
    res.redirect('/admin/categories');
  } catch (error) {
    next(error);
  }
};

// @desc Get All Transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('listingId')
      .populate('exchangeItemId')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, total, data: transactions });
    }

    res.render('pages/admin/transactions', {
      title: 'Transactions & Exchanges - Admin Portal',
      transactions,
      total,
      query: req.query,
      types: TRANSACTION_TYPES,
      statuses: TRANSACTION_STATUS,
      pagination: { page: pageNum, totalPages, total, limit: limitNum }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Export Data as CSV
exports.exportCSV = async (req, res, next) => {
  try {
    const { resource } = req.params;

    if (resource === 'users') {
      const users = await User.find().lean();
      let csv = 'ID,Name,Email,Phone,Role,IsBanned,CreatedAt\n';
      users.forEach((u) => {
        csv += `"${u._id}","${(u.name || '').replace(/"/g, '""')}","${u.email}","${u.phone || ''}","${u.role}","${u.isBanned}","${u.createdAt.toISOString()}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users-report.csv"');
      return res.send(csv);
    }

    if (resource === 'listings') {
      const listings = await Listing.find()
        .populate('sellerId', 'name email')
        .populate('category', 'name')
        .lean();
      let csv = 'ID,Title,Category,Price,Condition,Type,Status,SellerName,SellerEmail,CreatedAt\n';
      listings.forEach((l) => {
        csv += `"${l._id}","${(l.title || '').replace(/"/g, '""')}","${l.category ? l.category.name : ''}","${l.price}","${l.condition}","${l.type}","${l.status}","${l.sellerId ? l.sellerId.name : ''}","${l.sellerId ? l.sellerId.email : ''}","${l.createdAt.toISOString()}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="listings-report.csv"');
      return res.send(csv);
    }

    if (resource === 'transactions') {
      const transactions = await Transaction.find()
        .populate('listingId', 'title')
        .populate('buyerId', 'name email')
        .populate('sellerId', 'name email')
        .lean();
      let csv = 'ID,Type,Status,Amount,ItemTitle,BuyerName,BuyerEmail,SellerName,SellerEmail,CreatedAt\n';
      transactions.forEach((t) => {
        csv += `"${t._id}","${t.type}","${t.status}","${t.amount || 0}","${t.listingId ? (t.listingId.title || '').replace(/"/g, '""') : ''}","${t.buyerId ? t.buyerId.name : ''}","${t.buyerId ? t.buyerId.email : ''}","${t.sellerId ? t.sellerId.name : ''}","${t.sellerId ? t.sellerId.email : ''}","${t.createdAt.toISOString()}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions-report.csv"');
      return res.send(csv);
    }

    req.flash('error', 'Invalid report resource requested');
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
};
