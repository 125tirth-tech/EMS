const mongoose = require('mongoose');
const config = require('../config');

const RETRY_INTERVAL_MS = 5000;
const MAX_RETRIES = 5;

async function connectDB(retries = 0) {
  try {
    const conn = await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000
    });

    console.log(`  ✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    const attempt = retries + 1;
    console.error(`  ❌ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES + 1}):`, err.message);

    if (retries < MAX_RETRIES) {
      console.log(`  ⏳ Retrying MongoDB connection in ${RETRY_INTERVAL_MS / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      return connectDB(retries + 1);
    }

    console.warn('  ⚠️ MongoDB is unavailable; continuing without a database connection.');
    return null;
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('  ⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('  ❌ MongoDB error:', err.message);
});

module.exports = connectDB;
