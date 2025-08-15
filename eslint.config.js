// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js', // Ignore built JS files
      '**/*.d.ts', // Ignore declaration files
      '**/CHANGELOG.md',
    ],
  },
  
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylistic,
  
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  
  {
    // Custom rules for the entire project
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // IPC interfaces need 'any' for flexibility
      '@typescript-eslint/no-var-requires': 'error',
      
      // Disable strict type checking rules for IPC library
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      
      // General rules
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      
      // Import/export rules
      'no-duplicate-imports': 'off', // Disabled because it conflicts with type imports vs value imports
    },
  },
  
  {
    // React-specific configuration
    files: ['react/**/*.ts', 'react/**/*.tsx'],
    rules: {
      // More lenient with 'any' in React components for IPC interfaces
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  
  {
    // Backend-specific configuration
    files: ['backend/**/*.ts'],
    rules: {
      // Backend might need more console logging
      'no-console': 'off',
    },
  },
  
  {
    // Test files (if any)
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  }
);
