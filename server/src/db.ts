import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface Project {
  id: string;
  path: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CachedStats {
  stats: any; // GitStats structure
  cachedAt: string;
  repoPath: string;
}

interface DatabaseSchema {
  projects: Project[];
  analysisCache: Record<string, CachedStats>; // keyed by project path
}

// Default data structure
const defaultData: DatabaseSchema = {
  projects: [],
  analysisCache: {},
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
        const migratedData: DatabaseSchema = {
          projects: oldData.map((p: any) => ({
            ...p,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          analysisCache: {},
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(migratedData, null, 2));
        console.log('Migrated projects.json to db.json');
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

  if (!db.data.projects) {
    db.data.projects = [];
  }

  if (!db.data.analysisCache) {
    db.data.analysisCache = {};
  }

  return db;
}

export async function getProjects(): Promise<Project[]> {
  const database = await getDb();
  return database.data.projects;
}

export async function addProject(
  repoPath: string,
  name?: string,
  replace?: boolean
): Promise<Project> {
  const database = await getDb();
  const projects = database.data.projects;

  const projectName = name || path.basename(repoPath);

  // Check if project with same name exists
  const existingByName = projects.find((p) => p.name === projectName);
  if (existingByName) {
    if (replace) {
      // Remove the existing project with the same name
      const filtered = projects.filter((p) => p.id !== existingByName.id);
      const updatedProject: Project = {
        ...existingByName,
        path: repoPath,
        name: projectName,
        updatedAt: new Date().toISOString(),
      };
      filtered.push(updatedProject);
      database.data.projects = filtered;
      // Clear cache for this project
      delete database.data.analysisCache[repoPath];
      await database.write();
      return updatedProject;
    } else {
      // Return existing project if not replacing
      return existingByName;
    }
  }

  // Check if project with same path exists
  const existingByPath = projects.find((p) => p.path === repoPath);
  if (existingByPath) {
    if (replace) {
      // Update the existing project's name
      const updatedProject: Project = {
        ...existingByPath,
        name: projectName,
        updatedAt: new Date().toISOString(),
      };
      const filtered = projects.filter((p) => p.id !== existingByPath.id);
      filtered.push(updatedProject);
      database.data.projects = filtered;
      await database.write();
      return updatedProject;
    } else {
      return existingByPath;
    }
  }

  const newProject: Project = {
    id: uuidv4(),
    path: repoPath,
    name: projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects.push(newProject);
  database.data.projects = projects;
  await database.write();
  return newProject;
}

export async function removeProject(id: string): Promise<void> {
  const database = await getDb();
  const project = database.data.projects.find((p) => p.id === id);

  if (project) {
    // Remove from projects
    database.data.projects = database.data.projects.filter((p) => p.id !== id);
    // Clear cache for this project
    delete database.data.analysisCache[project.path];
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
  } else {
    database.data.analysisCache = {};
  }
  await database.write();
}
