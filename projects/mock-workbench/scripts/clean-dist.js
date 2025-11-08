const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.log('dist folder not found — nothing to remove:', distDir);
  process.exitCode = 0;
} else {
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('Removed dist folder:', distDir);
    process.exitCode = 0;
  } catch (err) {
    console.error('Failed to remove dist folder:', err);
    process.exitCode = 1;
  }
}
