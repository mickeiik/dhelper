import type { OverlayService } from '@app/types';

export type ModuleContext = {
  readonly app: Electron.App;
  readonly overlayService?: OverlayService;
}
