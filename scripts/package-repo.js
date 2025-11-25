#!/usr/bin/env node

/**
 * Script to package a Git repository for upload to Git Intelligence
 * This script creates a ZIP file that:
 * - Respects .gitignore (excludes ignored files)
 * - Includes the .git folder (required for analysis)
 * - Creates a clean archive ready for upload
 *
 * Usage: node scripts/package-repo.js [output-path]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Try to load adm-zip from server node_modules, fallback to global or local
let AdmZip;
try {
  // Try server's node_modules first (since adm-zip is installed there)
  const serverNodeModules = path.join(__dirname, '..', 'server', 'node_modules', 'adm-zip');
  if (fs.existsSync(serverNodeModules)) {
    AdmZip = require(serverNodeModules);
  } else {
    AdmZip = require('adm-zip');
  }
} catch (e) {
  console.error('Error: adm-zip not found. Please run "npm install" in the server directory.');
  process.exit(1);
}

const exec = promisify(require('child_process').exec);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`Error: ${message}`, 'red');
  process.exit(1);
}

async function main() {
  try {
    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch (e) {
      error('Not in a Git repository. Please run this script from within a Git repository.');
    }

    // Get repository root and name
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    const repoName = path.basename(repoRoot);
    const currentDir = process.cwd();

    // Get output path (optional argument or default)
    const outputPath = process.argv[2]
      ? path.resolve(process.argv[2])
      : path.join(currentDir, `${repoName}-packaged.zip`);

    log(`Packaging repository: ${repoName}`, 'yellow');
    log(`Repository root: ${repoRoot}`, 'yellow');
    log(`Output file: ${outputPath}`, 'yellow');

    // Create temporary directory
    const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'git-intel-'));
    const workingTreeDir = path.join(tempDir, 'repo');

    try {
      // Step 1: Use git archive to create a clean working tree (respects .gitignore)
      log('Creating archive of working tree (respecting .gitignore)...', 'yellow');
      const archiveFile = path.join(tempDir, 'working-tree.zip');

      process.chdir(repoRoot);
      execSync(`git archive -o "${archiveFile}" HEAD`, { stdio: 'inherit' });

      // Step 2: Extract the archive
      log('Extracting archive...', 'yellow');
      fs.mkdirSync(workingTreeDir, { recursive: true });
      const zip = new AdmZip(archiveFile);
      zip.extractAllTo(workingTreeDir, true);

      // Step 3: Copy .git folder (required for Git Intelligence analysis)
      log('Copying .git folder...', 'yellow');
      const gitDir = path.join(repoRoot, '.git');
      if (!fs.existsSync(gitDir)) {
        error('.git folder not found!');
      }

      // Copy .git folder recursively
      const destGitDir = path.join(workingTreeDir, '.git');
      copyRecursiveSync(gitDir, destGitDir);
      log('✓ .git folder copied', 'green');

      // Step 4: Create final ZIP file
      log('Creating final ZIP file...', 'yellow');
      const finalZip = new AdmZip();
      // Add all files from the working tree directory
      finalZip.addLocalFolder(workingTreeDir, '');
      finalZip.writeZip(outputPath);

      // Get file size
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      log('✓ Repository packaged successfully!', 'green');
      log(`Output file: ${outputPath}`, 'yellow');
      log(`File size: ${fileSizeMB} MB`, 'yellow');
      log('', 'yellow');
      log('You can now upload this file to Git Intelligence.', 'yellow');

    } finally {
      // Clean up temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      process.chdir(currentDir);
    }

  } catch (err) {
    error(err.message);
  }
}

// Helper function to copy directory recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}


// Run the script
main().catch((err) => {
  error(err.message);
});

