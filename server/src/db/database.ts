import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import type { DatabaseSchema, Project, Repository, OllamaSettings } from './types.js';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Default Ollama settings
const defaultOllamaSettings: OllamaSettings = {
  enabled: false,
  host: 'localhost',
  port: 11434,
  model: 'llama3',
  timeout: 30000,
};

// Default data structure
export const defaultData: DatabaseSchema = {
  projects: [],
  repositories: [],
  analysisCache: {},
  codebaseHealthCache: {},
  technicalDebtCache: {},
  developerAnalyticsCache: {},
  riskAnalyticsCache: {},
  busFactorCache: {},
  repositoryEvolutionCache: {},
  socialNetworkAnalysisCache: {},
  ollamaSettings: defaultOllamaSettings,
  schemaVersion: 5, // Current schema version
};

// Initialize database
let db: Low<DatabaseSchema> | null = null;

export async function getDb(): Promise<Low<DatabaseSchema>> {
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
          technicalDebtCache: {},
          developerAnalyticsCache: {},
          riskAnalyticsCache: {},
          busFactorCache: {},
          repositoryEvolutionCache: {},
          socialNetworkAnalysisCache: {},
          ollamaSettings: defaultOllamaSettings,
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

  // Migrate to schema version 3 (add order field to projects)
  if (!db.data.schemaVersion || db.data.schemaVersion < 3) {
    await migrateToSchemaV3(db);
  }

  // Migrate to schema version 4 (add order field to repositories)
  if (!db.data.schemaVersion || db.data.schemaVersion < 4) {
    await migrateToSchemaV4(db);
  }

  // Migrate to schema version 5 (add Ollama settings)
  if (!db.data.schemaVersion || db.data.schemaVersion < 5) {
    await migrateToSchemaV5(db);
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

  if (!db.data.technicalDebtCache) {
    db.data.technicalDebtCache = {};
  }

  if (!db.data.developerAnalyticsCache) {
    db.data.developerAnalyticsCache = {};
  }

  if (!db.data.riskAnalyticsCache) {
    db.data.riskAnalyticsCache = {};
  }

  if (!db.data.busFactorCache) {
    db.data.busFactorCache = {};
  }

  if (!db.data.repositoryEvolutionCache) {
    db.data.repositoryEvolutionCache = {};
  }

  if (!db.data.socialNetworkAnalysisCache) {
    db.data.socialNetworkAnalysisCache = {};
  }

  if (!db.data.ollamaSettings) {
    db.data.ollamaSettings = defaultOllamaSettings;
    await db.write();
  }

  return db;
}

// Migration function to convert old schema (projects as repositories) to new schema
export async function migrateToSchemaV2(db: Low<DatabaseSchema>): Promise<void> {
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

// Migration function to add order field to projects
export async function migrateToSchemaV3(db: Low<DatabaseSchema>): Promise<void> {
  console.log('Migrating database to schema version 3 (adding project order)...');

  if (db.data.projects && db.data.projects.length > 0) {
    // Set order for existing projects based on their current index
    db.data.projects = db.data.projects.map((project, index) => ({
      ...project,
      order: project.order ?? index,
    }));

    db.data.schemaVersion = 3;
    await db.write();
    console.log(`Set order for ${db.data.projects.length} projects`);
  } else {
    db.data.schemaVersion = 3;
    await db.write();
  }
}

// Migration function to add order field to repositories
export async function migrateToSchemaV4(db: Low<DatabaseSchema>): Promise<void> {
  console.log('Migrating database to schema version 4 (adding repository order)...');

  if (db.data.repositories && db.data.repositories.length > 0) {
    // Group repositories by projectId and set order within each project
    const projectGroups = new Map<string, Repository[]>();
    db.data.repositories.forEach((repo) => {
      const repos = projectGroups.get(repo.projectId) || [];
      repos.push(repo);
      projectGroups.set(repo.projectId, repos);
    });

    // Set order for repositories within each project
    projectGroups.forEach((repos, projectId) => {
      repos.forEach((repo, index) => {
        repo.order = repo.order ?? index;
      });
    });

    db.data.schemaVersion = 4;
    await db.write();
    console.log(`Set order for ${db.data.repositories.length} repositories`);
  } else {
    db.data.schemaVersion = 4;
    await db.write();
  }
}

// Migration function to add Ollama settings
export async function migrateToSchemaV5(db: Low<DatabaseSchema>): Promise<void> {
  console.log('Migrating database to schema version 5 (adding Ollama settings)...');

  // Initialize Ollama settings with defaults if they don't exist
  if (!db.data.ollamaSettings) {
    db.data.ollamaSettings = defaultOllamaSettings;
  }

  db.data.schemaVersion = 5;
  await db.write();
  console.log('Added Ollama settings to database');
}

// Reset database instance (useful for testing)
export function resetDb(): void {
  db = null;
}
