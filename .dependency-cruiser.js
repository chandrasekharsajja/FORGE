/**
 * Dependency Cruiser configuration for FORGE monorepo
 * Enforces architectural boundaries and detects circular dependencies
 */
module.exports = {
  // Package root folder that contains all code for analysis
  projectRoot: '.',

  // File types to include in analysis
  include: [
    'packages/**/*.ts',
    'services/**/*.ts',
    'apps/**/*.ts',
  ],

  // Exclude test files and vendor code from dependency analysis
  exclude: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '/coverage/',
    '/node_modules/',
  ],

  // Preset rules enforcing clean architecture
  presets: ['recommended'],

  // Additional forbidden dependencies to catch architectural violations
  forbidden: [
    // Packages (domain layer) must not depend on services (infrastructure layer)
    {
      do: 'depOf(["services/*"])',
      from: 'packages/[^/]*',
      msg: 'Packages must not depend directly on services (use contracts/interface pattern)',
    },
    
    // Apps should use API routes, not direct service imports
    {
      do: 'depOf(["services/*"])',
      from: 'apps/unified-ide/src/lib', // Only API routes should import services
      msg: 'Direct service imports only allowed in lib/api/* or explicit service adapters',
    },
    
    // Forbidden self-loops within same package directories
    {
      do: 'self()',
      msg: 'Self-dependencies indicate potential circular references',
    },
  ],

  // Optional: allow exceptions where clearly justified
  allow: [
    // Contracts package must be importable everywhere
    {
      do: 'depOf(["@sajja/forge-contracts"])',
      from: 'apps/*, packages/*, services/*',
      msg: 'OK: Standard contract interface usage',
    },
  ],

  // Output format: summary + detailed violations report
  reportAmendment: (reportContext) => {
    const violations = reportContext.graph.filterViolation;
    return violations.length > 0 
      ? { ...reportContext, violationCount: violations.length } 
      : { ...reportContext, violationCount: 0 };
  },
};