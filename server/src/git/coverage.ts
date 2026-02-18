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
 * Supported formats: LCOV (lcov.info), JaCoCo XML (jacoco.xml)
 */
export async function getCoverageData(repoPath: string): Promise<CoverageData | null> {
  const commonLcovPaths = [
    'coverage/lcov.info',
    'server/coverage/lcov.info',
    'client/coverage/lcov.info',
    'reports/lcov.info',
  ];
  const commonJacocoPaths = [
    'target/site/jacoco/jacoco.xml',
    'build/reports/jacoco/test/jacocoTestReport.xml',
    'build/reports/jacoco/test/jacoco.xml',
    'reports/jacoco/jacoco.xml',
    'coverage/jacoco.xml',
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

  for (const jacocoRelPath of commonJacocoPaths) {
    const jacocoPath = path.join(repoPath, jacocoRelPath);
    if (fs.existsSync(jacocoPath)) {
      try {
        const content = fs.readFileSync(jacocoPath, 'utf-8');
        return parseJacoco(content);
      } catch (error) {
        console.warn(`Failed to parse JaCoCo file at ${jacocoPath}:`, error);
      }
    }
  }

  // If no common paths found, do a quick search (limit depth to avoid performance issues)
  try {
    const lcovFiles = findFiles(repoPath, 3, new Set(['lcov.info']));
    if (lcovFiles.length > 0) {
      const content = fs.readFileSync(lcovFiles[0], 'utf-8');
      return parseLcov(content);
    }

    const jacocoFiles = findFiles(repoPath, 4, new Set(['jacoco.xml', 'jacocoTestReport.xml']));
    if (jacocoFiles.length > 0) {
      const content = fs.readFileSync(jacocoFiles[0], 'utf-8');
      return parseJacoco(content);
    }
  } catch (error) {
    console.warn(`Error searching for coverage files in ${repoPath}:`, error);
  }

  return null;
}

function findFiles(
  dir: string,
  maxDepth: number,
  targetFileNames: Set<string>,
  currentDepth: number = 0
): string[] {
  if (currentDepth > maxDepth) return [];
  const files: string[] = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === '.git') continue;
        files.push(
          ...findFiles(path.join(dir, item.name), maxDepth, targetFileNames, currentDepth + 1)
        );
      } else if (targetFileNames.has(item.name)) {
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

function parseJacoco(content: string): CoverageData {
  const files: Record<string, FileCoverage> = {};

  const packageRegex = /<package\b[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/package>/g;
  let packageMatch: RegExpExecArray | null;

  while ((packageMatch = packageRegex.exec(content)) !== null) {
    const packageName = packageMatch[1];
    const packageBody = packageMatch[2];

    const sourceFileRegex = /<sourcefile\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/sourcefile>/g;
    let sourceFileMatch: RegExpExecArray | null;

    while ((sourceFileMatch = sourceFileRegex.exec(packageBody)) !== null) {
      const sourceFileName = sourceFileMatch[1];
      const sourceFileBody = sourceFileMatch[2];
      const filePath = normalizeCoveragePath(
        packageName ? `${packageName}/${sourceFileName}` : sourceFileName
      );

      const lineCounterTag = sourceFileBody.match(/<counter\b[^>]*\btype="LINE"[^>]*\/?>/);

      let linesFound = 0;
      let linesHit = 0;

      if (lineCounterTag) {
        const missed = Number.parseInt(getXmlAttribute(lineCounterTag[0], 'missed') ?? '0', 10);
        const covered = Number.parseInt(getXmlAttribute(lineCounterTag[0], 'covered') ?? '0', 10);
        linesFound = missed + covered;
        linesHit = covered;
      } else {
        const lineEntries = sourceFileBody.match(/<line\b[^>]*\/?>/g) || [];
        linesFound = lineEntries.length;
        linesHit = lineEntries.reduce((coveredLines, lineTag) => {
          const instructionCovered = Number.parseInt(getXmlAttribute(lineTag, 'ci') ?? '0', 10);
          const branchCovered = Number.parseInt(getXmlAttribute(lineTag, 'cb') ?? '0', 10);
          return coveredLines + (instructionCovered > 0 || branchCovered > 0 ? 1 : 0);
        }, 0);
      }

      if (linesFound > 0) {
        const existing = files[filePath];
        if (existing) {
          const totalFound = existing.linesFound + linesFound;
          const totalHit = existing.linesHit + linesHit;
          files[filePath] = {
            coverage: (totalHit / totalFound) * 100,
            linesFound: totalFound,
            linesHit: totalHit,
          };
        } else {
          files[filePath] = {
            coverage: (linesHit / linesFound) * 100,
            linesFound,
            linesHit,
          };
        }
      }
    }
  }

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

function getXmlAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function normalizeCoveragePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
}
