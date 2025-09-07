import { request } from '@playwright/test';

// Global setup for visual regression tests
async function globalSetup() {
  console.log('🎯 Setting up Visual Regression Test Environment...');

  // Check if the app is already running
  const checkServer = await request.newContext();
  try {
    // Test server availability
    const response = await checkServer.get('http://localhost:3000/');
    if (response.status() === 200) {
      console.log('✅ Next.js server is already running');
    } else {
      console.log('⚠️ Next.js server responded with status:', response.status());
    }
  } catch (error) {
    console.log('⚠️ Next.js server does not appear to be running');
    console.log('💡 Start the server with: npm run dev');
  }

  // Ensure screenshot directories exist
  const fs = require('fs');
  const path = require('path');

  const dirs = [
    path.join(process.cwd(), 'tests/__screenshots__'),
    path.join(process.cwd(), 'test-results/screenshots'),
    path.join(process.cwd(), 'visual-reports/differences')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Warm up the application for consistent screenshots
  try {
    console.log('🔥 Warming up application for visual testing...');
    await checkServer.post('http://localhost:3000/api/health');
    await checkServer.get('http://localhost:3000/apps/dashboard');
    console.log('✅ Application warmed up successfully');
  } catch (error) {
    console.log('⚠️ Application warmup failed, continuing...');
  }

  await checkServer.dispose();
  console.log('🎯 Visual regression setup complete');
}

export default globalSetup;