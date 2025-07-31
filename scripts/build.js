#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building LinkLibrary MCP Server...');

// Clean dist directory
if (fs.existsSync('dist')) {
  console.log('🧹 Cleaning dist directory...');
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync('dist', { recursive: true });

// Compile TypeScript
console.log('📝 Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Copy package.json to dist
console.log('📦 Copying package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: 'server.js',
  bin: {
    'linklibrary-mcp': 'server.js'
  },
  keywords: packageJson.keywords,
  author: packageJson.author,
  license: packageJson.license,
  repository: packageJson.repository,
  dependencies: packageJson.dependencies,
  engines: packageJson.engines,
};

fs.writeFileSync('dist/package.json', JSON.stringify(distPackageJson, null, 2));

// Copy README and LICENSE
console.log('📄 Copying documentation...');
if (fs.existsSync('README.md')) {
  fs.copyFileSync('README.md', 'dist/README.md');
}
if (fs.existsSync('LICENSE')) {
  fs.copyFileSync('LICENSE', 'dist/LICENSE');
}

// Make server.js executable
console.log('🔧 Making server executable...');
const serverPath = path.join('dist', 'server.js');
if (fs.existsSync(serverPath)) {
  fs.chmodSync(serverPath, '755');
}

console.log('🎉 Build completed successfully!');
console.log('📁 Output directory: dist/');
console.log('📦 Ready for npm publish'); 