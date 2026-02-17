import fs from 'fs';
import path from 'path';

export interface FileCoverage {
  coverage: number;
  linesFound: number;
  linesHit: number;
}

export interface CoverageData {
  totalCoverage: number;
  files: Record<string, FileCoverage>;
}

/**
 * Scan for coverage files in the repository and parse them.
 * Supported formats: LCOV (lcov.info)
 */
export async function getCoverageData(repoPath: string): Promise<CoverageData | null> {
  const commonLcovPaths = [
    'coverage/lcov.info',
    'server/coverage/lcov.info',
    'client/coverage/lcov.info',
    'reports/lcov.info',
  ];

  for (const lcovRelPath of commonLcovPaths) {
    const lcovPath = path.join(repoPath, lcovRelPath);
    if (fs.existsSync(lcovPath)) {
      try {
        const content = fs.readFileSync(lcovPath, 'utf-8');
        return parseLcov(content);
      } catch (error) {
        console.warn(`Failed to parse lcov file at ${lcovPath}:`, error);
      }
    }
  }

  // If no common paths found, do a quick search (limit depth to avoid performance issues)
  try {
    const lcovFiles = findLcovFiles(repoPath, 3);
    if (lcovFiles.length > 0) {
      const content = fs.readFileSync(lcovFiles[0], 'utf-8');
      return parseLcov(content);
    }
  } catch (error) {
    console.warn(`Error searching for lcov files in ${repoPath}:`, error);
  }

  return null;
}

function findLcovFiles(dir: string, maxDepth: number, currentDepth: number = 0): string[] {
  if (currentDepth > maxDepth) return [];
  const files: string[] = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === '.git') continue;
        files.push(...findLcovFiles(path.join(dir, item.name), maxDepth, currentDepth + 1));
      } else if (item.name === 'lcov.info') {
        files.push(path.join(dir, item.name));
      }
    }
  } catch {
    // Ignore errors
  }
  return files;
}

function parseLcov(content: string): CoverageData {
  const files: Record<string, FileCoverage> = {};
  const lines = content.split('\n');

  let currentFile = '';
  let linesFound = 0;
  let linesHit = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('SF:')) {
      currentFile = trimmedLine.substring(3);
      linesFound = 0;
      linesHit = 0;
    } else if (trimmedLine.startsWith('LF:')) {
      linesFound = parseInt(trimmedLine.substring(3), 10);
    } else if (trimmedLine.startsWith('LH:')) {
      linesHit = parseInt(trimmedLine.substring(3), 10);
    } else if (trimmedLine === 'end_of_record') {
      if (currentFile && linesFound > 0) {
        // Normalize file path (make relative to repo root if possible)
        // This is tricky as LCOV often has absolute paths or paths relative to build dir
        // For now, we'll store as is and try to match later
        files[currentFile] = {
          coverage: (linesHit / linesFound) * 100,
          linesFound,
          linesHit,
        };
      }
      currentFile = '';
    }
  }

  // Calculate total coverage
  let totalLF = 0;
  let totalLH = 0;
  for (const file of Object.values(files)) {
    totalLF += file.linesFound;
    totalLH += file.linesHit;
  }

  return {
    totalCoverage: totalLF > 0 ? (totalLH / totalLF) * 100 : 0,
    files,
  };
}
