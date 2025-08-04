import { getChromeMajorVersion } from '@app/electron-versions';
import path from 'path';
import fs from 'fs';

function copyOverlayPlugin() {
  return {
    name: 'copy-html',
    generateBundle() {
      console.log('bundle')
      const srcPath = path.resolve(__dirname, 'src/overlay.html');
      const destPath = path.resolve(__dirname, 'dist/overlay.html');
      fs.copyFileSync(srcPath, destPath);
    }
  };
}

export default /**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
  ({
    build: {
      ssr: true,
      sourcemap: 'inline',
      outDir: 'dist',
      target: `chrome${getChromeMajorVersion()}`,
      assetsDir: '.',
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
      },
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
        plugins: [copyOverlayPlugin()],
      },
      emptyOutDir: true,
      reportCompressedSize: false,
    },
    plugins: [handleHotReload()],
  });

/**
 * Implement Electron webview reload when some file was changed
 * @return {import('vite').Plugin}
 */
function handleHotReload() {
  /** @type {import('vite').ViteDevServer|null} */
  let rendererWatchServer = null;

  return {
    name: '@tools/screen-region-selector-tool-process-hot-reload',

    config(config, env) {
      if (env.mode !== 'development') {
        return;
      }

      const rendererWatchServerProvider = config.plugins.find(p => p.name === '@app/renderer-watch-server-provider');
      if (!rendererWatchServerProvider) {
        throw new Error('Renderer watch server provider not found');
      }

      rendererWatchServer = rendererWatchServerProvider.api.provideRendererWatchServer();

      return {
        build: {
          watch: {},
        },
      };
    },

    writeBundle() {
      if (!rendererWatchServer) {
        return;
      }

      rendererWatchServer.ws.send({
        type: 'full-reload',
      });
    },
  };
}
