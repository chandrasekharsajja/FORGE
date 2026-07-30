const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

try {
  // Get commit messages from since last tag or all commits if no tag
  let commits = [];
  
  // Try to get latest tag (simplified sorting)
  const tagsOutput = execSync('git tag --list', { encoding: 'utf8' }).trim().split('\n').filter(t => t.length > 0);
  let latestTag = null;
  if (tagsOutput.length > 0) {
    // Sort by version roughly - take non-rc tags first, then rc tags
    const sortedTags = tagsOutput.sort((a, b) => {
      const aIsRC = a.includes('-rc');
      const bIsRC = b.includes('-rc');
      if (aIsRC && !bIsRC) return 1;
      if (!aIsRC && bIsRC) return -1;
      return b.localeCompare(a);
    });
    latestTag = sortedTags[0];
  }

  if (latestTag) {
    console.log(`Using last tag: ${latestTag}`);
    commits = execSync(`git log --oneline ${latestTag}..HEAD`, { encoding: 'utf8' })
      .trim().split('\n')
      .filter(c => c.trim());
  } else {
    console.log('No tags found, using all commits');
    commits = execSync('git log --oneline --no-merges', { encoding: 'utf8' })
      .trim().split('\n')
      .filter(c => c.trim());
  }

  console.log(`Found ${commits.length} new commits`);

  // Parse commits into types
  const typeGroups = {};
  
  commits.forEach(commit => {
    const match = commit.match(/([a-f0-9]{7})\s(.+)/);
    if (match) {
      const shortHash = match[1];
      const message = match[2];
      
      // Try to identify type from conventional format
      let type = 'other';
      const patterns = [
        { regex: /^feat\((.+)\):\s*/, type: 'feat' },
        { regex: /^fix\((.+)\):\s*/, type: 'fix' },
        { regex: /^perf\((.+)\):\s*/, type: 'perf' },
        { regex: /^docs\((.+)\):\s*/, type: 'docs' },
        { regex: /^style\((.+)\):\s*/, type: 'style' },
        { regex: /^refactor\((.+)\):\s*/, type: 'refactor' },
        { regex: /^test\((.+)\):\s*/, type: 'test' },
        { regex: /^chore\((.+)\):\s*/, type: 'chore' },
        { regex: /^build\((.+)\):\s*/, type: 'build' },
        { regex: /^ci\((.+)\):\s*/, type: 'ci' },
        { regex: /^revert\((.+)\):\s*/, type: 'revert' },
      ];
      
      for (const pattern of patterns) {
        if (pattern.regex.test(message)) {
          type = pattern.type;
          break;
        }
      }
      
      // Fallback to simple prefix checks if pattern matching failed
      if (type === 'other') {
        if (message.startsWith('feat(')) type = 'feat';
        else if (message.startsWith('fix(')) type = 'fix';
        else if (message.startsWith('perf(')) type = 'perf';
        else if (message.startsWith('docs(')) type = 'docs';
        else if (message.startsWith('style(')) type = 'style';
        else if (message.startsWith('refactor(')) type = 'refactor';
        else if (message.startsWith('test(')) type = 'test';
        else if (message.startsWith('chore(')) type = 'chore';
        else if (message.startsWith('build(')) type = 'build';
        else if (message.startsWith('ci(')) type = 'ci';
        else if (message.startsWith('revert(')) type = 'revert';
        else {
          // Check for simple type at start (without scope)
          const simpleMatch = message.match(/^(feat|fix|perf|docs|style|refactor|test|chore|build|ci|revert)(?:\(|:)/);
          if (simpleMatch) type = simpleMatch[1];
        }
      }
      
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push({ hash: shortHash, desc: message });
    }
  });

  // Build new changelog content - just the unreleased section
  const typeLabels = {
    feat: '### New Features',
    fix: '### Bug Fixes',
    perf: '### Performance Improvements',
    docs: '### Documentation',
    style: '### Style Changes',
    refactor: '### Refactoring',
    test: '### Testing Additions',
    chore: '### Maintenance',
    build: '### Build Process Updates',
    ci: '### CI/CD Pipeline Changes',
    revert: '### Reverted Changes',
    other: '### Other Changes'
  };

  let unreleasedContent = '\n\n## Unreleased (in progress)\n\n';
  const orderedTypes = ['feat', 'fix', 'perf', 'docs', 'style', 'refactor', 'test', 'chore', 'build', 'ci', 'revert', 'other'];
  
  orderedTypes.forEach(type => {
    if (typeGroups[type]) {
      unreleasedContent += `${typeLabels[type]}\n\n`;
      typeGroups[type].forEach(item => {
        unreleasedContent += `- ${item.desc} (**${item.hash})\n`;
      });
      unreleasedContent += '\n';
    }
  });

  // Read existing changelog and merge unreleased section
  let existingContent = '';
  try {
    existingContent = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    
    // Find where to insert - look for existing "Unreleased" heading
    const unreleasedIndex = existingContent.search(/^## Unreleased/mi);
    
    if (unreleasedIndex > -1) {
      // Replace existing unreleased section with new one
      const nextSectionStart = existingContent.search(/^\## /mi, unreleasedIndex + 1);
      if (nextSectionStart > -1) {
        existingContent = existingContent.substring(0, unreleasedIndex) + unreleasedContent + existingContent.substring(nextSectionStart);
      } else {
        existingContent = existingContent.substring(0, unreleasedIndex) + unreleasedContent;
      }
    } else {
      // No unreleased section found - append at end after main content
      // Try to find a good insertion point before license/footer
      const footerMatch = existingContent.search(/\n## Licensed/mi) || existingContent.search(/\n\n$/m);
      const insertPos = footerMatch > -1 ? footerMatch : existingContent.length;
      existingContent = existingContent.substring(0, insertPos) + unreleasedContent + existingContent.substring(insertPos);
    }
  } catch (e) {
    console.log('Creating fresh changelog:');
    existingContent = `# FORGE ChangeLog\n\nAll notable changes to the FORGE AI Engineering Operating System will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n---` + unreleasedContent;
  }

  fs.writeFileSync(CHANGELOG_PATH, existingContent);
  console.log('✅ CHANGELOG updated successfully! Categories:', Object.keys(typeGroups).join(', '));
  
} catch (error) {
  console.error('Error generating changelog:', error.message);
  // Keep existing file if error
}
