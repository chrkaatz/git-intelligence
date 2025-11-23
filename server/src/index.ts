import express from 'express';
import cors from 'cors';
import { getStats } from './git';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/projects', (req, res) => {
  // TODO: Implement project list persistence
  res.json([{ id: '1', path: process.cwd(), name: 'Current Project' }]);
});

app.get('/stats', async (req, res) => {
  const { path } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }
  try {
    const stats = await getStats(path);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze project' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
