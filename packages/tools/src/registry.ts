// Manual tool type registry - update when adding new tools
export interface ToolRegistry {
  'hello-world': {
    input: import('@tools/hello-world').HelloWorldToolInput;
    output: import('@tools/hello-world').HelloWorldToolOutput;
  };
  'ocr': {
    input: import('@tools/ocr').TesseractOcrToolInput;
    output: import('@tools/ocr').TesseractOcrToolOutput;
  };
  'screenshot': {
    input: import('@tools/screenshot').ScreenshotToolInput;
    output: import('@tools/screenshot').ScreenshotToolOutput;
  };
  'screen-region-selector': {
    input: import('@tools/screen-region-selector').ScreenRegionSelectorInput;
    output: import('@tools/screen-region-selector').ScreenRegionSelectorOutput;
  };
  'template-matcher': {
    input: import('@tools/template-matcher').TemplateMatcherInput;
    output: import('@tools/template-matcher').TemplateMatcherOutput;
  };
}

export type ToolId = keyof ToolRegistry;

// Input/Output types for registered tools
export type ToolInput<T extends ToolId> = ToolRegistry[T]['input'];
export type ToolOutput<T extends ToolId> = ToolRegistry[T]['output'];