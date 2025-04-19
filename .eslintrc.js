module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  extends: ['@nuxtjs/eslint-config-typescript'],
  plugins: ['@typescript-eslint', 'prettier'],
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
    'no-console': 1,
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    'no-unused-vars': 0,
    'vue/html-closing-bracket-newline': ['error', {
      singleline: 'never',
      multiline: 'never',
    }],
    'vue/multi-word-component-names': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/no-v-html': 0,
    semi: 'off',
  },
}
