import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';
import type { Project } from './types.js';

export async function getProjects(): Promise<Project[]> {
  const database = await getDb();
  // Sort by order (lower numbers first), then by createdAt for projects without order
  return [...database.data.projects].sort((a, b) => {
    const orderA = a.order ?? Infinity;
    const orderB = b.order ?? Infinity;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // If order is the same, sort by createdAt
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
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

  // Set order to be after the last project
  const maxOrder = projects.reduce((max, p) => Math.max(max, p.order ?? 0), -1);

  const newProject: Project = {
    id: uuidv4(),
    name,
    description,
    order: maxOrder + 1,
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

export async function reorderProjects(projectIds: string[]): Promise<void> {
  const database = await getDb();

  // Update order for each project based on its position in the array
  projectIds.forEach((projectId, index) => {
    const project = database.data.projects.find((p) => p.id === projectId);
    if (project) {
      project.order = index;
      project.updatedAt = new Date().toISOString();
    }
  });

  await database.write();
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
