import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Test server working' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});
