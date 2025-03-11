#!/usr/bin/env node

/**
 * Node.js version check script
 * 
 * This script checks if the current Node.js version meets the minimum requirements.
 * It's designed to be run as a postinstall script.
 */

const requiredNodeVersion = '16.0.0';
const currentNodeVersion = process.versions.node;

/**
 * Compare two semantic version strings
 * @param {string} v1 First version
 * @param {string} v2 Second version
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// Check if current Node.js version meets the requirements
if (compareVersions(currentNodeVersion, requiredNodeVersion) < 0) {
  console.error('\x1b[31m%s\x1b[0m', '╔════════════════════════════════════════════════════════════════╗');
  console.error('\x1b[31m%s\x1b[0m', '║                        ⚠️  WARNING ⚠️                         ║');
  console.error('\x1b[31m%s\x1b[0m', '╟────────────────────────────────────────────────────────────────╢');
  console.error('\x1b[31m%s\x1b[0m', `║ This application requires Node.js ${requiredNodeVersion} or higher.        ║`);
  console.error('\x1b[31m%s\x1b[0m', `║ You are currently running Node.js ${currentNodeVersion.padEnd(10)}              ║`);
  console.error('\x1b[31m%s\x1b[0m', '╟────────────────────────────────────────────────────────────────╢');
  console.error('\x1b[31m%s\x1b[0m', '║ Please upgrade your Node.js version or use nvm:                ║');
  console.error('\x1b[31m%s\x1b[0m', '║                                                                ║');
  console.error('\x1b[31m%s\x1b[0m', '║ 1. Install nvm (Node Version Manager)                          ║');
  console.error('\x1b[31m%s\x1b[0m', '║    https://github.com/nvm-sh/nvm                               ║');
  console.error('\x1b[31m%s\x1b[0m', '║                                                                ║');
  console.error('\x1b[31m%s\x1b[0m', '║ 2. Install the correct Node.js version:                        ║');
  console.error('\x1b[31m%s\x1b[0m', '║    $ nvm install 16                                            ║');
  console.error('\x1b[31m%s\x1b[0m', '║                                                                ║');
  console.error('\x1b[31m%s\x1b[0m', '║ 3. Use the correct Node.js version:                            ║');
  console.error('\x1b[31m%s\x1b[0m', '║    $ nvm use 16                                                ║');
  console.error('\x1b[31m%s\x1b[0m', '║                                                                ║');
  console.error('\x1b[31m%s\x1b[0m', '║ 4. Try installing again                                        ║');
  console.error('\x1b[31m%s\x1b[0m', '╚════════════════════════════════════════════════════════════════╝');
  
  // Exit with error code
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m', `✓ Node.js version check passed (${currentNodeVersion} >= ${requiredNodeVersion})`);
}
