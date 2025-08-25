import type { OverlayService } from './modules/OverlayModule.js';

export type ModuleContext = {
  readonly app: Electron.App;
  readonly overlayService?: OverlayService;
}
