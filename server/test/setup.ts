import { vi, beforeEach, afterEach } from 'vitest';

// Suppress console.log output during tests to reduce noise
// We keep console.error and console.warn for actual failures
const originalLog = console.log;
const originalInfo = console.info;
const originalDebug = console.debug;

beforeEach(() => {
  // Suppress console output during tests
  console.log = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
});

afterEach(() => {
  // Restore console after each test
  console.log = originalLog;
  console.info = originalInfo;
  console.debug = originalDebug;
});

