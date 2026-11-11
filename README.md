# picto-lite

![PictoLite][app-icon]

[![Build & Test][build-badge]][build-link]
[![Release][release-badge]][release-link]
[![Coverage Status][coverage-status-badge]][coverage-status-link]

[PictoLite](https://pictolite.vercel.app/) optimizes images in the browser with optional WebP conversion.
It uses Nuxt 4, Vue 3 and TypeScript, with French and English routes and Vercel hosting.

## Features

- Drop or select multiple JPG, JPEG, PNG or WebP images.
- Keep the source format or request WebP conversion.
- Track batch progress and compare original and optimized previews with zoom.
- Download individual results or a ZIP of successful results.
- Remove individual results or clear the batch.

The optimizer returns the original whenever a candidate is not smaller.
A successful result can therefore have the same size and format as its input.
Compression can change visual quality; compare important images before replacing their originals.

PNG images at most 1,000,000 bytes pass through unchanged when WebP conversion is off.
Larger PNGs can be downscaled, which may affect text and sharp edges.
WebP conversion uses a separate PNG path at every input size.
Animated formats are outside the advertised supported formats.

## Privacy And Image Data

The optimizer processes selected image bytes locally and does not upload them.
Loading the website and its external font resources still involves network requests.
Re-encoded output does not copy source metadata, while an unchanged original retains it.
Do not treat optimization as guaranteed metadata removal.
See the [developer optimizer walkthrough](docs/IMAGE_OPTIMIZER.md) for pipeline diagrams, metadata behavior and implementation limits.

## Develop Locally

Use Node.js 24, matching [CI](.github/workflows/ci.yml), and the Yarn version pinned in [package.json](package.json).
Enable Corepack when setting up the launcher.
The repository uses Yarn's `node-modules` linker.

```sh
corepack enable
yarn install --immutable
yarn dev
```

The development server normally runs at `http://localhost:3000`.
Use `yarn.cmd` if PowerShell blocks `yarn.ps1`.

| Task                    | Command              |
| ----------------------- | -------------------- |
| Lint                    | `yarn lint`          |
| Fix lint findings       | `yarn lint:fix`      |
| Run tests once          | `yarn test --run`    |
| Watch tests             | `yarn test:watch`    |
| Open Vitest UI          | `yarn test:ui`       |
| Run coverage            | `yarn test:coverage` |
| Build production output | `yarn build`         |
| Generate static output  | `yarn generate`      |
| Preview built output    | `yarn preview`       |
| Profile a build         | `yarn profile`       |

`yarn test` starts Vitest in watch mode during interactive development.
Coverage is enabled in [vitest.config.mts](vitest.config.mts), with reports under `app/coverage/` and test reports under `app/tests_output/`.
CI installs dependencies immutably, runs lint/tests and uploads coverage; its job name does not establish production-build coverage.

### Production

Use `yarn build` for production Nuxt output or `yarn generate` for static output, then `yarn preview` for the corresponding build.
Inspect the generated French and English pages when changing routes or delivery.
Use [AGENTS.md verification](AGENTS.md#verification) for task-relevant checks.

## Direct Dependencies

Consult [package.json](package.json) for current versions.

| Dependencies                                                                             | Purpose                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `nuxt`                                                                                   | Routing, Vue application build, SSR and prerendering                                      |
| `@nuxtjs/i18n`                                                                           | French/English messages and prefixed routes                                               |
| `@nuxtjs/seo`                                                                            | Site metadata, schema, robots, sitemap and link-checker integration                       |
| `@nuxt/icon`                                                                             | Explicit Icon integration for the custom `pl-icon` SVG collection                         |
| `@nuxt/fonts`                                                                            | Font integration with explicit font-weight defaults                                       |
| `jszip`                                                                                  | Bulk download of successful image results                                                 |
| `sass`                                                                                   | SCSS compilation                                                                          |
| `rolldown`                                                                               | Build tooling satisfying Nuxt's Rolldown peer dependency                                  |
| `@nuxt/eslint`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier` | Flat lint configuration and formatting; Nuxt supplies its config and globals transitively |
| `typescript`, `@types/node`                                                              | TypeScript and Node support; framework types come from generated Nuxt 4 configuration     |
| `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `vitest`                             | Nuxt runtime mounting, component assertions, DOM environment and runner                   |
| `@vitest/coverage-v8`, `@vitest/ui`                                                      | Enabled V8 coverage, HTML reporting and interactive UI                                    |

## Project Map

| Concern                        | Source                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| Root and page metadata         | [app.vue](app/app.vue), [index.vue](app/pages/index.vue)       |
| Shared layout                  | [default.vue](app/layouts/default.vue)                         |
| Uploads, results and downloads | [ImageUploader.vue](app/components/ImageUploader.vue)          |
| Original/optimized comparison  | [ImagePreviewModal.vue](app/components/ImagePreviewModal.vue)  |
| Compression pipelines          | [useImageOptimizer.ts](app/composables/useImageOptimizer.ts)   |
| French and English messages    | [i18n/locales](i18n/locales/)                                  |
| Styles and shared types        | [app/styles](app/styles/), [app/types](app/types/)             |
| Tests and browser mocks        | [app/tests](app/tests/)                                        |
| Modules and scripts            | [nuxt.config.ts](nuxt.config.ts), [package.json](package.json) |

Image processing relies on browser Canvas and ImageBitmap support.
The native save picker has a browser-download fallback.
Mocked fixture tests verify pipeline control flow; actual image fidelity and browser behavior require browser checks.

## Images And Icons

| Consumer                  | Delivery                                      | What to preserve                                                     |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Selected source images    | Browser File/Blob objects and Canvas encoding | Original bytes, actual returned MIME and no-larger-output fallback   |
| Comparison panels         | Native images with object URLs                | Original/optimized dimensions, complete images, zoom and URL cleanup |
| Public logo and app icons | Files under `public/`                         | Actual filenames, root-relative paths and metadata consistency       |
| Footer icon               | `pl-icon:github-mark` from `app/assets/svg/`  | Custom SVG collection and a meaningful link name                     |

The [developer walkthrough](docs/IMAGE_OPTIMIZER.md) includes diagrams for each compression path and metadata handling.
The [agent reference](.agents/docs/IMAGE_OPTIMIZER.md) records review criteria and known source limitations.
Preserve supplied filenames and inspect the actual blob format when changing download names.

## Deploy On Vercel

Vercel hosts the application.
Use Node.js 24, the pinned Yarn launcher and immutable dependency installation.
Keep deployment settings aligned with the selected Nuxt build or static-generation mode and check the resulting output.

[nuxt.config.ts](nuxt.config.ts) defines the production origin as `https://pictolite.vercel.app` and the development I18n origin as `http://localhost:3000`.
The root and page head blocks build metadata from that configuration.
Verify deployed canonical/alternate links and public assets when changing origins or delivery.

## Code Coverage

[![codecov][codecov-badge]][codecov-link]

V8 coverage is enabled in the shared Vitest configuration.
Use `yarn test:coverage` for a single run, then inspect `app/coverage/`.
The [CI workflow](.github/workflows/ci.yml) uploads its generated coverage report to Codecov.

## Project Guidance

| Resource                                                     | Purpose                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                       | Shared constraints, architecture, commands and verification |
| [.agents/README.md](.agents/README.md)                       | Reference, skill and instruction index                      |
| [CLAUDE.md](CLAUDE.md)                                       | Claude entry point, shared workflows and command adapters   |
| [Copilot instructions](.github/copilot-instructions.md)      | Copilot entry point to the same guidance                    |
| [Agent optimizer reference](.agents/docs/IMAGE_OPTIMIZER.md) | Pipeline details, metadata, limitations and review criteria |
| [Developer optimizer walkthrough](docs/IMAGE_OPTIMIZER.md)   | Detailed pipelines, helper explanations and diagrams        |

[app-icon]: public/icon.ico

[build-badge]: https://github.com/PABERTHIER/picto-lite/actions/workflows/ci.yml/badge.svg
[build-link]: https://github.com/PABERTHIER/picto-lite/actions/workflows/ci.yml

[release-badge]: https://deploy-badge.vercel.app/?url=https://pictolite.vercel.app/&name=website
[release-link]: https://pictolite.vercel.app

[coverage-status-badge]: https://codecov.io/github/paberthier/picto-lite/graph/badge.svg?token=CCE9CLN58S
[coverage-status-link]: https://codecov.io/github/paberthier/picto-lite

[codecov-badge]: https://codecov.io/github/paberthier/picto-lite/graphs/sunburst.svg?token=CCE9CLN58S
[codecov-link]: https://codecov.io/github/PABERTHIER/picto-lite
