// packages/main/src/modules/security.ts
import { shell, app } from 'electron';
import type { AppInitConfig } from '../AppInitConfig.js';

export function initializeSecurity(initConfig: AppInitConfig) {
  const allowedOrigins = new Set(
    initConfig.renderer instanceof URL ? [initConfig.renderer.origin] : []
  );

  // Block navigation to external URLs
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (navigationEvent, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      if (!allowedOrigins.has(parsedUrl.origin)) {
        navigationEvent.preventDefault();
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      const parsedUrl = new URL(url);
      
      // Allow internal origins
      if (allowedOrigins.has(parsedUrl.origin)) {
        return { action: 'allow' };
      }
      
      // Open external URLs in default browser
      shell.openExternal(url);
      return { action: 'deny' };
    });
  });
}