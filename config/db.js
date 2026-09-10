const mongoose = require('mongoose');
const autoSeedIfEmpty = require('../scripts/auto-seed');

let cachedConn = null;

const connectDB = async () => {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_wear_exchange';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    cachedConn = conn;
    await autoSeedIfEmpty();
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection to ${uri} failed: ${error.message}`);
    return null;
  }
};

module.exports = connectDB;

