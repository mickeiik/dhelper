import {fileURLToPath} from 'node:url';
import {join, dirname} from 'node:path';
import {writeFileSync} from 'node:fs';
import {app, dialog} from 'electron';

// Configure OpenCV environment variables FIRST before any other imports
if (process.env.NODE_ENV !== 'development') {
  const resourcesPath = process.resourcesPath;
  const opencvPath = join(resourcesPath, 'opencv');
  
  // Set opencv4nodejs configuration environment variables
  process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '1';
  process.env.OPENCV_INCLUDE_DIR = join(opencvPath, 'include');
  process.env.OPENCV_LIB_DIR = join(opencvPath, 'lib');
  process.env.OPENCV_BIN_DIR = join(opencvPath, 'bin');
  
  // Add OpenCV bin directory to PATH so DLLs can be found at runtime
  const currentPath = process.env.PATH || '';
  process.env.PATH = `${join(opencvPath, 'bin')};${currentPath}`;
  
  console.log('OpenCV configured for production:', {
    OPENCV_BIN_DIR: process.env.OPENCV_BIN_DIR,
    OPENCV_LIB_DIR: process.env.OPENCV_LIB_DIR,
    OPENCV_INCLUDE_DIR: process.env.OPENCV_INCLUDE_DIR,
    OPENCV4NODEJS_DISABLE_AUTOBUILD: process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD
  });
}

// Import main app AFTER environment variables are set
import {initApp} from '@app/main';

// Always enable error logging, even in production
function showAndExit(...args) {
  const errorMsg = args.join(' ');
  console.error(errorMsg);
  
  // Write error to log file in production
  if (process.env.NODE_ENV !== 'development') {
    try {
      const logPath = join(process.cwd(), 'dhelper-error.log');
      const timestamp = new Date().toISOString();
      writeFileSync(logPath, `[${timestamp}] ${errorMsg}\n`, { flag: 'a' });
      dialog.showErrorBox('Application Error', `${errorMsg}\n\nError logged to: ${logPath}`);
    } catch (e) {
      dialog.showErrorBox('Application Error', errorMsg);
    }
  }
  process.exit(1);
}

process.on('uncaughtException', showAndExit);
process.on('unhandledRejection', showAndExit);

// noinspection JSIgnoredPromiseFromCall
/**
 * We resolve '@app/renderer' and '@app/preload'
 * here and not in '@app/main'
 * to observe good practices of modular design.
 * This allows fewer dependencies and better separation of concerns in '@app/main'.
 * Thus,
 * the main module remains simplistic and efficient
 * as it receives initialization instructions rather than direct module imports.
 */
initApp(
  {
    renderer: (process.env.MODE === 'development' && !!process.env.VITE_DEV_SERVER_URL) ?
      new URL(process.env.VITE_DEV_SERVER_URL)
      : {
        path: fileURLToPath(import.meta.resolve('@app/renderer')),
      },

    preload: {
      path: fileURLToPath(import.meta.resolve('@app/preload/exposed.mjs')),
    },
  },
);
