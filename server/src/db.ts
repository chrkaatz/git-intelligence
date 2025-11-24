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

export async function addProject(repoPath: string, name?: string, replace?: boolean): Promise<Project> {
  await ensureDb();
  const projects = await getProjects();

  const projectName = name || path.basename(repoPath);

  // Check if project with same name exists
  const existingByName = projects.find(p => p.name === projectName);
  if (existingByName) {
    if (replace) {
      // Remove the existing project with the same name
      const filtered = projects.filter(p => p.id !== existingByName.id);
      const updatedProject: Project = {
        ...existingByName,
        path: repoPath,
        name: projectName
      };
      filtered.push(updatedProject);
      await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2));
      return updatedProject;
    } else {
      // Return existing project if not replacing
      return existingByName;
    }
  }

  // Check if project with same path exists
  const existingByPath = projects.find(p => p.path === repoPath);
  if (existingByPath) {
    if (replace) {
      // Update the existing project's name
      const updatedProject: Project = {
        ...existingByPath,
        name: projectName
      };
      const filtered = projects.filter(p => p.id !== existingByPath.id);
      filtered.push(updatedProject);
      await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2));
      return updatedProject;
    } else {
      return existingByPath;
    }
  }

  const newProject: Project = {
    id: uuidv4(),
    path: repoPath,
    name: projectName
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
