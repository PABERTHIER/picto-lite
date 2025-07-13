# picto-lite

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
