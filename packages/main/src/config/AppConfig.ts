import { app } from 'electron';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  storage: {
    workflowsPath: string;
    templatesPath: string;
    userDataPath: string;
  };
  tools: {
    discoveryPaths: string[];
    timeout: number;
    autoRegister: boolean;
  };
  ui: {
    showInstructions: boolean;
    overlayTimeout: number;
  };
  overlay: {
    htmlPaths: string[];
    transparent: boolean;
    alwaysOnTop: boolean;
    clickThrough: boolean;
  };
  templates: {
    defaultThreshold: number;
    cacheEnabled: boolean;
    thumbnailSize: number;
  };
  workflows: {
    maxRetries: number;
    defaultTimeout: number;
    cacheEnabled: boolean;
  };
}

function getDefaultConfig(): AppConfig {
  const userDataPath = app.getPath('userData');

  return {
    storage: {
      workflowsPath: join(userDataPath, 'workflows'),
      templatesPath: join(userDataPath, 'templates'),
      userDataPath,
    },
    tools: {
      discoveryPaths: [
        join(process.cwd(), 'packages', '@tools'),
        join(process.cwd(), 'packages', 'tools')
      ],
      timeout: 30000,
      autoRegister: true,
    },
    ui: {
      showInstructions: true,
      overlayTimeout: 15000,
    },
    overlay: {
      htmlPaths: [
        join(process.cwd(), 'packages', 'overlay', 'overlay.html'),
        join(__dirname, '..', '..', 'overlay', 'overlay.html'),
        join(__dirname, '..', '..', '..', 'overlay', 'overlay.html'),
        join(__dirname, '..', '..', '..', '..', 'packages', 'overlay', 'overlay.html'),
      ],
      transparent: true,
      alwaysOnTop: true,
      clickThrough: false,
    },
    templates: {
      defaultThreshold: 0.8,
      cacheEnabled: true,
      thumbnailSize: 150,
    },
    workflows: {
      maxRetries: 3,
      defaultTimeout: 30000,
      cacheEnabled: true,
    },
  };
}

let _config: AppConfig | null = null;

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  if (!_config) {
    _config = getDefaultConfig();
  }

  if (overrides) {
    _config = deepMerge(_config, overrides);
  }

  return _config;
}

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function updateConfig(updates: Partial<AppConfig>): AppConfig {
  _config = deepMerge(getConfig(), updates);
  return _config;
}

// Deep merge utility for nested configuration objects
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {} as any, source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }

  return result;
}