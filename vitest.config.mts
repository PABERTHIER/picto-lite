import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['app/tests/setup.ts'],
    globals: true,
    name: { label: 'PictoLite Tests', color: 'red' },
    server: {
      deps: {
        external: ['nuxt-og-image', '@nuxtjs/og-image'],
      },
    },
    deps: {
      moduleDirectories: ['@nuxtjs/seo', '@nuxtjs/og-image'],
    },
    update: true,
    reporters: [
      'json',
      ['html', { outputDir: './app/tests_output' }],
      'junit',
      ['verbose', { summary: false }],
    ],
    outputFile: {
      json: './app/tests_output/tests.json',
      junit: './app/tests_output/tests.xml',
    },
    coverage: {
      enabled: true,
      clean: false,
      cleanOnRerun: false,
      reportOnFailure: true,
      provider: 'v8', // or 'istanbul'
      reportsDirectory: './app/coverage',
      htmlDir: './app/coverage/html',
      reporter: [
        // Build the SPA's nested summary before other reporters mutate the shared tree
        [
          'html-spa',
          {
            subdir: 'html-spa',
            metricsToShow: ['branches', 'functions'],
            verbose: true,
          },
        ], // Generates a HTML report at coverage/html-spa, you can view in your browser
        ['html', { subdir: 'html', verbose: true }], // Generates a HTML report at coverage/html, you can view in your browser and inside the Vitest UI
        ['clover', { file: 'clover' }], // Generates a file at coverage/clover
        ['cobertura', { file: 'cobertura' }], // Generates a file at coverage/cobertura
        ['json-summary', { file: 'json-summary' }], // Generates a file at coverage/json-summary
        ['json', { file: 'json' }], // Generates a file at coverage/json
        ['lcov', { file: 'lcov' }], // Generates coverage/lcov and an HTML report at coverage/lcov-report
        ['lcovonly', { file: 'lcovonly' }], // Generates a file at coverage/lcovonly
        // ['teamcity', { blockName: 'teamcity' }], // Displayed on the terminal
        // ['text-lcov', { projectRoot: 'text-lcov' }], // Displayed on the terminal
        ['text-summary'], // Displayed on the terminal
        ['text-summary', { file: 'text-summary' }], // Display the same content as above but this time in this file coverage/text-summary.txt
        ['text', { skipEmpty: true, skipFull: true, maxCols: 1 }], // Displayed on the terminal
        // ['none'] // No output
      ],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/node_modules/**',
        '**/*.html',
        '**/coverage/**',
        '**/tests_output/**',
      ],
      include: [
        'app/components/**/*.vue',
        'app/composables/**/*.ts',
        'app/layouts/**/*.vue',
        'app/pages/**/*.vue',
        'app/app.vue',
      ],
    },
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
  },
})
