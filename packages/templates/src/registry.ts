export interface TemplateRegistry {}

export type TemplateId = keyof TemplateRegistry;

// Template reference types for registered templates
export type TemplateRef<T extends TemplateId> = TemplateRegistry[T];

// Helper type for template references in workflows
export interface TemplateReference {
  $ref: string; // Format: {{template:template-id}} or {{template:category/name}}
}