import { createOverlayService, type OverlayService, type OverlayConfig } from '@app/overlay';
import { getConfig } from '../config/index.js';

let overlayService: OverlayService;

export async function initializeOverlay(): Promise<OverlayService> {
  const config = getConfig();
  
  // Create overlay config from main config
  const overlayConfig: OverlayConfig = {
    transparent: config.overlay.transparent,
    alwaysOnTop: config.overlay.alwaysOnTop,
    clickThrough: config.overlay.clickThrough,
    htmlPaths: config.overlay.htmlPaths,
    ui: {
      showInstructions: config.ui.showInstructions,
      overlayTimeout: config.ui.overlayTimeout
    }
  };

  overlayService = createOverlayService(overlayConfig);
  return overlayService;
}

export async function cleanupOverlays(): Promise<void> {
  if (overlayService) {
    console.log('Cleaning up overlay windows...');
    await overlayService.closeAllOverlays();
  }
}

export { type OverlayService } from '@app/overlay';