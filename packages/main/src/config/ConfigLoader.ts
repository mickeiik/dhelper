import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppConfig } from './AppConfig.js';
import { getConfig, updateConfig } from './AppConfig.js';

export interface ConfigFile {
  storage?: Partial<AppConfig['storage']>;
  tools?: Partial<AppConfig['tools']>;
  ui?: Partial<AppConfig['ui']>;
  overlay?: Partial<AppConfig['overlay']>;
  templates?: Partial<AppConfig['templates']>;
  workflows?: Partial<AppConfig['workflows']>;
}

export class ConfigLoader {
  private static readonly CONFIG_FILE_NAME = 'dhelper.config.json';
  
  static loadFromFile(configPath?: string): Partial<AppConfig> {
    const paths = [
      configPath,
      join(process.cwd(), this.CONFIG_FILE_NAME),
      join(process.cwd(), 'config', this.CONFIG_FILE_NAME),
      join(process.env.HOME || process.env.USERPROFILE || '', `.${this.CONFIG_FILE_NAME}`),
    ].filter(Boolean) as string[];
    
    for (const path of paths) {
      if (existsSync(path)) {
        try {
          const configFile = JSON.parse(readFileSync(path, 'utf-8')) as ConfigFile;
          console.log(`✓ Loaded configuration from: ${path}`);
          return configFile as Partial<AppConfig>;
        } catch (error) {
          console.warn(`Failed to load config from ${path}:`, error);
        }
      }
    }
    
    return {};
  }
  
  static loadFromEnvironment(): Partial<AppConfig> {
    const config: any = {};
    
    // Storage configuration
    if (process.env.DHELPER_WORKFLOWS_PATH || process.env.DHELPER_TEMPLATES_PATH) {
      config.storage = {};
      if (process.env.DHELPER_WORKFLOWS_PATH) {
        config.storage.workflowsPath = process.env.DHELPER_WORKFLOWS_PATH;
      }
      if (process.env.DHELPER_TEMPLATES_PATH) {
        config.storage.templatesPath = process.env.DHELPER_TEMPLATES_PATH;
      }
    }
    
    // Tools configuration
    if (process.env.DHELPER_TOOL_TIMEOUT || process.env.DHELPER_TOOL_DISCOVERY_PATHS) {
      config.tools = {};
      if (process.env.DHELPER_TOOL_TIMEOUT) {
        const timeout = parseInt(process.env.DHELPER_TOOL_TIMEOUT, 10);
        if (!isNaN(timeout)) {
          config.tools.timeout = timeout;
        }
      }
      if (process.env.DHELPER_TOOL_DISCOVERY_PATHS) {
        const paths = process.env.DHELPER_TOOL_DISCOVERY_PATHS.split(';').filter(Boolean);
        config.tools.discoveryPaths = paths;
      }
    }
    
    // UI configuration
    if (process.env.DHELPER_SHOW_INSTRUCTIONS || process.env.DHELPER_OVERLAY_TIMEOUT) {
      config.ui = {};
      if (process.env.DHELPER_SHOW_INSTRUCTIONS) {
        config.ui.showInstructions = process.env.DHELPER_SHOW_INSTRUCTIONS === 'true';
      }
      if (process.env.DHELPER_OVERLAY_TIMEOUT) {
        const timeout = parseInt(process.env.DHELPER_OVERLAY_TIMEOUT, 10);
        if (!isNaN(timeout)) {
          config.ui.overlayTimeout = timeout;
        }
      }
    }
    
    // Template configuration
    if (process.env.DHELPER_TEMPLATE_THRESHOLD) {
      const threshold = parseFloat(process.env.DHELPER_TEMPLATE_THRESHOLD);
      if (!isNaN(threshold)) {
        config.templates = { defaultThreshold: threshold };
      }
    }
    
    return config as Partial<AppConfig>;
  }
  
  static loadConfig(configPath?: string): AppConfig {
    // Start with default configuration
    const baseConfig = getConfig();
    
    // Load from environment variables
    const envConfig = this.loadFromEnvironment();
    
    // Load from configuration file
    const fileConfig = this.loadFromFile(configPath);
    
    // Merge all configurations (file takes precedence over environment)
    const mergedConfig = { ...baseConfig, ...envConfig, ...fileConfig };
    
    // Update the global configuration
    return updateConfig(mergedConfig);
  }
}