#!/bin/bash

# Script to package a Git repository for upload to Git Intelligence
# This script creates a ZIP file that:
# - Respects .gitignore (excludes ignored files)
# - Includes the .git folder (required for analysis)
# - Creates a clean archive ready for upload

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_info() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a Git repository. Please run this script from within a Git repository."
    exit 1
fi

# Get repository root and name
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
CURRENT_DIR=$(pwd)

# Change to repo root to ensure git commands work correctly
cd "$REPO_ROOT"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT  # Clean up on exit

print_info "Packaging repository: $REPO_NAME"
print_info "Repository root: $REPO_ROOT"
print_info "Temporary directory: $TEMP_DIR"

# Step 1: Use git archive to create a clean working tree (respects .gitignore)
print_info "Creating archive of working tree (respecting .gitignore)..."
ARCHIVE_FILE="$TEMP_DIR/working-tree.zip"
git archive -o "$ARCHIVE_FILE" HEAD

# Step 2: Extract the archive to temp directory
print_info "Extracting archive..."
WORKING_TREE_DIR="$TEMP_DIR/repo"
mkdir -p "$WORKING_TREE_DIR"
unzip -q "$ARCHIVE_FILE" -d "$WORKING_TREE_DIR"
rm "$ARCHIVE_FILE"

# Step 3: Copy .git folder (required for Git Intelligence analysis)
print_info "Copying .git folder..."
if [ -d ".git" ]; then
    cp -r ".git" "$WORKING_TREE_DIR/.git"
    print_success "✓ .git folder copied"
else
    print_error ".git folder not found!"
    exit 1
fi

# Step 4: Create final ZIP file
OUTPUT_FILE="${CURRENT_DIR}/${REPO_NAME}-packaged.zip"
print_info "Creating final ZIP file: $OUTPUT_FILE"

cd "$TEMP_DIR"
zip -r -q "$OUTPUT_FILE" repo
cd "$CURRENT_DIR"

# Get file size for display
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

print_success "✓ Repository packaged successfully!"
print_info "Output file: $OUTPUT_FILE"
print_info "File size: $FILE_SIZE"
print_info ""
print_info "You can now upload this file to Git Intelligence."

