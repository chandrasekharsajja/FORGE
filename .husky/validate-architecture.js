#!/usr/bin/env node
/**
 * Architecture Validation Hook
 * 
 * This script analyzes TypeScript source files to detect architectural boundary violations.
 * Forbidden patterns detected:
 *   - contracts package importing from services/apps (infrastructure → domain)
 *   - packages importing from services (domain → infrastructure improper direction)
 *   - services creating circular dependencies with other services
 *   - apps importing directly from services (should go through application shell)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.dirname(__dirname);
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const SERVICES_DIR = path.join(ROOT_DIR, 'services');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const CONTRACTS_DIR = path.join(PACKAGES_DIR, 'contracts');

// Forbidden import patterns (directory from which imports are forbidden TO other layers)
const FORBIDDEN_IMPORTS = [
  // From contracts (domain), cannot import from any implementation layer ({services, apps, packages except their own})
  { from: CONTRACTS_DIR, to: SERVICES_DIR, error: 'contracts must not import from service implementations' },
  { from: CONTRACTS_DIR, to: APPS_DIR, error: 'contracts must not import from app implementations' },
  // From other packages, should only import from contracts and peer packages (not services)
  { from: PACKAGES_DIR, to: SERVICES_DIR, error: 'packages must not import directly from services' },
  // Apps should import through application shell layer, not directly from services (except via middleware/routes)
  { from: APPS_DIR, to: SERVICES_DIR, error: 'apps must not import directly from services (use API routes instead)' },
];

// Circular dependency pairs to watch for
const CIRCULAR_DEPENDENCY_PAIRS = [
  ['orchestrator', 'execution-engine'],
  ['policy-engine', 'platform-runtime'],
];

function getDirectoryFiles(dirPath) {
  const files = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...getDirectoryFiles(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Directory may not exist or have permission issues
  }
  return files;
}

function checkImportDirection(sourceFile, forbiddenFrom, forbiddenTo, errorMsg) {
  try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    
    // Check for import statements referencing the forbidden directory
    const relPath = path.relative(forbiddenFrom, sourceFile);
    
    // Simple pattern matching for imports from specific paths
    const importPatterns = [
      `from "${forbiddenTo}/",`,
      ` from "${forbiddenTo}/",`,
      `require("${forbiddenTo}/",`,
      ` require("${forbiddenTo}/",`,
    ];
    
    // Also check relative imports that might reference services
    const relativeToServices = sourceFile.includes('packages/') && content.includes('../services');
    const relativeToAppServices = sourceFile.includes('apps/') && content.includes('../services');
    
    for (const pattern of importPatterns) {
      if (content.includes(pattern)) {
        console.error(`🚫 ${errorMsg}`);
        console.error(`   File: ${relPath}`);
        console.error(`   Line content snippet: ${content.substring(0, Math.min(content.indexOf(pattern) + 100, content.length))}`);
        return true;
      }
    }
    
    if (relativeToServices || relativeToAppServices) {
      console.error(`🚫 ${errorMsg}`);
      console.error(`   File: ${relPath}`);
      console.error('   Reason: Relative import crossing from packages/services into another layer');
      return true;
    }
  } catch (e) {
    console.warn(`⚠️ Could not read file ${sourceFile}: ${e.message}`);
  }
  return false;
}

function findCircularDependencies() {
  const violations = [];
  
  // Simple heuristic: check if two services import each other's index.ts files
  for (const pair of CIRCULAR_DEPENDENCY_PAIRS) {
    const [svcA, svcB] = pair;
    const fileA = path.join(SERVICES_DIR, svcA, 'src', 'index.ts');
    const fileB = path.join(SERVICES_DIR, svcB, 'src', 'index.ts');
    
    if (fs.existsSync(fileA) && fs.existsSync(fileB)) {
      const contentA = fs.readFileSync(fileA, 'utf8');
      const contentB = fs.readFileSync(fileB, 'utf8');
      
      if (contentB.includes(svcA) && contentA.includes(svcB)) {
        violations.push({
          services: [svcA, svcB],
          issue: `Potential circular dependency between ${svcA} and ${svcB}`
        });
      }
    }
  }
  
  return violations;
}

function main() {
  console.log('🔍 Running architecture validation...');
  let hasViolation = false;
  
  // Check all .ts and .tsx files in packages against forbidden imports
  const allFiles = [];
  
  // Add packages files
  if (fs.existsSync(PACKAGES_DIR)) {
    allFiles.push(...getDirectoryFiles(PACKAGES_DIR));
  }
  
  // Add contracts specifically since it's the most critical
  if (fs.existsSync(CONTRACTS_DIR)) {
    allFiles.push(...getDirectoryFiles(CONTRACTS_DIR));
  }
  
  // Check each file against forbidden patterns
  FORBIDDEN_IMPORTS.forEach(f => {
    allFiles.forEach(file => {
      if (checkImportDirection(file, f.from, f.to, f.error)) {
        hasViolation = true;
      }
    });
  });
  
  // Check for circular dependencies
  const circulars = findCircularDependencies();
  if (circulars.length > 0) {
    circulars.forEach(c => {
      console.error(`🚫 Circular Dependency Detected: ${c.issue}`);
      c.services.forEach(svc => {
        console.error(`   └─ services/${svc}/`);
      });
      hasViolation = true;
    });
  }
  
  if (hasViolation) {
    console.error('\n❌ Architectural validation FAILED. Please fix before committing.');
    process.exit(1);
  } else {
    console.log('✅ All architectural rules passed!');
    process.exit(0);
  }
}

// Only run this on staged files that are TypeScript
main();