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
      serverSelectionTimeoutMS: 15000,
      directConnection: uri.includes('127.0.0.1') || uri.includes('localhost')
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    cachedConn = conn;
    await autoSeedIfEmpty();
    return conn;
  } catch (error) {
    console.warn(`! Direct MongoDB connection to ${uri} failed: ${error.message}`);
    console.log('🔄 Attempting fallback to in-memory MongoDB server for development...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      console.log(`⚡ In-Memory MongoDB Server created at: ${memoryUri}`);

      const conn = await mongoose.connect(memoryUri);
      console.log(`✓ Connected to In-Memory MongoDB instance.`);
      cachedConn = conn;
      await autoSeedIfEmpty();
      return conn;
    } catch (memErr) {
      console.warn(`! In-memory MongoDB fallback not available: ${memErr.message}`);
      console.warn(`! Please ensure MongoDB is running at ${uri}`);
      return null;
    }
  }
};

module.exports = connectDB;

