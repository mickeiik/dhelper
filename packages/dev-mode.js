// packages/dev-mode.js
import { build, createServer } from 'vite';
import path from 'path';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * This script is designed to run multiple packages of your application in a special development mode.
 * To do this, you need to follow a few steps:
 */

/**
 * 1. We create a few flags to let everyone know that we are in development mode.
 */
const mode = 'development';
process.env.NODE_ENV = mode;
process.env.MODE = mode;

/**
 * 2. We create a development server for the renderer. It is assumed that the renderer exists and is located in the "renderer" package.
 * This server should be started first because other packages depend on its settings.
 */
console.log('🚀 Starting development server...');

/**
 * @type {import('vite').ViteDevServer}
 */
const rendererWatchServer = await createServer({
  mode,
  root: path.resolve('packages/renderer'),
});

await rendererWatchServer.listen();
console.log('✅ Renderer server started');

/**
 * 3. We are creating a simple provider plugin.
 * Its only purpose is to provide access to the renderer dev-server to all other build processes.
 */
/** @type {import('vite').Plugin} */
const rendererWatchServerProvider = {
  name: '@app/renderer-watch-server-provider',
  api: {
    provideRendererWatchServer() {
      return rendererWatchServer;
    },
  },
};

/**
 * 4. Start building all other packages.
 * For each of them, we add a plugin provider so that each package can implement its own hot update mechanism.
 */

/** @type {string[]} */
const corePackages = [
  'packages/types',
  'packages/tools',
  'packages/workflows',
  'packages/storage',
  'packages/preload',
  'packages/main',
];

// Auto-discover tool packages
async function discoverToolPackages() {
  const toolPackages = [];
  try {
    const toolsDir = path.resolve('packages/@tools');

    // Check if the @tools directory exists
    if (!existsSync(toolsDir)) {
      console.log('📦 No @tools directory found, skipping tool auto-discovery');
      return toolPackages;
    }

    const entries = await readdir(toolsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packagePath = path.join(toolsDir, entry.name);
        const packageJsonPath = path.join(packagePath, 'package.json');

        if (existsSync(packageJsonPath)) {
          try {
            // Read and parse package.json
            const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            // Verify it's a valid tool package
            if (packageJson.name && packageJson.name.startsWith('@tools/')) {
              toolPackages.push(`packages/@tools/${entry.name}`);
            }
          } catch (error) {
            console.warn(`⚠️  Invalid package.json in ${entry.name}: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Tool auto-discovery failed:', error.message);
  }

  return toolPackages;
}

console.log('🔍 Discovering packages...');
const toolPackages = await discoverToolPackages();
const packagesToStart = [...toolPackages, ...corePackages];

// Show discovery results
if (toolPackages.length > 0) {
  console.log(`📦 Found ${toolPackages.length} tool package(s): ${toolPackages.map(pkg => pkg.split('/').pop()).join(', ')}`);
} else {
  console.log('📦 No tool packages found');
}

console.log(`🔧 Building ${packagesToStart.length} packages...\n`);

// Build packages with progress tracking
let built = 0;
for (const pkg of packagesToStart) {
  const packageName = pkg.split('/').pop();
  process.stdout.write(`📦 Building ${packageName}... `);
  
  try {
    await build({
      mode,
      root: path.resolve(pkg),
      plugins: [
        rendererWatchServerProvider,
      ],
    });
    console.log('✅ ${packageName} Done');
    built++;
  } catch (error) {
    console.log('❌');
    console.error(`   Error: ${error.message}`);
  }
}

console.log(`\n🎉 Development environment ready! (${built}/${packagesToStart.length} packages built successfully)`);