import withNuxt from './.nuxt/eslint.config.mjs'

import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default withNuxt(eslintPluginPrettierRecommended, {
  rules: {
    'no-console': 'warn',
    'vue/multi-word-component-names': 'off',
  },
})
