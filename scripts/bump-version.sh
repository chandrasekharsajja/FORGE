#!/bin/bash
# Bump version numbers in FORGE monorepo based on semantic versioning principles
# Usage: ./bump-version.sh [minor|patch]

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <major|minor|patch>"
  exit 1
fi

TYPE="$1"

# Read current version from root package.json
CURRENT_VERSION=$(cat package.json | grep '"version"' | cut -d'"' -f3)
echo "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -ra VER_COMPONENTS <<< "$CURRENT_VERSION"
MAJOR=${VER_COMPONENTS[0]}
MINOR=${VER_COMPONENTS[1]}
PATCH=${VER_COMPONENTS[2]}

case "$TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Error: Invalid type '$TYPE'. Use 'major', 'minor', or 'patch'."
    exit 1
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Update root package.json
echo "Updating root package.json version to ${NEW_VERSION}..."
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" package.json

# Look for packages with versions (optional - could iterate through all packages)
# For simplicity, we'll just update any package.json in packages/ that has a version field found during release

echo "Generated new version: $NEW_VERSION"
echo "Commit this change with: git add package.json && git commit -v 'chore: bump to v${NEW_VERSION}'"