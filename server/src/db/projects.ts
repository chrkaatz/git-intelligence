import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';
import type { Project } from './types.js';

export async function getProjects(): Promise<Project[]> {
  const database = await getDb();
  return database.data.projects;
}

export async function getProject(id: string): Promise<Project | null> {
  const database = await getDb();
  return database.data.projects.find((p) => p.id === id) || null;
}

export async function addProject(name: string, description?: string): Promise<Project> {
  const database = await getDb();
  const projects = database.data.projects;

  // Check if project with same name exists
  const existing = projects.find((p) => p.name === name);
  if (existing) {
    return existing;
  }

  const newProject: Project = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects.push(newProject);
  database.data.projects = projects;
  await database.write();
  return newProject;
}

export async function updateProject(
  id: string,
  updates: { name?: string; description?: string }
): Promise<Project | null> {
  const database = await getDb();
  const project = database.data.projects.find((p) => p.id === id);

  if (!project) {
    return null;
  }

  const updatedProject: Project = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  database.data.projects = database.data.projects.map((p) => (p.id === id ? updatedProject : p));
  await database.write();
  return updatedProject;
}

export async function removeProject(id: string): Promise<void> {
  const database = await getDb();

  // Remove project
  database.data.projects = database.data.projects.filter((p) => p.id !== id);

  // Remove all repositories in this project
  const reposToRemove = database.data.repositories.filter((r) => r.projectId === id);
  reposToRemove.forEach((repo) => {
    delete database.data.analysisCache[repo.path];
    delete database.data.codebaseHealthCache[repo.path];
  });
  database.data.repositories = database.data.repositories.filter((r) => r.projectId !== id);

  await database.write();
}
