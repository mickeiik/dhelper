import type { AppInitConfig } from './AppInitConfig.js';
import { createModuleRunner } from './ModuleRunner.js';
import { disallowMultipleAppInstance } from './modules/electron/SingleInstanceApp.js';
import { createWindowManagerModule } from './modules/electron/WindowManager.js';
import { terminateAppOnLastWindowClose } from './modules/electron/ApplicationTerminatorOnLastWindowClose.js';
import { hardwareAccelerationMode } from './modules/electron/HardwareAccelerationModule.js';
//import {autoUpdater} from './modules/AutoUpdater.js';
import { allowInternalOrigins } from './modules/electron/BlockNotAllowdOrigins.js';
import { allowExternalUrls } from './modules/electron/ExternalUrls.js';
import { initializeToolModule } from './modules/ToolModule.js';
import { initializeWorkflowModule } from './modules/WorkflowModule.js';
import { initializeTemplateModule } from './modules/TemplateModule.js';
import { createOverlayModule } from './modules/OverlayModule.js';

export async function initApp(initConfig: AppInitConfig) {
  // Create overlay module early so we can set it on the module runner
  const overlayModule = createOverlayModule();
  
  const moduleRunner = createModuleRunner()
    .setOverlayService(overlayModule.getOverlayService())
    .init(createWindowManagerModule({ initConfig, openDevTools: import.meta.env.DEV }))
    .init(disallowMultipleAppInstance())
    .init(terminateAppOnLastWindowClose())
    .init(hardwareAccelerationMode({ enable: false }))
    // .init(autoUpdater()) //Disable for now as there issue with the CI now being able to query for new releases of a privat github repo

    // Install DevTools extension if needed
    // .init(chromeDevToolsExtension({extension: 'VUEJS3_DEVTOOLS'}))

    // Security
    .init(allowInternalOrigins(
      new Set(initConfig.renderer instanceof URL ? [initConfig.renderer.origin] : []),
    ))
    .init(allowExternalUrls(
      new Set(
        initConfig.renderer instanceof URL
          ? [

          ]
          : [],
      )),
    )

    .init(overlayModule)
    .init(initializeToolModule())
    .init(initializeWorkflowModule())
    .init(initializeTemplateModule());

  await moduleRunner;
}
