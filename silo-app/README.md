# Silo

Silo is a Windows Electron desktop app for running multiple DITOGAMES accounts
in isolated browser Environments.

## Architecture

- A Game is a launch target and owns its URL and proxy-mode preference.
- An Environment is a persistent browser identity. Its storage lives in exactly
  one Chromium partition: `persist:silo-<environment-id>`.
- A Session is the ephemeral Game + Environment BrowserView runtime.
- Games may share an Environment; they then intentionally share that
  Environment's cookies and browser storage.
- Browser session state is in memory only and is reconstructed after restart.

Metadata is stored in `silo.db` with an atomic `.bak` recovery copy. Settings
and the proxy pool use atomic JSON writes; proxy credentials are encrypted with
Electron `safeStorage` when the platform secure store is available. Silo fails
closed rather than saving new proxy credentials as plaintext when it is not.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Verification

```bash
$ npm run typecheck
$ npm run test:isolation
$ npm run test:phase2
$ npm run test:postphase2
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

The supported production target is Windows x64. The Windows build creates an
NSIS installer with `npm run build:win`.
