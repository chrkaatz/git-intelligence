import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects';
import repositoriesRouter from './routes/repositories';
import uploadRouter from './routes/upload';
import analyticsRouter from './routes/analytics';
import cacheRouter from './routes/cache';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/projects', projectsRouter);
app.use('/repositories', repositoriesRouter);
app.use('/upload', uploadRouter);
app.use('/cache', cacheRouter);
app.use('/', analyticsRouter);

// Error handling middleware
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
