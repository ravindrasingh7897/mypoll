import express from 'express';
import cors from 'cors';

console.log('Step 1: Basic imports successful');

const app = express();

console.log('Step 2: Express app created');

app.use(cors());
app.use(express.json());

console.log('Step 3: Middleware added');

app.get('/', (req, res) => {
  res.json({ message: 'Test successful' });
});

console.log('Step 4: Basic route added');

try {
  console.log('Step 5: Attempting to import polls routes...');
  const pollRoutes = await import('./routes/polls.js');
  console.log('Step 6: Polls routes imported successfully');
  
  app.use('/api/polls', pollRoutes.default);
  console.log('Step 7: Polls routes mounted successfully');
} catch (error) {
  console.error('ERROR in polls routes import:', error);
  console.error('Stack trace:', error.stack);
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
