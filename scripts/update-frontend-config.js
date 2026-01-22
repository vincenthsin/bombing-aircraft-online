#!/usr/bin/env node

/**
 * Update Frontend Configuration
 * Updates frontend/vercel.json with actual backend URL
 *
 * Usage:
 *   node scripts/update-frontend-config.js <backend-url>
 *
 * Example:
 *   node scripts/update-frontend-config.js https://my-backend.vercel.app
 */

const fs = require('fs');
const path = require('path');

const backendUrl = process.argv[2];

if (!backendUrl) {
  console.error('Usage: node scripts/update-frontend-config.js <backend-url>');
  console.error('Example: node scripts/update-frontend-config.js https://my-backend.vercel.app');
  process.exit(1);
}

// Validate URL format
try {
  new URL(backendUrl);
} catch (e) {
  console.error('Error: Invalid URL format');
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'frontend', 'vercel.json');

try {
  // Read current config
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Update environment variables
  if (config.env) {
    config.env.API_BASE_URL = backendUrl;
    config.env.SOCKET_URL = backendUrl;
  }

  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('✅ Frontend configuration updated successfully!');
  console.log(`API_BASE_URL: ${backendUrl}`);
  console.log(`SOCKET_URL: ${backendUrl}`);
  console.log(`Updated file: ${configPath}`);

} catch (error) {
  console.error('Error updating frontend configuration:', error.message);
  process.exit(1);
}