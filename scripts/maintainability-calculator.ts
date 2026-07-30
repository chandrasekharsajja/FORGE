#!/usr/bin/env node
/**
 * FORGE Maintainability Index Calculator
 * Calculates CIQ (Complexity-Information Quality) and Maintainability Index
 * for all TypeScript source files in the repository.
 * 
 * Based on NASA Maintainability Index formula:
 * MI = 171 - 5.2 * (AVG_VLOC) - 0.23 * (AVG_GM) - 16.2 * (AVG_LCOM)
 * Where VLOC = Lines of Code, GM = Cyclomatic Complexity, LCOM = Lack of Cohesion
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const SERVICES_DIR = path.join(ROOT_DIR, 'services');

// Statistics collection
const fileStats = new Map<string, { vloc: number; cyclomatic: number; cohesion: number }>();

/**
 * Calculate basic cyclomatic complexity (McCabe's method) - simplified approach
 * Counts decision points (if, while, for, switch, catch, &&, ||, ? :)
 * Note: This is a lightweight approximation using string pattern matching.
 * For production use, integrate with full AST parser like esprima or babel.
 */
function calculateCyclomaticComplexity(sourceCode: string): number {
  let complexity = 1; // Base level
  
  // Count decision points
  const patterns = [
    /\b(if|while|for|catch)\b/g,           // Control flow keywords
    /\b&&\s|\|\|/g,                         // Logical AND/OR in expressions
    /\?\s/g,                                // Ternary operator
    /\bswitch\b/g,                          // Switch statement
    /\bgoto\b/g,                            // Goto statements
  ];
  
  for (const pattern of patterns) {
    const matches = sourceCode.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  // Count case clauses in switch (subtracted above as separate cases)
  return Math.min(complexity, 50); // Cap reasonable values
}

/**
 * Estimate cohesion score (higher = more cohesive)
 * This is a simplified heuristic based on class/module organization.
 */
function estimateCohesion(sourceCode: string): number {
  const lines = sourceCode.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return 0;
  
  // Simple heuristics: count related structure elements
  const classCount = (sourceCode.match(/class\s+\w+/g) || []).length;
  const interfaceCount = (sourceCode.match(/interface\s+\w+/g) || []).length;
  const functionDeclarations = (sourceCode.match(/function\s+\w*\(/g) || []).length;
  
  // Ideal balance suggests cohesive modules have proportional classes/functions
  const ratio = functionDeclarations / (classCount + interfaceCount + 1);
  
  // Scale to 0-100
  return Math.min(Math.max(ratio * 20, 20), 90); // Conservative range
}

/**
 * Analyze a single TypeScript file and compute metrics
 */
function analyzeFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const vloc = content.split('\n').filter(line => line.trim().length > 0).length;
    const cyclomatic = calculateCyclomaticComplexity(content);
    const cohesion = estimateCohesion(content);
    
    fileStats.set(filePath, { vloc, cyclomatic, cohesion });
  } catch (err) {
    console.error(`Could not analyze file ${filePath}: ${err}`);
  }
}

/**
 * Recursively scan directory for .ts files
 */
function scanDirectory(dirPath: string): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.startsWith('.')) {
        analyzeFile(fullPath);
      }
    }
  } catch (err) {
    console.warn(`Could not scan directory ${dirPath}: ${err.message}`);
  }
}

/**
 * Calculate overall Maintainability Index
 * Based on simplified NASA formula scaled appropriately
 */
function calculateMaintainabilityIndex(): {
  avgVloc: number;
  avgComplexity: number;
  avgCohesion: number;
  mi: number;
  rating: string;
} {
  const values = Array.from(fileStats.values());
  if (values.length === 0) return { avgVloc: 0, avgComplexity: 0, avgCohesion: 0, mi: 0, rating: 'Unknown' };
  
  const sumVloc = values.reduce((sum, v) => sum + v.vloc, 0);
  const sumComplexity = values.reduce((sum, v) => sum + v.cyclomatic, 0);
  const sumCohesion = values.reduce((sum, v) => sum + v.cohesion, 0);
  
  const avgVloc = sumVloc / values.length;
  const avgComplexity = sumComplexity / values.length;
  const avgCohesion = sumCohesion / values.length;
  
  // Simplified MI calculation: higher values indicate better maintainability
  // Scale adjusted to produce 0-100 range appropriate for this context
  const rawMi = 100 - (avgVloc * 0.05) - (avgComplexity * 0.8) + (avgCohesion * 0.3);
  const mi = Math.max(0, Math.min(100, rawMi));
  
  let rating: string;
  if (mi >= 65) rating = 'Excellent';
  else if (mi >= 50) rating = 'Good';
  else if (mi >= 35) rating = 'Fair';
  else rating = 'Poor';
  
  return { avgVloc, avgComplexity, avgCohesion, mi, rating };
}

/**
 * Generate detailed HTML report
 */
function generateHTMLReport(): string {
  const stats = calculateMaintainabilityIndex();
  
  let tableHTML = '';
  fileStats.forEach((value, key) => {
    const mi = 100 - (value.vloc * 0.05) - (value.cyclomatic * 0.8) + (value.cohesion * 0.3);
    const rowClass = mi < 40 ? 'row-bad' : mi < 60 ? 'row-warning' : 'row-good';
    tableHTML += `<tr class="${rowClass}"><td>${key}</td><td>${value.vloc}</td><td>${value.cyclomatic}</td><td>${Math.round(value.cohesion)}</td><td>${Math.round(mi)}</td></tr>`;
  });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FORGE Maintainability Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; text-align: center; }
    .summary { background: #e8f4fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .good { background-color: #d4edda; color: #155724; }
    .warning { background-color: #fff3cd; color: #856404; }
    .bad { background-color: #f8d7da; color: #721c24; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; position: sticky; top: 0; z-index: 1; }
    tr.row-good { background-color: #d4edda; }
    tr.warning-row { background-color: #fff3cd; }
    tr.row-bad { background-color: #f8d7da; }
    .legend { display: flex; gap: 20px; margin-top: 10px; flex-wrap: wrap; }
    .legend-item { display: inline-block; padding: 5px 10px; border-radius: 3px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏗️ FORGE Maintainability Index Report</h1>
    
    <div class="summary">
      <strong>Overall Rating: </strong><span class="${stats.rating.toLowerCase()}">${stats.rating}</span> 
      (MI = ${stats.mi.toFixed(1)})<br/>
      Average LOC per file: ${stats.avgVloc.toFixed(1)} | Avg Cyclomatic Complexity: ${stats.avgComplexity.toFixed(1)} | Avg Cohesion: ${stats.avgCohesion.toFixed(0)}%
    </div>

    <p>This report analyzes code quality metrics across all TypeScript source files. Higher Maintainability Index values indicate better maintainability.</p>
    
    <table>
      <thead>
        <tr>
          <th>File Path</th>
          <th>LOC</th>
          <th>Cyclomatic</th>
          <th>Cohesion %</th>
          <th>File MI</th>
        </tr>
      </thead>
      <tbody>
        ${tableHTML}
      </tbody>
    </table>
    
    <div class="legend">
      <div class="legend-item good">Excellent (≥65)</div>
      <div class="legend-item warning">Good (50-64)</div>
      <div class="legend-item bad">Fair (35-49)</div>
      <div class="legend-item" style="background:#fee;">Poor (<35)</div>
    </div>
    
    <h2>Recommendations</h2>
    <ul>
      <li>Files with MI < 40 should be prioritized for refactoring</li>
      <li>Average cyclomatic complexity > 15 indicates potential over-complication</li>
      <li>Low cohesion scores suggest modules may need consolidation</li>
    </ul>
  </div>
</body></html>`;
}

// Main execution
function main() {
  console.log('🔍 Scanning repository for TypeScript files...\n');
  
  // Scan both packages and services directories
  scanDirectory(PACKAGES_DIR);
  scanDirectory(SERVICES_DIR);
  
  console.log(`✅ Analyzed ${fileStats.size} TypeScript files`);
  
  // Calculate and display summary
  const stats = calculateMaintainabilityIndex();
  console.log(`\n📊 Average LOC/file: ${stats.avgVloc.toFixed(1)}`);
  console.log(`🌀 Avg Cyclomatic Complexity: ${stats.avgComplexity.toFixed(1)}`);
  console.log(`🎯 Average Cohesion: ${stats.avgCohesion.toFixed(0)}%`);
  console.log(`🌟 Maintainability Index: ${stats.mi.toFixed(1)} (${stats.rating})`);
  
  // Identify problematic files (MI < 40)
  const problematic = Array.from(fileStats.entries()).filter(([_, v]) => {
    const fileMI = 100 - (v.vloc * 0.05) - (v.cyclomatic * 0.8) + (v.cohesion * 0.3);
    return fileMI < 40;
  });
  
  if (problematic.length > 0) {
    console.log(`\n⚠️ ${problematic.length} files below threshold (MI < 40) requiring attention:`);
    problematic.forEach(([file, values]) => {
      const mi = 100 - (values.vloc * 0.05) - (values.cyclomatic * 0.8) + (values.cohesion * 0.3);
      console.log(`   - ${file}: ${mi.toFixed(1)}`);
    });
  }
  
  // Write detailed analysis file
  const reportPath = path.join(ROOT_DIR, 'docs/quality/maintainability-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFiles: fileStats.size,
    averageLOC: stats.avgVloc,
    averageComplexity: stats.avgComplexity,
    averageCohesion: stats.avgCohesion,
    maintainabilityIndex: stats.mi,
    overallRating: stats.rating,
    individualFiles: Object.fromEntries(fileStats),
  }, null, 2));
  
  console.log(`\n📁 Detailed JSON report written to ${reportPath}`);
  
  // Also generate HTML report for browser viewing
  const htmlContent = generateHTMLReport();
  const htmlPath = path.join(ROOT_DIR, 'docs/quality/maintainability-report.html');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`🌐 HTML report written to ${htmlPath} (open in browser for visualization)`);
}

main();