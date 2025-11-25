# Repository Packaging Scripts

These scripts help you package a Git repository for upload to Git Intelligence. They create a ZIP file that:

- ✅ Respects `.gitignore` (excludes ignored files like `node_modules`, build artifacts, etc.)
- ✅ Includes the `.git` folder (required for Git Intelligence analysis)
- ✅ Creates a clean, ready-to-upload archive

## Available Scripts

### Option 1: Bash Script (Unix/Mac/Linux)

**Requirements:**

- Git installed
- `zip` and `unzip` commands available

**Usage:**

```bash
# From within your Git repository
./scripts/package-repo.sh

# Or from anywhere (specify the repo path)
cd /path/to/your/repo && ../../git-intelligence/scripts/package-repo.sh
```

/Users/ckaatz/development/git-intelligence/scripts/package-repo.sh

The script will create a ZIP file named `{repo-name}-packaged.zip` in the current directory.

### Option 2: Node.js Script (Cross-platform)

**Requirements:**

- Node.js installed
- Dependencies installed (run `npm install` in the project root)

**Usage:**

```bash
# From within your Git repository
node scripts/package-repo.js

# Or specify output path
node scripts/package-repo.js /path/to/output.zip
```

### Option 3: NPM Script (Recommended)

**Usage:**

```bash
# From the git-intelligence project root
npm run package-repo

# Or from within your repository (if you've added the script to your repo's package.json)
npm run package-repo
```

## How It Works

1. **Uses `git archive`**: Creates a clean archive of your working tree that automatically respects `.gitignore` patterns
2. **Extracts to temp directory**: Unpacks the archive to a temporary location
3. **Adds `.git` folder**: Copies the `.git` directory (required for Git Intelligence to analyze commit history)
4. **Creates final ZIP**: Packages everything into a single ZIP file ready for upload

## Why Not Just Zip the Whole Repo?

- **Respects `.gitignore`**: Automatically excludes files you don't want (like `node_modules/`, build artifacts, etc.)
- **Smaller file size**: Only includes tracked files, making uploads faster
- **Cleaner archives**: No need to manually exclude files

## Native Git Alternative

Git has a built-in `git archive` command, but it doesn't include the `.git` folder by default (which Git Intelligence needs). These scripts combine the best of both worlds:

```bash
# This would work but doesn't include .git folder:
git archive -o repo.zip HEAD

# Our scripts do this automatically:
# 1. git archive (respects .gitignore)
# 2. + .git folder
# = Ready for Git Intelligence
```

## Troubleshooting

**Error: "Not in a Git repository"**

- Make sure you're running the script from within a Git repository
- The script needs to be able to run `git` commands

**Error: "zip command not found" (Bash script)**

- Install `zip` utility: `brew install zip` (Mac) or `apt-get install zip` (Linux)

**Error: "Cannot find module 'adm-zip'" (Node.js script)**

- Run `npm install` in the git-intelligence project root
- Or install globally: `npm install -g adm-zip`
