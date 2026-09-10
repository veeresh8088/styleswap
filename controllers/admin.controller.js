const User = require('../models/User');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Offer = require('../models/Offer');
const SwapRequest = require('../models/SwapRequest');
const Conversation = require('../models/Conversation');
const Cart = require('../models/Cart');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const { ROLES, LISTING_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS, ORDER_STATUSES, SWAP_REQUEST_STATUS } = require('../config/constants');

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
      .populate('shipments.item')
      .populate('shipments.sender', 'name email')
      .populate('shipments.receiver', 'name email')
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
      orderStatuses: ORDER_STATUSES,
      pagination: { page: pageNum, totalPages, total, limit: limitNum }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update Order / Exchange Status (Admin Only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, note, shipmentTarget = 'all' } = req.body;

    if (!orderStatus || !ORDER_STATUSES.includes(orderStatus)) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({
          success: false,
          message: `Invalid order status. Allowed: ${ORDER_STATUSES.join(', ')}`
        });
      }
      req.flash('error', 'Invalid order status selected.');
      return res.redirect('/admin/transactions');
    }

    const transaction = await Transaction.findById(id)
      .populate('listingId')
      .populate('exchangeItemId')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .populate('shipments.item');

    if (!transaction) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Transaction/Order not found' });
      }
      req.flash('error', 'Transaction not found.');
      return res.redirect('/admin/transactions');
    }

    const isExchange = transaction.type === TRANSACTION_TYPES.EXCHANGE;
    const hasTwoShipments = isExchange && transaction.shipments && transaction.shipments.length >= 2;

    if (hasTwoShipments) {
      // Independent shipment milestone updates
      if (shipmentTarget === 'shipmentA' || shipmentTarget === '0') {
        transaction.shipments[0].status = orderStatus;
        transaction.shipments[0].statusHistory.push({
          status: orderStatus,
          note: (note || '').trim() || `Shipment A (${transaction.shipments[0].trackingNumber}) updated to ${orderStatus}`,
          updatedAt: new Date(),
          updatedBy: req.user._id
        });
      } else if (shipmentTarget === 'shipmentB' || shipmentTarget === '1') {
        transaction.shipments[1].status = orderStatus;
        transaction.shipments[1].statusHistory.push({
          status: orderStatus,
          note: (note || '').trim() || `Shipment B (${transaction.shipments[1].trackingNumber}) updated to ${orderStatus}`,
          updatedAt: new Date(),
          updatedBy: req.user._id
        });
      } else {
        // Update both shipments
        transaction.shipments.forEach((s, idx) => {
          s.status = orderStatus;
          s.statusHistory.push({
            status: orderStatus,
            note: (note || '').trim() || `Shipment ${idx === 0 ? 'A' : 'B'} (${s.trackingNumber}) updated to ${orderStatus}`,
            updatedAt: new Date(),
            updatedBy: req.user._id
          });
        });
      }

      // Check if BOTH shipments are now Delivered
      const shipA = transaction.shipments[0];
      const shipB = transaction.shipments[1];
      const isADelivered = shipA.status === 'Delivered' || shipA.status === 'Completed';
      const isBDelivered = shipB.status === 'Delivered' || shipB.status === 'Completed';

      if (isADelivered && isBDelivered) {
        // Both delivered: COMPLETE THE SWAP & TRANSFER OWNERSHIP (EXACTLY ONCE)
        const wasAlreadyCompleted = transaction.status === TRANSACTION_STATUS.COMPLETED;
        transaction.status = TRANSACTION_STATUS.COMPLETED;
        transaction.orderStatus = 'Delivered';

        if (!transaction.statusHistory) transaction.statusHistory = [];
        transaction.statusHistory.push({
          status: 'Delivered',
          note: wasAlreadyCompleted
            ? `Status re-confirmed as Delivered by Admin`
            : 'Both shipments delivered! Swap completed and wardrobe ownership transferred.',
          updatedAt: new Date(),
          updatedBy: req.user._id
        });

        // Transfer ownership exactly once
        if (!wasAlreadyCompleted) {
          // 1. Product A (shipment A item): User A -> User B
          // Product A's new owner/sellerId becomes User B (shipA.receiver)
          if (shipA.item && shipA.receiver) {
            const itemAId = shipA.item._id || shipA.item;
            const newOwnerA = shipA.receiver._id || shipA.receiver;
            const previousOwnerA = shipA.sender._id || shipA.sender;
            const itemADoc = await Listing.findById(itemAId);
            const origSellerA = itemADoc?.originalSellerId || itemADoc?.sellerId || previousOwnerA;

            await Listing.findByIdAndUpdate(itemAId, {
              sellerId: newOwnerA,
              originalSellerId: origSellerA,
              status: LISTING_STATUS.EXCHANGED,
              $push: {
                ownerHistory: {
                  previousOwner: itemADoc?.sellerId || previousOwnerA,
                  newOwner: newOwnerA,
                  transferredAt: new Date(),
                  transactionId: transaction._id,
                  type: 'swap'
                }
              }
            });
          }

          // 2. Product B (shipment B item): User B -> User A
          // Product B's new owner/sellerId becomes User A (shipB.receiver)
          if (shipB.item && shipB.receiver) {
            const itemBId = shipB.item._id || shipB.item;
            const newOwnerB = shipB.receiver._id || shipB.receiver;
            const previousOwnerB = shipB.sender._id || shipB.sender;
            const itemBDoc = await Listing.findById(itemBId);
            const origSellerB = itemBDoc?.originalSellerId || itemBDoc?.sellerId || previousOwnerB;

            await Listing.findByIdAndUpdate(itemBId, {
              sellerId: newOwnerB,
              originalSellerId: origSellerB,
              status: LISTING_STATUS.EXCHANGED,
              $push: {
                ownerHistory: {
                  previousOwner: itemBDoc?.sellerId || previousOwnerB,
                  newOwner: newOwnerB,
                  transferredAt: new Date(),
                  transactionId: transaction._id,
                  type: 'swap'
                }
              }
            });
          }

          // 3. Mark SwapRequest completed if linked
          if (transaction.swapRequestId) {
            await SwapRequest.findByIdAndUpdate(transaction.swapRequestId, {
              status: SWAP_REQUEST_STATUS.COMPLETED
            });
          }
        }
      } else if (orderStatus === 'Cancelled') {
        transaction.status = TRANSACTION_STATUS.REJECTED;
        transaction.orderStatus = 'Cancelled';
        // Release listings back to approved
        if (transaction.listingId) {
          await Listing.findByIdAndUpdate(transaction.listingId._id || transaction.listingId, { status: LISTING_STATUS.APPROVED });
        }
        if (transaction.exchangeItemId) {
          await Listing.findByIdAndUpdate(transaction.exchangeItemId._id || transaction.exchangeItemId, { status: LISTING_STATUS.APPROVED });
        }
      } else {
        // Swap remains in progress until both are delivered
        transaction.status = TRANSACTION_STATUS.ACCEPTED;
        if (isADelivered || isBDelivered) {
          transaction.orderStatus = 'Out for Delivery';
        } else if (shipA.status === 'Out for Delivery' || shipB.status === 'Out for Delivery') {
          transaction.orderStatus = 'Out for Delivery';
        } else if (shipA.status === 'Dispatched' || shipB.status === 'Dispatched') {
          transaction.orderStatus = 'Dispatched';
        } else {
          transaction.orderStatus = 'Confirmed';
        }
      }

    } else {
      // Direct Purchase or single shipment
      transaction.orderStatus = orderStatus;

      if (!transaction.statusHistory) {
        transaction.statusHistory = [];
      }
      transaction.statusHistory.push({
        status: orderStatus,
        note: (note || '').trim(),
        updatedAt: new Date(),
        updatedBy: req.user._id
      });

      if (orderStatus === 'Completed' || orderStatus === 'Delivered') {
        transaction.status = TRANSACTION_STATUS.COMPLETED;
      } else if (orderStatus === 'Cancelled') {
        transaction.status = TRANSACTION_STATUS.REJECTED;
        if (transaction.listingId && transaction.listingId.status !== LISTING_STATUS.APPROVED) {
          transaction.listingId.status = LISTING_STATUS.APPROVED;
          await transaction.listingId.save();
        }
      }
    }

    await transaction.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: `Order #${transaction._id.toString().slice(-6).toUpperCase()} status updated to "${orderStatus}"`,
        data: transaction
      });
    }

    req.flash('success', `Order #${transaction._id.toString().slice(-6).toUpperCase()} status successfully updated to "${orderStatus}".`);
    res.redirect('/admin/transactions');
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

// @desc Get Database Tables / Collections Hub and Inspector
exports.getDatabaseTables = async (req, res, next) => {
  try {
    const tableSlug = req.params.tableName || null;

    // Fetch live row/record counts for all 9 collections
    const [
      usersCount,
      listingsCount,
      categoriesCount,
      transactionsCount,
      offersCount,
      swapRequestsCount,
      conversationsCount,
      cartsCount,
      loyaltyTxCount
    ] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments(),
      Category.countDocuments(),
      Transaction.countDocuments(),
      Offer.countDocuments(),
      SwapRequest.countDocuments(),
      Conversation.countDocuments(),
      Cart.countDocuments(),
      LoyaltyTransaction.countDocuments()
    ]);

    const totalRecordsCount =
      usersCount +
      listingsCount +
      categoriesCount +
      transactionsCount +
      offersCount +
      swapRequestsCount +
      conversationsCount +
      cartsCount +
      loyaltyTxCount;

    // Calculate total loyalty points in circulation across users
    const loyaltyAgg = await User.aggregate([
      { $group: { _id: null, totalPoints: { $sum: '$loyaltyPoints' } } }
    ]);
    const totalLoyaltyPointsInCirculation = loyaltyAgg.length > 0 ? (loyaltyAgg[0].totalPoints || 0) : 0;

    const tablesSummary = [
      {
        slug: 'users',
        tableName: 'Users',
        collectionName: 'users',
        icon: 'users',
        category: 'Identity & Auth',
        badgeColor: 'bg-blue-100 text-blue-800',
        count: usersCount,
        fields: ['_id', 'name', 'email', 'role', 'loyaltyPoints', 'isBanned', 'createdAt'],
        model: User
      },
      {
        slug: 'listings',
        tableName: 'Listings',
        collectionName: 'listings',
        icon: 'tag',
        category: 'Marketplace Inventory',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        count: listingsCount,
        fields: ['_id', 'title', 'price', 'condition', 'category', 'status', 'type', 'sellerId', 'createdAt'],
        model: Listing
      },
      {
        slug: 'transactions',
        tableName: 'Transactions & Orders',
        collectionName: 'transactions',
        icon: 'truck',
        category: 'Orders & Tracking',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        count: transactionsCount,
        fields: ['_id', 'buyerId', 'sellerId', 'listingId', 'amount', 'orderStatus', 'trackingNumber', 'status', 'createdAt'],
        model: Transaction
      },
      {
        slug: 'swaprequests',
        tableName: 'Item Swap Requests',
        collectionName: 'swaprequests',
        icon: 'repeat',
        category: 'Barter System',
        badgeColor: 'bg-purple-100 text-purple-800',
        count: swapRequestsCount,
        fields: ['_id', 'initiatorId', 'receiverId', 'offeredItemId', 'targetItemId', 'cashDifference', 'status', 'createdAt'],
        model: SwapRequest
      },
      {
        slug: 'offers',
        tableName: 'Make an Offer Negotiations',
        collectionName: 'offers',
        icon: 'badge-percent',
        category: 'Price Bargaining',
        badgeColor: 'bg-amber-100 text-amber-800',
        count: offersCount,
        fields: ['_id', 'buyerId', 'sellerId', 'listingId', 'amount', 'status', 'counterAmount', 'createdAt'],
        model: Offer
      },
      {
        slug: 'loyaltytransactions',
        tableName: 'Loyalty Points Ledger',
        collectionName: 'loyaltytransactions',
        icon: 'gift',
        category: 'Rewards & Wallet',
        badgeColor: 'bg-yellow-100 text-yellow-800',
        count: loyaltyTxCount,
        fields: ['_id', 'userId', 'type', 'points', 'amountEquivalent', 'balanceAfter', 'reason', 'createdAt'],
        model: LoyaltyTransaction
      },
      {
        slug: 'carts',
        tableName: 'Shopping Bags / Carts',
        collectionName: 'carts',
        icon: 'shopping-cart',
        category: 'Commerce Bag',
        badgeColor: 'bg-rose-100 text-rose-800',
        count: cartsCount,
        fields: ['_id', 'userId', 'items', 'pointsToRedeem', 'updatedAt'],
        model: Cart
      },
      {
        slug: 'conversations',
        tableName: 'Direct Messages & Chats',
        collectionName: 'conversations',
        icon: 'message-square',
        category: 'User Communication',
        badgeColor: 'bg-teal-100 text-teal-800',
        count: conversationsCount,
        fields: ['_id', 'participants', 'listingId', 'messages', 'updatedAt'],
        model: Conversation
      },
      {
        slug: 'categories',
        tableName: 'Listing Categories',
        collectionName: 'categories',
        icon: 'folder-tree',
        category: 'Catalog Taxonomy',
        badgeColor: 'bg-gray-100 text-gray-800',
        count: categoriesCount,
        fields: ['_id', 'name', 'slug', 'description', 'image', 'createdAt'],
        model: Category
      }
    ];

    let selectedTable = null;
    let selectedRecords = [];

    if (tableSlug) {
      const match = tablesSummary.find(t => t.slug.toLowerCase() === tableSlug.toLowerCase());
      if (match) {
        selectedTable = match;
        selectedRecords = await match.model
          .find()
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();
      }
    }

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        tablesSummary: tablesSummary.map(t => ({
          tableName: t.tableName,
          slug: t.slug,
          collectionName: t.collectionName,
          category: t.category,
          count: t.count,
          fields: t.fields
        })),
        totalRecordsCount,
        totalLoyaltyPointsInCirculation,
        selectedTable: selectedTable ? selectedTable.tableName : null,
        selectedRecords
      });
    }

    res.render('pages/admin/tables', {
      title: 'Database Tables & Collections - Styleswap Admin',
      tablesSummary,
      totalRecordsCount,
      totalLoyaltyPointsInCirculation,
      selectedTable,
      selectedRecords,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

// @desc Render Admin Portal Login Page
exports.renderAdminLogin = (req, res) => {
  if (req.user && req.user.role === ROLES.ADMIN) {
    return res.redirect('/admin');
  }
  res.render('pages/admin/login', {
    title: 'Admin Portal Login - Styleswap'
  });
};

// @desc Process Admin Portal Login
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Invalid administrator credentials' });
      }
      req.flash('error', 'Invalid administrator credentials.');
      return res.redirect('/admin/login');
    }

    if (user.role !== ROLES.ADMIN) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Forbidden. Administrator privileges required.' });
      }
      req.flash('error', 'Access denied. You do not have administrator permissions.');
      return res.redirect('/admin/login');
    }

    if (user.isBanned) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Administrator account suspended.' });
      }
      req.flash('error', 'Administrator account suspended.');
      return res.redirect('/admin/login');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Invalid administrator credentials' });
      }
      req.flash('error', 'Invalid administrator credentials.');
      return res.redirect('/admin/login');
    }

    const token = user.generateAuthToken();
    const days = parseInt(process.env.COOKIE_EXPIRES_IN, 10) || 7;
    res.cookie('token', token, {
      expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    req.flash('success', `Welcome back to Admin Control Center, ${user.name}!`);
    return res.redirect('/admin');
  } catch (error) {
    next(error);
  }
};
