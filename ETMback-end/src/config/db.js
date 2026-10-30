import mongoose from 'mongoose';

export async function connectDatabase(uri = process.env.MONGO_URI || process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGO_URI is required');
  await mongoose.connect(uri);
  return mongoose.connection;
}
