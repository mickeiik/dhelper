// packages/tools/src/index.ts
import { readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

// Import auto-generated tool imports for TypeScript autocomplete
import './auto-imports.js';

export interface ToolMetadata {
    id: string
    name: string
}

export interface Tool extends ToolMetadata {
    initialize(inputs: any): Promise<any>
    execute(inputs: any): Promise<any>
}

interface ToolRegistration {
    tool: Tool;
    initialized: boolean;
    factory?: () => Promise<Tool>;
}

export class ToolManager {
    private tools = new Map<string, ToolRegistration>()
    private autoDiscovered = false;

    // Auto-discover tools from @tools packages
    async autoDiscoverTools() {
        if (this.autoDiscovered) return;

        try {
            const toolsPath = this.resolveToolsDirectory();
            console.log(`ToolManager: Looking for tools in: ${toolsPath}`);

            if (!existsSync(toolsPath)) {
                console.log(`ToolManager: Tools directory does not exist: ${toolsPath}`);
                this.autoDiscovered = true;
                return;
            }

            const entries = await readdir(toolsPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    await this.loadToolFromDirectory(entry.name);
                }
            }

            this.autoDiscovered = true;
            console.log(`ToolManager: Auto-discovered ${this.tools.size} tools`);
        } catch (error) {
            console.warn('ToolManager: Auto-discovery failed:', error);
        }
    }

    private resolveToolsDirectory(): string {
        // Get the current file path and navigate to project root
        const currentFilePath = fileURLToPath(import.meta.url);
        const currentDir = dirname(currentFilePath);

        // Navigate up to find the project root (contains packages directory)
        let projectRoot = currentDir;

        // Keep going up until we find a directory that contains 'packages'
        while (projectRoot !== dirname(projectRoot)) { // Stop at filesystem root
            const packagesDir = join(projectRoot, 'packages');
            if (existsSync(packagesDir)) {
                break;
            }
            projectRoot = dirname(projectRoot);
        }

        const toolsPath = join(projectRoot, 'packages', '@tools');
        return toolsPath;
    }

    private async loadToolFromDirectory(toolName: string) {
        try {
            const modulePath = `@tools/${toolName}`;

            // Create a factory function for lazy loading
            const factory = async (): Promise<Tool> => {
                const module = await import(modulePath);

                // Look for tool class exports (convention: ends with 'Tool')
                const ToolClass = Object.values(module).find(
                    (exp: any) =>
                        typeof exp === 'function' &&
                        exp.prototype &&
                        typeof exp.prototype.execute === 'function'
                ) as new () => Tool;

                if (!ToolClass) {
                    throw new Error(`No valid Tool class found in ${modulePath}`);
                }

                return new ToolClass();
            };

            // Register with factory for lazy initialization
            const tempTool = await factory(); // Get metadata
            this.registerTool(tempTool.id, tempTool.name, factory);

        } catch (error) {
            console.warn(`ToolManager: Failed to load tool from ${toolName}:`, error);
        }
    }

    registerTool(id: string, name: string, factory: () => Promise<Tool>) {
        this.tools.set(id, {
            tool: { id, name } as Tool, // Temporary object for metadata
            initialized: false,
            factory
        });
        console.log(`ToolManager: "${name}" tool registered (lazy)`);
    }

    async runTool(id: string, inputs: any) {
        const registration = this.tools.get(id);
        if (!registration) {
            throw new Error(`Tool with id "${id}" not found`);
        }

        try {
            // Initialize tool if needed
            if (!registration.initialized) {
                await this.initializeTool(id);
            }

            const tool = registration.tool;
            console.log(`Running tool: "${tool.id}"`);

            const result = await tool.execute(inputs);
            console.log(`Tool "${tool.id}" completed successfully`);
            return result;
        } catch (error) {
            console.error(`Tool "${id}" execution failed:`, error);
            throw error; // Re-throw so caller can handle it
        }
    }

    private async initializeTool(id: string) {
        const registration = this.tools.get(id);
        if (!registration || registration.initialized) return;

        try {
            // If we have a factory, create the actual tool instance
            if (registration.factory) {
                registration.tool = await registration.factory();
            }

            await registration.tool.initialize({});
            registration.initialized = true;
            console.log(`ToolManager: "${registration.tool.name}" initialized`);
        } catch (error) {
            console.error(`ToolManager: Failed to initialize tool "${id}":`, error);
            throw error;
        }
    }

    getTools(): ToolMetadata[] {
        return Array.from(this.tools.values()).map(({ tool }): ToolMetadata => ({
            id: tool.id,
            name: tool.name,
        }));
    }

    // Initialize all tools (useful for development/testing)
    async initializeAllTools() {
        const initPromises = Array.from(this.tools.keys()).map(id =>
            this.initializeTool(id).catch(error =>
                console.warn(`Failed to initialize tool ${id}:`, error)
            )
        );
        await Promise.all(initPromises);
    }
}

// Export registry types
export type { ToolRegistry, ToolId, ToolInput, ToolOutput } from './registry.js';