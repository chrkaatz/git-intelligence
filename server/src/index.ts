import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { getStats } from './git';
import { getProjects, addProject, removeProject } from './db';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.get('/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    // If no projects, add current working directory as default
    if (projects.length === 0) {
      await addProject(process.cwd());
      return res.json(await getProjects());
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const zip = new AdmZip(req.file.path);
    const extractPath = path.join(process.cwd(), 'uploads', req.file.filename + '_extracted');

    // Create directory if it doesn't exist
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    zip.extractAllTo(extractPath, true);

    // Clean up zip file
    fs.unlinkSync(req.file.path);

    // Find the actual git repo root (in case it's nested)
    let repoPath = extractPath;
    const items = fs.readdirSync(extractPath);
    // If there's only one directory and it's not .git, assume it's a wrapper folder
    if (items.length === 1 && fs.statSync(path.join(extractPath, items[0])).isDirectory() && items[0] !== '.git') {
      repoPath = path.join(extractPath, items[0]);
    }

    const project = await addProject(repoPath);
    res.json(project);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

app.post('/projects', async (req, res) => {
  const { path } = req.body;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }
  try {
    const project = await addProject(path);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await removeProject(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove project' });
  }
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
