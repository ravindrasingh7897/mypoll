import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pollRoutes, { initializePollCleanup } from './routes/polls.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001", 
      "https://mypoll-beryl.vercel.app",
      "https://mypoll-git-main-rss-projects-446bee74.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://mypoll-beryl.vercel.app",
    "https://mypoll-git-main-rss-projects-446bee74.vercel.app"
  ]
}));
app.use(express.json());
app.use(morgan('dev'));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/', (req, res) => {
    res.json({ message: 'Live Polling System Backend is running.' });
});

app.get('/api/health', async (req, res) => {
    try {
        const mongoose = await import('mongoose');
        const isConnected = mongoose.default.connection.readyState === 1;
        
        res.json({
            status: 'Server is running',
            database: isConnected ? 'Connected' : 'Disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'Server is running',
            database: 'Error checking connection',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.use('/api/polls', pollRoutes);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join-poll', (pollId) => {
    socket.join(pollId);
    console.log(`User ${socket.id} joined poll room: ${pollId}`);
  });
  
  socket.on('leave-poll', (pollId) => {
    socket.leave(pollId);
    console.log(`User ${socket.id} left poll room: ${pollId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

initializePollCleanup(io);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

export { app, server, io };