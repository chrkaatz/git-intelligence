import { Low } from 'lowdb';
import { Memory } from 'lowdb';
import type { DatabaseSchema } from '../types';
import { defaultData } from '../database';

export function createTestDb(initialData?: Partial<DatabaseSchema>): Low<DatabaseSchema> {
  const adapter = new Memory<DatabaseSchema>();
  const db = new Low(adapter, { ...defaultData, ...initialData });
  return db;
}
