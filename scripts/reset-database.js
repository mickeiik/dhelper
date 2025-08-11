#!/usr/bin/env node

/**
 * Database Reset Script
 * 
 * This script completely resets the templates database by:
 * 1. Deleting the existing database file
 * 2. Removing all template images and thumbnails
 * 3. The app will recreate the database with the latest schema on next start
 * 
 * Usage: node scripts/reset-database.js
 */

import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Get user data path (same logic as Electron's app.getPath('userData'))
const userDataPath = process.platform === 'win32' 
  ? join(homedir(), 'AppData', 'Roaming', 'dhelper')
  : process.platform === 'darwin'
  ? join(homedir(), 'Library', 'Application Support', 'dhelper')  
  : join(homedir(), '.config', 'dhelper');
const templatesDir = join(userDataPath, 'templates');
const dbPath = join(templatesDir, 'templates.db');
const imagesDir = join(templatesDir, 'images');
const thumbnailsDir = join(templatesDir, 'thumbnails');

console.log('🗑️  Database Reset Script');
console.log('========================');
console.log(`Platform: ${process.platform}`);
console.log(`User data path: ${userDataPath}`);
console.log(`Templates directory: ${templatesDir}`);
console.log(`Database path: ${dbPath}`);
console.log('');

try {
  let itemsRemoved = 0;

  // Remove database file
  if (existsSync(dbPath)) {
    rmSync(dbPath);
    console.log('✅ Removed database file');
    itemsRemoved++;
  } else {
    console.log('ℹ️  Database file not found (already clean)');
  }

  // Remove images directory
  if (existsSync(imagesDir)) {
    rmSync(imagesDir, { recursive: true });
    console.log('✅ Removed images directory');
    itemsRemoved++;
  } else {
    console.log('ℹ️  Images directory not found');
  }

  // Remove thumbnails directory
  if (existsSync(thumbnailsDir)) {
    rmSync(thumbnailsDir, { recursive: true });
    console.log('✅ Removed thumbnails directory');
    itemsRemoved++;
  } else {
    console.log('ℹ️  Thumbnails directory not found');
  }

  console.log('');
  console.log(`🎉 Database reset complete! Removed ${itemsRemoved} items.`);
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Restart the application');
  console.log('   2. The database will be recreated with the latest schema');
  console.log('   3. You can start creating templates with the new features');

} catch (error) {
  console.error('❌ Error resetting database:', error);
  process.exit(1);
}

process.exit(0);