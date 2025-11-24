import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_FILE = path.join(process.cwd(), 'projects.json');

export interface Project {
  id: string;
  path: string;
  name: string;
}

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify([]));
  }
}

export async function getProjects(): Promise<Project[]> {
  await ensureDb();
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
}

export async function addProject(repoPath: string): Promise<Project> {
  await ensureDb();
  const projects = await getProjects();

  // Check if already exists
  const existing = projects.find(p => p.path === repoPath);
  if (existing) return existing;

  const name = path.basename(repoPath);
  const newProject: Project = {
    id: uuidv4(),
    path: repoPath,
    name
  };

  projects.push(newProject);
  await fs.writeFile(DB_FILE, JSON.stringify(projects, null, 2));
  return newProject;
}

export async function removeProject(id: string): Promise<void> {
  await ensureDb();
  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== id);
  await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2));
}
