import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import vueParser from 'vue-eslint-parser'
import importPlugin from 'eslint-plugin-import'
import { FlatCompat } from '@eslint/eslintrc'
import eslint from 'eslint'

// Helper to convert legacy shareable configs/plugins
const compat = new FlatCompat({ eslint })

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.nuxt/**',
      '.yarn/**',
      'coverage/**',
      'tests_output/**',
    ],
  },
  // Bring in Nuxt TypeScript shareable config
  ...compat.extends('@nuxtjs/eslint-config-typescript'),
  {
    // Configure parser and globals
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    // Import resolver settings must be top-level in flat config
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    // custom rules
    rules: {
      'comma-dangle': [
        'error',
        {
          arrays: 'only-multiline',
          objects: 'always-multiline',
          imports: 'only-multiline',
          exports: 'only-multiline',
          functions: 'only-multiline',
        },
      ],
      'no-console': 'warn',
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'never',
          named: 'never',
          asyncArrow: 'always',
        },
      ],
      'no-unused-vars': 'off',
      'vue/html-closing-bracket-newline': [
        'error',
        { singleline: 'never', multiline: 'never' },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/no-v-html': 'off',
      semi: 'off',
    },
  },
]
