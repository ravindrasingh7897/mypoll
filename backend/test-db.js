import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    try {
        console.log('🔄 Testing MongoDB connection...');
        console.log('URI:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':***@')); // Hide password
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
        });
        
        console.log('✅ MongoDB connection successful!');
        
        // Test a simple operation
        const testCollection = mongoose.connection.db.collection('test');
        await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
        console.log('✅ Database write operation successful!');
        
        await mongoose.disconnect();
        console.log('✅ Test completed successfully. Your database is working!');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:');
        console.error('Error:', error.message);
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Suggestions:');
            console.log('1. Check your internet connection');
            console.log('2. Verify the MongoDB Atlas cluster is not paused');
            console.log('3. Check if your IP is whitelisted in Atlas Network Access');
        } else if (error.message.includes('authentication failed')) {
            console.log('\n💡 Suggestions:');
            console.log('1. Check your username and password in the connection string');
            console.log('2. Verify the database user has proper permissions');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 Suggestions:');
            console.log('1. Your Atlas cluster might be paused - try accessing it via Atlas dashboard');
            console.log('2. Check your network firewall settings');
        }
        
        console.log('\n🔧 Alternative: Use local MongoDB by changing .env to:');
        console.log('MONGODB_URI=mongodb://localhost:27017/live-polling-system');
    }
}

testConnection();
