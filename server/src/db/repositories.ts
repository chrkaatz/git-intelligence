import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { getDb } from './database.js';
import type { Repository } from './types.js';

export async function getRepositories(projectId?: string): Promise<Repository[]> {
  const database = await getDb();
  if (projectId) {
    return database.data.repositories.filter((r) => r.projectId === projectId);
  }
  return database.data.repositories;
}

export async function getRepository(id: string): Promise<Repository | null> {
  const database = await getDb();
  return database.data.repositories.find((r) => r.id === id) || null;
}

export async function addRepository(
  projectId: string,
  repoPath: string,
  name?: string,
  replace?: boolean
): Promise<Repository> {
  const database = await getDb();
  const repositories = database.data.repositories;

  const repoName = name || path.basename(repoPath);

  // Check if repository with same path exists
  const existingByPath = repositories.find((r) => r.path === repoPath);
  if (existingByPath) {
    if (replace) {
      // Update the existing repository
      const updatedRepo: Repository = {
        ...existingByPath,
        projectId,
        name: repoName,
        updatedAt: new Date().toISOString(),
      };
      database.data.repositories = database.data.repositories.map((r) =>
        r.id === existingByPath.id ? updatedRepo : r
      );
      await database.write();
      return updatedRepo;
    } else {
      return existingByPath;
    }
  }

  const newRepository: Repository = {
    id: uuidv4(),
    projectId,
    path: repoPath,
    name: repoName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  repositories.push(newRepository);
  database.data.repositories = repositories;
  await database.write();
  return newRepository;
}

export async function removeRepository(id: string): Promise<void> {
  const database = await getDb();
  const repository = database.data.repositories.find((r) => r.id === id);

  if (repository) {
    // Remove from repositories
    database.data.repositories = database.data.repositories.filter((r) => r.id !== id);
    // Clear cache for this repository
    delete database.data.analysisCache[repository.path];
    delete database.data.codebaseHealthCache[repository.path];
    await database.write();
  }
}
