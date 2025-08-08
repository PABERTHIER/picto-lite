import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['tests/setup.ts'],
    globals: true,
    name: { label: 'PictoLite Tests', color: 'red' },
    server: {
      deps: {
        external: ['nuxt-og-image', '@nuxtjs/og-image'],
        moduleDirectories: ['@nuxtjs/seo', '@nuxtjs/og-image'],
      },
    },
    update: true,
    reporters: ['json', 'html', 'junit', ['verbose', { summary: false }]],
    outputFile: {
      json: './tests_output/tests.json',
      html: './tests_output/tests.html',
      junit: './tests_output/tests.xml',
    },
    coverage: {
      enabled: true,
      clean: false,
      cleanOnRerun: false,
      reportOnFailure: true,
      provider: 'v8', // or 'istanbul'
      reportsDirectory: './coverage',
      reporter: [
        ['clover', { projectRoot: 'clover', file: 'clover' }], // Generates a file at coverage/clover.xml
        ['cobertura', { projectRoot: 'cobertura', file: 'cobertura' }], // Generates a file at coverage/cobertura.xml
        [
          'html-spa',
          {
            metricsToShow: ['branches', 'functions'],
            verbose: true,
            subdir: './html-spa',
          },
        ], // Generates a HTML report at coverage/html-spa, you can view in your browser
        ['html', { verbose: true }], // Generates a HTML report at coverage/html, you can view in your browser and inside the Vitest UI
        ['json-summary', { file: 'json-summary' }], // Generates a file at coverage/json-summary.json
        ['json', { file: 'json' }], // Generates a file at coverage/coverage-final.json
        ['lcov', { projectRoot: 'lcov', file: 'lcov' }], // Same as lcovonly, but also generates a HTML report at coverage/Icov.info, you can view in your browser
        ['lcovonly', { projectRoot: 'lcovonly', file: 'lcovonly' }], // Generates a file at coverage/Icovonly.info
        // ['teamcity', { blockName: 'teamcity' }], // Displayed on the terminal
        // ['text-lcov', { projectRoot: 'text-lcov' }], // Displayed on the terminal
        ['text-summary'], // Displayed on the terminal
        ['text-summary', { file: 'text-summary' }], // Display the same content as above but this time in this file coverage/text-summary.txt
        ['text', { skipEmpty: true, skipFull: true, maxCols: 1 }], // Displayed on the terminal
        // ['none'] // No output
      ],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'],
      include: [
        '**/components/**',
        '**/composables/**',
        '**/layouts/**',
        '**/pages/**',
        '**/app.vue',
      ],
    },
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    // https://github.com/vitest-dev/vitest/blob/3cb2c857057815274ed3b2d06fae8ad925c033f0/docs/config/index.md#testtransformmode
    testTransformMode: {
      ssr: [
        '**/node_modules/nuxt-og-image/**',
        'nuxt-og-image',
        '@nuxtjs/og-image',
      ],
      web: [],
    },
  },
})
