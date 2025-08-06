// packages/tools/src/index.ts
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

// Import auto-generated tool imports for TypeScript autocomplete
import './auto-imports.js';

import type { Tool, ToolMetadata } from '@app/types';

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

            if (!existsSync(toolsPath)) {
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

            // Create tool instance to get full metadata
            const tempTool = await factory();
            this.registerToolWithMetadata(tempTool, factory);

        } catch (error) {
            console.warn(`Failed to load tool ${toolName}:`, error);
        }
    }

    private registerToolWithMetadata(tool: Tool, factory: () => Promise<Tool>) {
        // Store the full tool instance with all metadata
        this.tools.set(tool.id, {
            tool: tool, // Full tool instance with metadata
            initialized: false, // Mark as not initialized for execution
            factory
        });
        // Tool registered with metadata
    }

    registerTool(id: string, name: string, factory: () => Promise<Tool>) {
        // Fallback for manual registration - create minimal tool object
        this.tools.set(id, {
            tool: { id, name } as Tool,
            initialized: false,
            factory
        });
        // Tool registered (lazy)
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

            const result = await registration.tool.execute(inputs);
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
            // If we have a factory and tool isn't fully initialized, reinitialize
            if (registration.factory && !registration.initialized) {
                const newToolInstance = await registration.factory();
                // Copy metadata but mark as initialized
                registration.tool = newToolInstance;
                await registration.tool.initialize({});
                registration.initialized = true;
            }
        } catch (error) {
            console.error(`Failed to initialize tool "${id}":`, error);
            throw error;
        }
    }

    getTools(): Tool[] {
        // Return full tool objects with all metadata
        return Array.from(this.tools.values()).map(({ tool }) => tool);
    }

    getToolsMetadata(): ToolMetadata[] {
        return Array.from(this.tools.values()).map(({ tool }) => {
            return {
                id: tool.id,
                name: tool.name,
                description: tool.description,
                category: tool.category,
                inputFields: tool.inputFields,
                examples: tool.examples
            }

        });
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

// Re-export shared types for convenience
export type { Tool, ToolMetadata } from '@app/types';