import { AppModule } from './AppModule.js';
import { ModuleContext } from './ModuleContext.js';
import type { OverlayService } from './modules/OverlayModule.js';
import { app } from 'electron';

class ModuleRunner {
  #modules: AppModule[] = [];
  #overlayService?: OverlayService;

  constructor() {
  }

  async run(): Promise<void> {
    for (const module of this.#modules) {
      const result = module.enable(this.#createModuleContext());
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  init(module: AppModule) {
    this.#modules.push(module);
    return this;
  }

  setOverlayService(overlayService: OverlayService) {
    this.#overlayService = overlayService;
    return this;
  }

  #createModuleContext(): ModuleContext {
    return {
      app,
      overlayService: this.#overlayService,
    };
  }
}

export function createModuleRunner() {
  return new ModuleRunner();
}
