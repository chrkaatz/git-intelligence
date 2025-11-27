import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { getDb } from './database.js';
import { clearCache } from './cache.js';
import type { Repository } from './types.js';

export async function getRepositories(projectId?: string): Promise<Repository[]> {
  const database = await getDb();
  let repositories: Repository[];
  if (projectId) {
    repositories = database.data.repositories.filter((r) => r.projectId === projectId);
  } else {
    repositories = database.data.repositories;
  }
  // Sort by order (lower numbers first), then by createdAt for repositories without order
  return [...repositories].sort((a, b) => {
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
      // Clear cache when repository is replaced (new upload)
      await clearCache(repoPath);
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

  // New repository added - clear any existing cache for this path (shouldn't exist, but be safe)
  await clearCache(repoPath);

  // Set order to be after the last repository in this project
  const projectRepos = repositories.filter((r) => r.projectId === projectId);
  const maxOrder = projectRepos.reduce((max, r) => Math.max(max, r.order ?? 0), -1);

  const newRepository: Repository = {
    id: uuidv4(),
    projectId,
    path: repoPath,
    name: repoName,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  repositories.push(newRepository);
  database.data.repositories = repositories;
  await database.write();
  return newRepository;
}

export async function reorderRepositories(
  projectId: string,
  repositoryIds: string[]
): Promise<void> {
  const database = await getDb();

  // Update order for each repository based on its position in the array
  repositoryIds.forEach((repositoryId, index) => {
    const repository = database.data.repositories.find(
      (r) => r.id === repositoryId && r.projectId === projectId
    );
    if (repository) {
      repository.order = index;
      repository.updatedAt = new Date().toISOString();
    }
  });

  await database.write();
}

export async function removeRepository(id: string): Promise<void> {
  const database = await getDb();
  const repository = database.data.repositories.find((r) => r.id === id);

  if (repository) {
    // Remove from repositories
    database.data.repositories = database.data.repositories.filter((r) => r.id !== id);
    // Clear cache for this repository
    await clearCache(repository.path);
    await database.write();
  }
}
