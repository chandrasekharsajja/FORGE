#!/bin/bash
# FORGE Release Preparation Script
# Automates version bumping and changelog generation before release

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

echo "========================================"
echo "FORGE Release Preparation Tool"
echo "========================================"
echo ""

# Check git status
echo "🔍 Checking Git status..."
git status --short || echo "Warning: Git status unavailable"
echo ""

# Step 1: Generate changelog with unreleased commits
echo "📝 Generating changelog from unreleased commits..."
if command -v node &>/dev/null; then
    /opt/homebrew/bin/node scripts/generate-changelog.js 2>&1 | grep -E "✅|Found|Error" || true
    echo "Changelog generated."
else
    echo "⚠️ Node not found, skipping auto-changelog generation."
    echo "Please run: npm run generate-changelog manually"
fi
echo ""

# Step 2: View the changelog changes
echo "📋 Reviewing changelog changes:"
git diff CHANGELOG.md 2>/dev/null || echo "No local changes to compare"
echo ""

# Instructions for the user
echo "========================================"
echo "Next Steps:"
echo "1. Review the changes to CHANGELOG.md above"
echo "2. If satisfied, commit the changes:"
echo "   git add CHANGELOG.md"
echo "   git commit -m 'docs: update changelog for upcoming release'"
echo ""
echo "3. Then bump the version:"
echo "   ./scripts/bump-version.sh [minor|patch|major]"
echo ""
echo "4. After version bump, review and finalize:"
echo "   git diff"
echo "   git commit -v 'chore: bump to vX.Y.Z'"
echo ""
echo "5. Tag the release:"
echo "   git tag -a vX.Y.Z -m 'FORGE vY.Z.Z Release'"
echo "   git push origin main --tag"
echo "========================================"
