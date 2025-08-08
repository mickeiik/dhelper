
export default /** @type import('electron-builder').Configuration */
({
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  generateUpdatesFilesForAllChannels: true,
  // linux: {
  //   target: ['deb'],
  // },
  /**
   * It is recommended to avoid using non-standard characters such as spaces in artifact names,
   * as they can unpredictably change during deployment, making them impossible to locate and download for update.
   */
  icon: 'buildResources/icon.png',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  asarUnpack: [
    '**/@u4/**',
    '**/opencv4nodejs/**',
    '**/opencv-build/**', 
    '**/tesseract.js/**',
    '**/screenshot-desktop/**',
    '**/@nut-tree-fork/**',
    '**/detect-libc/**',
    '**/sharp/**',
    '**/packages/overlay/**',
  ],
  files: [
    '**/*',
    'node_modules/**',
    'packages/overlay/**',
    '!**/node_modules/@nut-tree-fork/node-mac-permissions/**',
    '!**/node_modules/@nut-tree-fork/node-linux-permissions/**',
  ],
  extraResources: [
    {
      from: 'C:\\opencv\\build\\x64\\vc16\\bin',
      to: 'opencv\\bin',
    },
    {
      from: 'C:\\opencv\\build\\include',
      to: 'opencv\\include'
    },
    {
      from: 'C:\\opencv\\build\\x64\\vc16\\lib',
      to: 'opencv\\lib',
    }
  ],
  extraFiles: [
    {
      from: 'buildResources/runtime-package.json',
      to: 'package.json'
    }
  ],
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  npmRebuild: false,
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
});

