import dotenv from "dotenv";
dotenv.config(); 

import mongoose from 'mongoose';

console.log('Loading modules...');

let server;
try {
  const appModule = await import('./app.js');
  server = appModule.server;
  console.log('App module loaded successfully');
} catch (error) {
  console.error('Error loading app module:', error);
  process.exit(1);
}

const port = process.env.PORT || 5000;

console.log('Starting server...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
});

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI ;
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000, 
      connectTimeoutMS: 15000,
      socketTimeoutMS: 15000,
    });
    
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);

    return false;
  }
};

const startServer = async () => {
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.log('Server will not start due to database connection issues');
    process.exit(1);
  }
  
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Ready to handle polls!`);
  });
};

startServer();

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});