#!/usr/bin/env node
/**
 * Pre-commit security hook - scans staged files for secrets, credentials, and sensitive patterns.
 * This prevents accidental commit of API keys, passwords, tokens, etc.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const STAGED_FILES_PATH = '/tmp/staged-files.txt';

// Define regex patterns to detect sensitive information
const SECRET_PATTERNS = [
  // API keys and tokens
  /api[_-]?key\s*[:=]\s*[\'"]?[a-zA-Z0-9]{32,}/i,
  /secret\s*[:=]\s*[\'"]?[a-zA-Z0-9]{16,}/i,
  /token\s*[:=]\s*[\'"]?[a-zA-Z0-9]{32,}/i,
  /^[\w\d]{40,}:\w{32,}$/i, // Common format pattern
  
  // Password patterns (detect if in plain text)
  /password\s*[:=]\s*[\'"]?[^\s]+['"]?/i,
  /passwd\s*[:=]\s*[\'"]?[^\s]+['"]?/i,
  
  // Database connection strings
  /postgres?:\/\/[^@]+:[^@]+@/,
  mysql?:\/\/[^@]+:[^@]+@/,
  
  // JWT patterns
  /eyJ[\w-]+\.[\w-]+\.[\w-]+$/,
  
  // AWS/GCP/Azure specific patterns
  /AWS[-_]SECRET[_-]ACCESS[_-]KEY/,
  /google_credentials\.json/i,
  /client_secret\.json/i,
  
  // Known sensitive filenames
  /\.env$/,
  /config[-_.]?(local|dev|staging|prod)\.yml?$/,
  /credentials[-_.]json$/,
];

// File extensions that should NEVER contain secrets
const DANGEROUS_EXTENSIONS = ['.env', '.env.local', '.env.development', '.env.production', '.secrets.json'];

/** Get list of staged files from git */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { 
      encoding: 'utf8',
      cwd: ROOT_DIR
    }).trim();
    
    if (!output) return [];
    
    return output.split('\n').filter(f => f.trim().length > 0);
  } catch (err) {
    console.error('Error getting staged files:', err.message);
    return [];
  }
}

/** Check if a file content contains any secret patterns */
function hasSecrets(content: string): { found: boolean; patterns: string[] } {
  const foundPatterns: string[] = [];
  
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      foundPatterns.push(pattern.toString());
    }
  }
  
  return { found: foundPatterns.length > 0, patterns: foundPatterns };
}

/** Check if a dangerous filename is staged */
function checkDangerousFilenames(stagedFiles: string[]): { found: boolean; files: string[] } {
  const badFiles = stagedFiles.filter(file => 
    DANGEROUS_EXTENSIONS.some(ext => file.toLowerCase().endsWith(ext.toLowerCase()))
  );
  
  return { found: badFiles.length > 0, files: badFiles };
}

/** Main validation function */
function main(): boolean {
  console.log('🔒 Running pre-commit security check...');
  
  // Get staged files
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log('  ✓ No changes detected, skipping security scan');
    return true;
  }
  
  // Track all violations
  const violations = [];
  
  // Check for dangerous file types
  const dangerousCheck = checkDangerousFilenames(stagedFiles);
  if (dangerousCheck.found) {
    violations.push({
      type: 'Dangerous Filename',
      message: `Found ${dangerousCheck.files.length} file(s) with potentially dangerous names:`,
      files: dangerousCheck.files,
    });
  }
  
  // Scan content of staged files
  for (const file of stagedFiles) {
    const filePath = path.join(ROOT_DIR, file);
    
    // Skip binary files
    if (!isTextFile(filePath)) continue;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Limit scan size to prevent memory issues on very large files
      if (content.length > 50000) {
        console.warn(`  ⚠️ Skipping large file ${file} (${Math.round(content.length / 1024)}KB)`);
        continue;
      }
      
      const { found, patterns } = hasSecrets(content);
      if (found) {
        violations.push({
          type: 'Sensitive Pattern Detected',
          message: `Potential secrets found in ${file}:`,
          file: file,
          patterns: patterns,
        });
      }
    } catch (err) {
      console.error(`  ❌ Error reading file ${file}:`, err.message);
    }
  }
  
  // Report violations
  if (violations.length > 0) {
    console.error('\n🛑 Security Violations Found!\n');
    
    violations.forEach(violation => {
      console.error(`  [${violation.type}]`);
      console.error(`    ${violation.message}`);
      if (violation.files) violation.files.forEach(f => console.error(`      - ${f}`));
      if (violation.file) console.error(`      File: ${violation.file}`);
      if (violation.patterns) violation.patterns.forEach(p => console.error(`      Pattern: ${p}`));
      console.error('');
    });
    
    console.error('  ✗ Commit aborted due to security violations.');
    console.error('  ✓ Please remove sensitive data before committing.');
    console.error('  ✓ Consider using environment variables or secret management tools instead.');
    
    return false;
  }
  
  console.log('  ✓ Security check passed - no sensitive data detected');
  return true;
}

/** Simple heuristic to check if file is likely text */
function isTextFile(filepath: string): boolean {
  try {
    const buffer = fs.readFileSync(filepath, { length: 1024 });
    // Check for null bytes which indicate binary
    return !buffer.includes(0x00);
  } catch {
    return false;
  }
}

// Execute the check
try {
  const success = main();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('Security check failed unexpectedly:', error);
  process.exit(1);
}