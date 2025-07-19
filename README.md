# picto-lite

[![Build & Test][build-badge]][build-link]
[![Release][release-badge]][release-link]
[![Coverage Status][coverage-status-badge]][coverage-status-link]

A tool for bulk image optimization and optional WebP conversion.

Here it is: [pictolite](https://pictolite.vercel.app/)

It uses Vercel for deployment and hosting.

## Features

- Drag-&-drop or file‑selector input for multiple pictures
- Option to preserve original formats or to convert to WebP format
- Adaptive quality control to target a maximum size of ~1 MB without visual loss

## Nuxt 3 Minimal Starter

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

### Setup

Try to use the latest version of Node.js (using the 22.17.0 for Nuxt 3.17.6 for example).

Install the Volar VSCode extension.

Install Yarn:

```bash
# enable corepack
corepack enable
```

Make sure to install the dependencies:

```bash
# yarn
yarn install
```

### Development Server

Start the development server on <http://localhost:3000>

```bash

# yarn
yarn dev -o


# fix lint
yarn lint --fix
```

### Production

Build the application for production:

```bash
yarn build
```

Locally preview production build:

```bash
yarn preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Code coverage :bar_chart:

[![codecov][codecov-badge]][codecov-link]

[build-badge]: https://github.com/PABERTHIER/picto-lite/actions/workflows/ci.yml/badge.svg
[build-link]: https://github.com/PABERTHIER/picto-lite/actions/workflows/ci.yml

[release-badge]: https://deploy-badge.vercel.app/?url=https://pictolite.vercel.app/&name=website
[release-link]: https://pictolite.vercel.app

[coverage-status-badge]: https://codecov.io/github/paberthier/picto-lite/graph/badge.svg?token=CCE9CLN58S
[coverage-status-link]: https://codecov.io/github/paberthier/picto-lite

[codecov-badge]: https://codecov.io/github/paberthier/picto-lite/graphs/sunburst.svg?token=CCE9CLN58S
[codecov-link]: https://codecov.io/github/PABERTHIER/picto-lite
