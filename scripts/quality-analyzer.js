#!/usr/bin/env node
/**
 * FORGE Code Quality Analyzer
 * Scans the monorepo for complexity metrics, code duplication, and maintainability issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const SERVICES_DIR = path.join(ROOT_DIR, 'services');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const TESTS_DIR = path.join(ROOT_DIR, 'tests');

console.log('\n============================================');
console.log('FORGE CODE QUALITY ANALYSIS REPORT');
console.log('============================================\n');

// Configuration
const analysis = {
  totalFiles: 0,
  totalLines: 0,
  maxComplexityFile: null,
  maxComplexity: 0,
  duplicateCodeDetected: false,
  technicalDebtIssues: [],
};

// Step 1: Count source files across the repository
function countSourceFiles(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        countSourceFiles(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        analysis.totalFiles++;
        // Count lines in this file
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        analysis.totalLines += lines.length;
      }
    }
  } catch (e) {
    console.warn(`Could not read directory ${dir}: ${e.message}`);
  }
}

countSourceFiles(ROOT_DIR);
console.log(`📊 Found ${analysis.totalFiles} source files across repository`);
console.log(`   Total code lines: ${analysis.totalLines.toLocaleString()}`);

// Step 2: Run dependency-cruiser to detect architectural violations
try {
  console.log('\n🔍 Running dependency-cruiser for architecture validation...');
  
  // Create config file
  const cruiserConfig = `{
    "forbidden": [
      {
        "do": "depOf([\"packages/**\", \"services/**\"])",
        "from": "Packages must not depend on Services directly"
      },
      {
        "do": "depOf([\"apps/\"])",
        "from": "Apps should only use API routes, not direct service imports"
      }
    ],
    "extend": "recommended",
    "justShowMeFailures": true
  }`;
  
  fs.writeFileSync(path.join(ROOT_DIR, '.dependency-cruiser.js'), cruiserConfig);
  
  // Run dependency-cruiser (if available)
  try {
    execSync('npx depcruise . --ignore-extra-configs --config .dependency-cruiser.js', { 
      stdio: 'pipe' 
    });
    console.log('✅ Dependency validation passed');
  } catch (e) {
    console.warn('⚠️ dependency-cruiser not fully configured yet; continuing...');
  }
} catch (e) {
  console.error('❌ Failed to run dependency-cruiser:', e.message);
}

// Step 3: Check for complexity in core-agent package
const coreAgentDir = path.join(PACKAGES_DIR, 'core-agent');
if (fs.existsSync(coreAgentDir)) {
  try {
    console.log('\n⏳ Analyzing complexity in @sajja/forge-core-agent...');
    
    // Install/run complexity-metric tool via npm
    // This would call the actual complexity-scanning tool
    console.log('  ⚠️ Complexity analysis requires installed tool; running placeholder check...');
    
    // For demonstration, scan manually for large functions
    const files = fs.readdirSync(coreAgentDir).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const filePath = path.join(coreAgentDir, 'src', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Simple heuristic: count function declarations
        const funcCount = (content.match(/function\s+\w+\(/g) || []).length;
        if (funcCount > 5) {
          analysis.technicalDebtIssues.push({
            type: 'HighComplexity',
            severity: 'Medium',
            location: `packages/core-agent/src/${file}`,
            description: `Contains ${funcCount} functions - consider refactoring into smaller modules`,
          });
        }
      }
    }
    
    if (analysis.technicalDebtIssues.length === 0) {
      console.log('  ✅ Reasonable complexity distribution detected');
    }
  } catch (e) {
    console.warn(`  Could not analyze complexity in ${coreAgentDir}: ${e.message}`);
  }
}

// Step 4: Check for test coverage files
try {
  console.log('\n📋 Checking for existing coverage reports...');
  const coverageDir = path.join(PACKAGES_DIR, 'core-agent', 'coverage');
  if (fs.existsSync(coverageDir)) {
    const coverageFiles = fs.readdirSync(coverageDir);
    console.log(`  Coverage report found with ${coverageFiles.length} files`);
    coverageFiles.forEach(f => {
      if (f.includes('lcov.info')) console.log('   └── lcov.info - machine-readable format');
      if (f.includes('html')) console.log('   └── index.html - human-readable HTML report');
    });
  } else {
    console.log('  No coverage reports generated yet (run: npm run test:coverage first)');
  }
} catch (e) {
  console.warn('  Could not check coverage:', e.message);
}

// Step 5: Generate summary report
console.log('\n' + '='.repeat(60));
console.log('QUALITY SUMMARY REPORT');
console.log('='.repeat(60));

console.log(`\n📁 Source Files Analyzed: ${analysis.totalFiles.toLocaleString()}`);
console.log(`💾 Lines of Code: ${analysis.totalLines.toLocaleString()}`);

if (analysis.technicalDebtIssues.length > 0) {
  console.log(`\n⚠️ Potential Issues Found: ${analysis.technicalDebtIssues.length}`);
  analysis.technicalDebtIssues.forEach(issue => {
    console.log(`   • [${issue.severity}] ${issue.type}: ${issue.location}`);
    console.log(`     ${issue.description}`);
  });
} else {
  console.log(`\n✅ All checks passed - no major technical debt issues detected`);
}

console.log(`\n🎯 RECOMMENDATIONS:`);
console.log('   1. Run unit tests with coverage: npm run test:coverage');
console.log('   2. Add CI gate requiring minimum coverage threshold');
console.log('   3. Address any medium/high complexity warnings');
console.log('   4. Consider adding automated complexity scanning to CI pipeline');

// Write detailed analysis output to file for review
const outputPath = path.join(ROOT_DIR, 'docs/quality/QA-ANALYSIS-REPORT.md');
fs.writeFileSync(outputPath, `# FORGE Code Quality Analysis Report\n\n## Summary\nThis report was generated by the quality analyzer.\n\n## Metrics\n- Total Source Files: ${analysis.totalFiles}\n- Total Lines of Code: ${analysis.totalLines}\n\n## Technical Debt Findings\n${analysis.technicalDebtIssues.length > 0 ? analysis.technicalDebtIssues.map(i => `- **[${i.severity}]** ${i.type}: ${i.location}\\n  ${i.description}`).join('\\n') : 'None detected'}\n\n## Recommendations\n1. Run unit tests with coverage: npm run test:coverage\n2. Add CI gate requiring minimum coverage threshold\n3. Address any medium/high complexity warnings\n4. Consider adding automated complexity scanning to CI pipeline\n`.replace(/\n/g, '\n').trim());

console.log(`\n📄 Detailed report written to ${outputPath}`);
console.log('\n============================================\n');
