# Stop node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Delete old dependencies & cache
Remove-Item -Recurse -Force .\node_modules
Remove-Item -Force .\package-lock.json
npm cache clean --force

# Make sure env variable disables auto build is unset
Remove-Item Env:\OPENCV4NODEJS_DISABLE_AUTOBUILD -ErrorAction SilentlyContinue
$env:OPENCV4NODEJS_DISABLE_AUTOBUILD = "1"
$env:OPENCV_INCLUDE_DIR = "C:\opencv\build\include"
$env:OPENCV_LIB_DIR = "C:\opencv\build\x64\vc16\lib"
$env:OPENCV_BIN_DIR = "C:\opencv\build\x64\vc16\bin"

# Run install with verbose logging to see more details
npm install @u4/opencv-build --verbose
npm install @u4/opencv4nodejs --verbose
npm install --save-dev @electron/rebuild
npx @electron/rebuild
npm i
# npm run compile