import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface Repository {
  id: string;
  projectId: string;
  path: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CachedStats {
  stats: any; // GitStats structure
  cachedAt: string;
  repoPath: string;
}

export interface CachedCodebaseHealth {
  health: any; // CodebaseHealth structure
  cachedAt: string;
  repoPath: string;
}

interface DatabaseSchema {
  projects: Project[];
  repositories: Repository[];
  analysisCache: Record<string, CachedStats>; // keyed by repository path
  codebaseHealthCache: Record<string, CachedCodebaseHealth>; // keyed by repository path
  schemaVersion?: number; // Track schema version for migrations
}

// Default data structure
const defaultData: DatabaseSchema = {
  projects: [],
  repositories: [],
  analysisCache: {},
  codebaseHealthCache: {},
  schemaVersion: 2, // Current schema version
};

// Initialize database
let db: Low<DatabaseSchema> | null = null;

async function getDb(): Promise<Low<DatabaseSchema>> {
  if (db) {
    return db;
  }

  // Ensure database file exists
  if (!fs.existsSync(DB_FILE)) {
    // Try to migrate from old projects.json if it exists
    const oldDbFile = path.join(process.cwd(), 'projects.json');
    if (fs.existsSync(oldDbFile)) {
      try {
        const oldData = JSON.parse(fs.readFileSync(oldDbFile, 'utf-8'));
        // Migrate old structure (repositories as projects) to new structure
        const defaultProject: Project = {
          id: uuidv4(),
          name: 'Default Project',
          description: 'Migrated from old structure',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const repositories: Repository[] = oldData.map((p: any) => ({
          id: p.id || uuidv4(),
          projectId: defaultProject.id,
          path: p.path,
          name: p.name || path.basename(p.path),
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
        }));
        const migratedData: DatabaseSchema = {
          projects: [defaultProject],
          repositories,
          analysisCache: {},
          codebaseHealthCache: {},
          schemaVersion: 2,
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(migratedData, null, 2));
        console.log('Migrated projects.json to db.json with new schema');
      } catch (error) {
        console.error('Failed to migrate projects.json:', error);
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
      }
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    }
  }

  const adapter = new JSONFile<DatabaseSchema>(DB_FILE);
  db = new Low(adapter, defaultData);
  await db.read();

  // Ensure structure exists
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }

  // Migrate existing data if schema version is old
  if (!db.data.schemaVersion || db.data.schemaVersion < 2) {
    await migrateToSchemaV2(db);
  }

  if (!db.data.projects) {
    db.data.projects = [];
  }

  if (!db.data.repositories) {
    db.data.repositories = [];
  }

  if (!db.data.analysisCache) {
    db.data.analysisCache = {};
  }

  if (!db.data.codebaseHealthCache) {
    db.data.codebaseHealthCache = {};
  }

  return db;
}

// Migration function to convert old schema (projects as repositories) to new schema
async function migrateToSchemaV2(db: Low<DatabaseSchema>): Promise<void> {
  console.log('Migrating database to schema version 2...');

  // If we have old "projects" that are actually repositories
  if (db.data.projects && db.data.projects.length > 0) {
    const oldProjects = db.data.projects as any[];

    // Check if any project has a "path" field (old schema)
    const hasOldSchema = oldProjects.some((p: any) => p.path);

    if (hasOldSchema) {
      // Create a default project
      const defaultProject: Project = {
        id: uuidv4(),
        name: 'Default Project',
        description: 'Migrated from old structure',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Convert old projects to repositories
      const repositories: Repository[] = oldProjects.map((p: any) => ({
        id: p.id || uuidv4(),
        projectId: defaultProject.id,
        path: p.path,
        name: p.name || path.basename(p.path),
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      }));

      // Update database
      db.data.projects = [defaultProject];
      db.data.repositories = repositories;
      db.data.schemaVersion = 2;

      await db.write();
      console.log(`Migrated ${repositories.length} repositories to new schema`);
    }
  }

  // Ensure schema version is set
  if (!db.data.schemaVersion) {
    db.data.schemaVersion = 2;
    await db.write();
  }
}

// Project functions
export async function getProjects(): Promise<Project[]> {
  const database = await getDb();
  return database.data.projects;
}

export async function getProject(id: string): Promise<Project | null> {
  const database = await getDb();
  return database.data.projects.find((p) => p.id === id) || null;
}

export async function addProject(
  name: string,
  description?: string
): Promise<Project> {
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

  database.data.projects = database.data.projects.map((p) =>
    p.id === id ? updatedProject : p
  );
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
  database.data.repositories = database.data.repositories.filter(
    (r) => r.projectId !== id
  );

  await database.write();
}

// Repository functions
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

export async function getCachedStats(
  repoPath: string,
  maxAgeMs: number = 3600000
): Promise<any | null> {
  // maxAgeMs defaults to 1 hour (3600000ms)
  const database = await getDb();
  const cached = database.data.analysisCache[repoPath];

  if (!cached) {
    return null;
  }

  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired, remove it
    delete database.data.analysisCache[repoPath];
    await database.write();
    return null;
  }

  return cached.stats;
}

export async function setCachedStats(repoPath: string, stats: any): Promise<void> {
  const database = await getDb();
  database.data.analysisCache[repoPath] = {
    stats,
    cachedAt: new Date().toISOString(),
    repoPath,
  };
  await database.write();
}

export async function clearCache(repoPath?: string): Promise<void> {
  const database = await getDb();
  if (repoPath) {
    delete database.data.analysisCache[repoPath];
    delete database.data.codebaseHealthCache[repoPath];
  } else {
    database.data.analysisCache = {};
    database.data.codebaseHealthCache = {};
  }
  await database.write();
}

export async function getCachedCodebaseHealth(
  repoPath: string,
  maxAgeMs: number = 3600000
): Promise<any | null> {
  // maxAgeMs defaults to 1 hour (3600000ms)
  const database = await getDb();
  const cached = database.data.codebaseHealthCache[repoPath];

  if (!cached) {
    return null;
  }

  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired, remove it
    delete database.data.codebaseHealthCache[repoPath];
    await database.write();
    return null;
  }

  return cached.health;
}

export async function setCachedCodebaseHealth(repoPath: string, health: any): Promise<void> {
  const database = await getDb();
  database.data.codebaseHealthCache[repoPath] = {
    health,
    cachedAt: new Date().toISOString(),
    repoPath,
  };
  await database.write();
}
