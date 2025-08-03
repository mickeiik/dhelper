// scripts/create-tool.js
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const toolName = process.argv[2];
if (!toolName) {
    console.error('Usage: npm run create-tool <tool-name>');
    process.exit(1);
}

const toolDir = join('packages', '@tools', toolName);

// Create directory
await mkdir(toolDir, { recursive: true });
await mkdir(join(toolDir, 'src'), { recursive: true });

// Package.json template
const packageJson = {
    "name": `@tools/${toolName}`,
    "type": "module",
    "scripts": {
        "build": "vite build",
        "typecheck": "tsc --noEmit"
    },
    "exports": {
        ".": {
            "types": "./src/index.ts",
            "default": "./dist/index.js"
        }
    },
    "devDependencies": {
        "@app/electron-versions": "*",
        "typescript": "5.8.3",
        "vite": "7.0.6"
    }
};

// TypeScript source template
const indexTs = `import { Tool } from '@app/tools';

export interface ${pascalCase(toolName)}Input {
  // Define your input interface here
}

export interface ${pascalCase(toolName)}Output {
  // Define your output interface here
}

export class ${pascalCase(toolName)}Tool implements Tool {
  id = '${toolName}';
  name = '${toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Tool';

  async initialize(inputs: any) {
    // Initialize your tool here
    console.log(\`\${this.name} initialized\`);
  }

  async execute(input: ${pascalCase(toolName)}Input): Promise<${pascalCase(toolName)}Output> {
    // Implement your tool logic here
    console.log(\`\${this.name} executing with input:\`, input);
    
    // TODO: Replace with actual implementation
    return {
      success: true,
      message: \`\${this.name} executed successfully\`
    } as ${pascalCase(toolName)}Output;
  }
}
`;

// Vite config template (copied from existing tools)
const viteConfig = `import { getChromeMajorVersion } from '@app/electron-versions';

export default /**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
({
  build: {
    ssr: true,
    sourcemap: 'inline',
    outDir: 'dist',
    target: \`chrome\${getChromeMajorVersion()}\`,
    assetsDir: '.',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
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
    name: '@tools/${toolName}-process-hot-reload',

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
`;

// TypeScript config template
const tsConfig = `{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "module": "NodeNext",
    "target": "ESNext",
    "sourceMap": false,
    "moduleResolution": "NodeNext",
    "skipLibCheck": true,
    "strict": true,
    "isolatedModules": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@app/*": ["../*"]
    }
  },
  "include": ["src/**/*.ts", "../../types/**/*.d.ts"],
  "exclude": ["**/*.spec.ts", "**/*.test.ts"]
}
`;

// Write files
await writeFile(join(toolDir, 'package.json'), JSON.stringify(packageJson, null, 2));
await writeFile(join(toolDir, 'src', 'index.ts'), indexTs);
await writeFile(join(toolDir, 'vite.config.js'), viteConfig);
await writeFile(join(toolDir, 'tsconfig.json'), tsConfig);

console.log(`✅ Created tool package: @tools/${toolName}`);
console.log(`📁 Location: ${toolDir}`);
console.log(`🔧 To use: npm run start (auto-discovery will pick it up)`);

function pascalCase(str) {
    return str.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
}