import express from 'express';
import cors from 'cors';

const app = express();

console.log('Creating basic express app...');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Basic app working' });
});

console.log('Basic routes added, starting server...');

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
