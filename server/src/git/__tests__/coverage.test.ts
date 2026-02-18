import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getCoverageData } from '../coverage';

const tempDirs: string[] = [];

function createTempRepo(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-intelligence-coverage-'));
  tempDirs.push(tempDir);
  return tempDir;
}

function writeFile(repoPath: string, relativePath: string, content: string): void {
  const fullPath = path.join(repoPath, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('coverage parser', () => {
  it('parses LCOV from common coverage path', async () => {
    const repoPath = createTempRepo();
    writeFile(
      repoPath,
      'coverage/lcov.info',
      [
        'TN:',
        'SF:src/index.ts',
        'LF:10',
        'LH:8',
        'end_of_record',
        'SF:src/util.ts',
        'LF:20',
        'LH:10',
        'end_of_record',
        '',
      ].join('\n')
    );

    const coverage = await getCoverageData(repoPath);

    expect(coverage).not.toBeNull();
    expect(coverage?.totalCoverage).toBeCloseTo(60);
    expect(coverage?.files['src/index.ts']).toEqual({ coverage: 80, linesFound: 10, linesHit: 8 });
    expect(coverage?.files['src/util.ts']).toEqual({ coverage: 50, linesFound: 20, linesHit: 10 });
  });

  it('parses JaCoCo XML from common Gradle path', async () => {
    const repoPath = createTempRepo();
    writeFile(
      repoPath,
      'build/reports/jacoco/test/jacocoTestReport.xml',
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<report name="example">',
        '  <package name="com/example">',
        '    <sourcefile name="Service.java">',
        '      <counter type="LINE" missed="5" covered="15"/>',
        '    </sourcefile>',
        '  </package>',
        '</report>',
        '',
      ].join('\n')
    );

    const coverage = await getCoverageData(repoPath);

    expect(coverage).not.toBeNull();
    expect(coverage?.totalCoverage).toBeCloseTo(75);
    expect(coverage?.files['com/example/Service.java']).toEqual({
      coverage: 75,
      linesFound: 20,
      linesHit: 15,
    });
  });

  it('finds JaCoCo XML via recursive search when no common path exists', async () => {
    const repoPath = createTempRepo();
    writeFile(
      repoPath,
      'module-a/custom-reports/jacoco/jacoco.xml',
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<report name="example">',
        '  <package name="">',
        '    <sourcefile name="Main.java">',
        '      <line nr="1" mi="0" ci="1" mb="0" cb="0"/>',
        '      <line nr="2" mi="1" ci="0" mb="0" cb="0"/>',
        '    </sourcefile>',
        '  </package>',
        '</report>',
        '',
      ].join('\n')
    );

    const coverage = await getCoverageData(repoPath);

    expect(coverage).not.toBeNull();
    expect(coverage?.totalCoverage).toBeCloseTo(50);
    expect(coverage?.files['Main.java']).toEqual({ coverage: 50, linesFound: 2, linesHit: 1 });
  });

  it('prefers LCOV when both LCOV and JaCoCo reports exist', async () => {
    const repoPath = createTempRepo();
    writeFile(
      repoPath,
      'coverage/lcov.info',
      ['TN:', 'SF:src/index.ts', 'LF:10', 'LH:10', 'end_of_record', ''].join('\n')
    );
    writeFile(
      repoPath,
      'target/site/jacoco/jacoco.xml',
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<report name="example">',
        '  <package name="com/example">',
        '    <sourcefile name="Service.java">',
        '      <counter type="LINE" missed="100" covered="0"/>',
        '    </sourcefile>',
        '  </package>',
        '</report>',
        '',
      ].join('\n')
    );

    const coverage = await getCoverageData(repoPath);

    expect(coverage).not.toBeNull();
    expect(coverage?.files['src/index.ts']).toBeDefined();
    expect(coverage?.files['com/example/Service.java']).toBeUndefined();
    expect(coverage?.totalCoverage).toBe(100);
  });
});
