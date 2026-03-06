import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const JWT_SECRET = process.env.JWT_SECRET?.trim();

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

console.log(`📡 MONGODB_URI length: ${MONGODB_URI.length} characters`);

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      // Removed family: 4 to allow DNS SRV resolution to work correctly in Cloud environments
    };

    console.log('⏳ Attempting to connect to MongoDB...');
    const redactedUri = MONGODB_URI.split('@')[1] || 'URL format error';
    console.log(`🔗 Target Host: ${redactedUri.split('/')[0]}`);

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB Atlas Cloud');
      return mongoose;
    }).catch((err) => {
      console.error('❌ MongoDB Connection Error Details:');
      console.error('   Code:', err.code);
      console.error('   Name:', err.name);
      console.error('   Message:', err.message);
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
