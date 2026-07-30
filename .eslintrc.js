module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './apps/unified-ide/tsconfig.json'],
    tsJest: {
      tsConfigPaths: ['./tsconfig.json'],
    },
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'simple-import-sort',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-as-conversion': 'error',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'error',
    '@typescript-eslint/unbound-method': 'warn',
    'no-console': 'warn',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        newlines-between: 'always',
        alphabetical: true,
      },
    ],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/export': 'error',
    'no-undef': 'off',
    'prefer-const': 'warn',
    '@typescript-eslint/no-use-before-define': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'coverage/',
    '*.test.ts',
    '**/*.test.tsx',
  ],
};