# Configuration System

DHelper uses a centralized configuration system that allows you to customize various aspects of the application. Configuration can be provided through configuration files, environment variables, or both.

## Configuration Sources

Configuration is loaded in the following order (later sources override earlier ones):

1. **Default Configuration** - Built-in defaults
2. **Environment Variables** - Runtime environment configuration
3. **Configuration Files** - JSON files with custom settings

## Configuration Files

DHelper looks for configuration files in these locations (in order):

1. Path specified via `--config` command line argument (if provided)
2. `./dhelper.config.json` (project root)
3. `./config/dhelper.config.json` (config directory)
4. `~/.dhelper.config.json` (user home directory)

### Example Configuration File

```json
{
  "storage": {
    "workflowsPath": "C:\\Users\\YourUser\\Documents\\DHelper\\workflows",
    "templatesPath": "C:\\Users\\YourUser\\Documents\\DHelper\\templates"
  },
  "tools": {
    "discoveryPaths": [
      "C:\\MyCustomTools\\dhelper-tools",
      "./packages/@tools"
    ],
    "timeout": 60000,
    "autoRegister": true
  },
  "ui": {
    "showInstructions": false,
    "overlayTimeout": 10000
  }
}
```

## Environment Variables

You can also configure DHelper using environment variables:

### Storage Configuration
- `DHELPER_WORKFLOWS_PATH` - Custom path for workflow storage
- `DHELPER_TEMPLATES_PATH` - Custom path for template storage

### Tools Configuration
- `DHELPER_TOOL_TIMEOUT` - Tool execution timeout in milliseconds
- `DHELPER_TOOL_DISCOVERY_PATHS` - Semicolon-separated list of tool discovery paths

### UI Configuration
- `DHELPER_SHOW_INSTRUCTIONS` - Show overlay instructions (`true` or `false`)
- `DHELPER_OVERLAY_TIMEOUT` - Overlay auto-close timeout in milliseconds

### Template Configuration
- `DHELPER_TEMPLATE_THRESHOLD` - Default template matching threshold (0.0 to 1.0)

## Configuration Schema

### AppConfig Interface

```typescript
export interface AppConfig {
  storage: {
    workflowsPath: string;          // Path to workflow storage directory
    templatesPath: string;          // Path to template storage directory
    userDataPath: string;           // Base user data directory
  };
  tools: {
    discoveryPaths: string[];       // Paths to search for tools
    timeout: number;                // Tool execution timeout (ms)
    autoRegister: boolean;          // Auto-register discovered tools
  };
  ui: {
    showInstructions: boolean;      // Show overlay instructions
    overlayTimeout: number;         // Overlay auto-close timeout (ms)
  };
  overlay: {
    htmlPaths: string[];            // Paths to overlay HTML files
    transparent: boolean;           // Enable window transparency
    alwaysOnTop: boolean;           // Keep overlay windows on top
    clickThrough: boolean;          // Enable click-through behavior
  };
  templates: {
    defaultThreshold: number;       // Default matching threshold
    cacheEnabled: boolean;          // Enable template caching
    thumbnailSize: number;          // Thumbnail size in pixels
  };
  workflows: {
    maxRetries: number;             // Maximum retry attempts
    defaultTimeout: number;         // Default workflow timeout (ms)
    cacheEnabled: boolean;          // Enable workflow caching
  };
}
```

## Using Configuration in Code

### Getting Current Configuration

```typescript
import { getConfig } from './config';

const config = getConfig();
console.log('Workflows path:', config.storage.workflowsPath);
console.log('Tool timeout:', config.tools.timeout);
```

### Loading Custom Configuration

```typescript
import { ConfigLoader } from './config';

// Load with custom config file
const config = ConfigLoader.loadConfig('/path/to/custom/config.json');

// Load with environment variables only
const envConfig = ConfigLoader.loadFromEnvironment();
```

### Updating Configuration at Runtime

```typescript
import { updateConfig } from './config';

// Update specific configuration values
const newConfig = updateConfig({
  ui: {
    overlayTimeout: 5000
  }
});
```

## Best Practices

1. **Use Environment Variables for Deployment** - Use environment variables for configuration that changes between environments (dev, staging, prod)

2. **Use Configuration Files for User Preferences** - Use JSON config files for user-specific settings and preferences

3. **Don't Commit Secrets** - Never commit sensitive information like API keys in configuration files

4. **Validate Configuration** - The system validates configuration values and uses sensible defaults for missing or invalid values

5. **Document Custom Settings** - Document any custom configuration options you add for future reference