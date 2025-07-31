
# DHelper

![GitHub last commit](https://img.shields.io/github/last-commit/mickeiik/dhelper?label=last%20update)
![GitHub package.json dev/peer/optional dependency version](https://img.shields.io/github/package-json/dependency-version/mickeiik/dhelper/dev/electron) 
![GitHub package.json dev/peer/optional dependency version](https://img.shields.io/github/package-json/dependency-version/mickeiik/dhelper/dev/electron-builder)
![GitHub package.json dev/peer/optional dependency version](https://img.shields.io/github/package-json/dependency-version/mickeiik/dhelper/dev/vite?filename=packages%2Fmain%2Fpackage.json)
![GitHub package.json dev/peer/optional dependency version](https://img.shields.io/github/package-json/dependency-version/mickeiik/dhelper/dev/playwright)

This project has been create with [vite-electron-builder](https://github.com/cawa-93/vite-electron-builder)

### NPM Scripts

```sh
npm start
```
Start application in development more with hot-reload.

---
```sh
npm run build
```
Runs the `build` command in all workspaces if present.

---
```sh
npm run compile
```
First runs the `build` script,
then compiles the project into executable using `electron-builder` with the specified configuration.

---
```sh
npm run compile -- --dir -c.asar=false
```
Same as `npm run compile` but pass to `electron-builder` additional parameters to disable asar archive and installer
creating.
Useful for debugging compiled application.

---
```sh
npm run test
```
Executes end-to-end tests on **compiled app** using Playwright.

---
```sh
npm run typecheck
```
Runs the `typecheck` command in all workspaces if present.

---
```sh
npm run create-renderer
```
Initializes a new Vite project named `renderer`. Basically same as `npm create vite`.

---
```sh
npm run integrate-renderer
```
Starts the integration process of the renderer using the Vite Electron builder.

---
```sh
npm run init
```
Set up the initial environment by creating a new renderer, integrating it, and installing the necessary packages.

[vite]: https://github.com/vitejs/vite/

[electron]: https://github.com/electron/electron

[electron-builder]: https://github.com/electron-userland/electron-builder

[playwright]: https://playwright.dev
