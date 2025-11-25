import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Low } from 'lowdb';
import { Memory } from 'lowdb';
import { getDb, resetDb, migrateToSchemaV2, defaultData } from '../database';
import type { DatabaseSchema } from '../types';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

// Mock lowdb JSONFile adapter - return Memory adapter when instantiated
vi.mock('lowdb/node', async () => {
  const { Memory } = await import('lowdb');
  function JSONFile() {
    return new Memory();
  }
  return {
    JSONFile,
  };
});

const mockFs = vi.mocked(fs);

describe('database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  afterEach(() => {
    resetDb();
  });

  describe('getDb', () => {
    it('should return same instance on subsequent calls', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const db1 = await getDb();
      const db2 = await getDb();

      expect(db1).toBe(db2);
    });

    it('should create default database file if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await getDb();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('db.json'),
        JSON.stringify(defaultData, null, 2)
      );
    });

    it('should migrate from old projects.json if it exists', async () => {
      const oldProjects = [
        {
          id: 'old-1',
          path: '/old/repo1',
          name: 'Old Repo 1',
        },
        {
          id: 'old-2',
          path: '/old/repo2',
          name: 'Old Repo 2',
        },
      ];

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = typeof filePath === 'string' ? filePath : filePath.toString();
        if (pathStr.includes('db.json')) return false;
        if (pathStr.includes('projects.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(oldProjects));

      await getDb();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('projects.json'),
        'utf-8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('db.json'),
        expect.stringContaining('Default Project')
      );
    });

    it('should handle migration errors gracefully', async () => {
      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = typeof filePath === 'string' ? filePath : filePath.toString();
        if (pathStr.includes('db.json')) return false;
        if (pathStr.includes('projects.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      await expect(getDb()).resolves.toBeDefined();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('db.json'),
        JSON.stringify(defaultData, null, 2)
      );
    });

    it('should ensure all required data structures exist', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const db = await getDb();

      expect(db.data.projects).toBeDefined();
      expect(db.data.repositories).toBeDefined();
      expect(db.data.analysisCache).toBeDefined();
      expect(db.data.codebaseHealthCache).toBeDefined();
    });
  });

  describe('migrateToSchemaV2', () => {
    it('should migrate old schema projects to repositories', async () => {
      const MemoryAdapter = Memory;
      const adapter = new MemoryAdapter<DatabaseSchema>();
      const db = new Low(adapter, {
        projects: [
          {
            id: 'old-1',
            name: 'Old Repo 1',
            path: '/old/repo1',
          } as any,
          {
            id: 'old-2',
            name: 'Old Repo 2',
            path: '/old/repo2',
          } as any,
        ],
        repositories: [],
        analysisCache: {},
        codebaseHealthCache: {},
      });

      await migrateToSchemaV2(db);

      expect(db.data.projects).toHaveLength(1);
      expect(db.data.projects[0].name).toBe('Default Project');
      expect(db.data.repositories).toHaveLength(2);
      expect(db.data.repositories[0].path).toBe('/old/repo1');
      expect(db.data.repositories[1].path).toBe('/old/repo2');
      expect(db.data.schemaVersion).toBe(2);
    });

    it('should not migrate if projects do not have path field', async () => {
      const MemoryAdapter = Memory;
      const adapter = new MemoryAdapter<DatabaseSchema>();
      const db = new Low(adapter, {
        projects: [
          {
            id: '1',
            name: 'Project 1',
          },
        ],
        repositories: [],
        analysisCache: {},
        codebaseHealthCache: {},
      });

      await migrateToSchemaV2(db);

      expect(db.data.projects).toHaveLength(1);
      expect(db.data.projects[0].name).toBe('Project 1');
      expect(db.data.repositories).toHaveLength(0);
    });

    it('should set schema version if not set', async () => {
      const MemoryAdapter = Memory;
      const adapter = new MemoryAdapter<DatabaseSchema>();
      const db = new Low(adapter, {
        projects: [],
        repositories: [],
        analysisCache: {},
        codebaseHealthCache: {},
      });

      await migrateToSchemaV2(db);

      expect(db.data.schemaVersion).toBe(2);
    });

    it('should handle empty projects array', async () => {
      const MemoryAdapter = Memory;
      const adapter = new MemoryAdapter<DatabaseSchema>();
      const db = new Low(adapter, {
        projects: [],
        repositories: [],
        analysisCache: {},
        codebaseHealthCache: {},
      });

      await migrateToSchemaV2(db);

      expect(db.data.schemaVersion).toBe(2);
    });
  });

  describe('resetDb', () => {
    it('should reset database instance', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const db1 = await getDb();
      resetDb();
      const db2 = await getDb();

      expect(db1).not.toBe(db2);
    });
  });
});
