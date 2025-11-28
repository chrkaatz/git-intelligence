import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    rmSync: vi.fn(),
  },
  existsSync: vi.fn(),
  rmSync: vi.fn(),
}));

// Import after mocks
import * as fs from 'fs';
import { deleteUploadedFolder } from '../fileUtils';

const mockExistsSync = vi.mocked(fs.existsSync);
const mockRmSync = vi.mocked(fs.rmSync);

describe('fileUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteUploadedFolder', () => {
    it('should not throw when called with any path', () => {
      // Basic test that function doesn't throw
      expect(() => deleteUploadedFolder('/any/path')).not.toThrow();
      expect(() => deleteUploadedFolder('/test/server/uploads/repo')).not.toThrow();
      expect(() => deleteUploadedFolder('/home/user/local-repo')).not.toThrow();
    });

    it('should NOT delete folder if it is outside uploads directory', () => {
      const repoPath = '/home/user/local-repo';
      mockExistsSync.mockReturnValue(true);

      deleteUploadedFolder(repoPath);

      // The function checks if path is in uploads before calling existsSync
      // So existsSync should not be called for paths outside uploads
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockRmSync).not.toHaveBeenCalled();
    });

    it('should handle path that starts with uploads but is not a subdirectory', () => {
      const repoPath = '/test/server/uploads-backup'; // Different directory
      mockExistsSync.mockReturnValue(true);

      deleteUploadedFolder(repoPath);

      // Should NOT delete because it's not actually in uploads
      expect(mockRmSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', () => {
      const cwd = process.cwd();
      const repoPath = path.join(cwd, 'uploads', 'abc123_extracted');
      mockExistsSync.mockReturnValue(true);
      mockRmSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw - errors are caught and logged
      expect(() => deleteUploadedFolder(repoPath)).not.toThrow();
    });
  });
});
