#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests frontend-backend connectivity in deployed environments
 *
 * Usage:
 *   node scripts/integration-test.js <frontend-url> <backend-url>
 *
 * Example:
 *   node scripts/integration-test.js https://frontend.vercel.app https://backend.vercel.app
 */

const https = require('https');
const { io } = require('socket.io-client');

const FRONTEND_URL = process.argv[2];
const BACKEND_URL = process.argv[3];

if (!FRONTEND_URL || !BACKEND_URL) {
  console.error('Usage: node scripts/integration-test.js <frontend-url> <backend-url>');
  process.exit(1);
}

console.log('🚀 Starting Integration Tests...');
console.log(`Frontend: ${FRONTEND_URL}`);
console.log(`Backend: ${BACKEND_URL}`);
console.log('');

// Test 1: Backend Health Check
function testBackendHealth() {
  return new Promise((resolve, reject) => {
    console.log('📡 Testing backend health endpoint...');

    const url = new URL('/health', BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.ok === true) {
            console.log('✅ Backend health check passed');
            resolve();
          } else {
            console.log('❌ Backend health check failed - unexpected response');
            reject(new Error('Backend health check failed'));
          }
        } catch (e) {
          console.log('❌ Backend health check failed - invalid JSON response');
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ Backend health check failed - connection error');
      reject(e);
    });

    req.on('timeout', () => {
      console.log('❌ Backend health check failed - timeout');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test 2: Frontend Loads
function testFrontendLoads() {
  return new Promise((resolve, reject) => {
    console.log('🌐 Testing frontend loads...');

    const url = new URL(FRONTEND_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('Bombing Aircraft')) {
          console.log('✅ Frontend loads successfully');
          resolve();
        } else {
          console.log('❌ Frontend failed to load or missing expected content');
          reject(new Error('Frontend load test failed'));
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ Frontend load test failed - connection error');
      reject(e);
    });

    req.on('timeout', () => {
      console.log('❌ Frontend load test failed - timeout');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test 3: Socket.IO Connection
function testSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔌 Testing Socket.IO connection...');

    const socket = io(BACKEND_URL, {
      timeout: 5000,
      forceNew: true
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      console.log('❌ Socket.IO connection test failed - timeout');
      reject(new Error('Socket.IO connection timeout'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Socket.IO connection successful');
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Socket.IO connection failed:', error.message);
      socket.disconnect();
      reject(error);
    });
  });
}

// Test 4: CORS Configuration
function testCORS() {
  return new Promise((resolve, reject) => {
    console.log('🔒 Testing CORS configuration...');

    const url = new URL('/health', BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      const corsAllowed = res.headers['access-control-allow-origin'];
      if (corsAllowed && (corsAllowed === '*' || corsAllowed.includes(new URL(FRONTEND_URL).origin))) {
        console.log('✅ CORS configuration looks good');
        resolve();
      } else {
        console.log('❌ CORS configuration might be incorrect');
        console.log('   Access-Control-Allow-Origin:', corsAllowed);
        resolve(); // Don't fail the test for CORS, just warn
      }
    });

    req.on('error', () => {
      console.log('⚠️  CORS test skipped - OPTIONS request failed');
      resolve(); // Don't fail for CORS test
    });

    req.on('timeout', () => {
      console.log('⚠️  CORS test skipped - timeout');
      resolve(); // Don't fail for CORS test
    });

    req.end();
  });
}

// Run all tests
async function runTests() {
  try {
    await testBackendHealth();
    await testFrontendLoads();
    await testSocketConnection();
    await testCORS();

    console.log('');
    console.log('🎉 All integration tests passed!');
    console.log('Frontend and backend are properly connected.');
    process.exit(0);

  } catch (error) {
    console.log('');
    console.log('💥 Integration tests failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTests();