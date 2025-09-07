import { request } from '@playwright/test';

// Global teardown for visual regression tests
async function globalTeardown() {
  console.log('\n🧹 Cleaning up Visual Regression Test Environment...');

  const checkServer = await request.newContext();

  // Generate visual test summary report
  try {
    const visualResultsPath = './visual-reporting-results.json';
    const fs = require('fs');

    if (fs.existsSync(visualResultsPath)) {
      const results = JSON.parse(fs.readFileSync(visualResultsPath, 'utf8'));

      // Summary statistics
      const passedTests = results.suites?.filter((s: any) => s.specs?.every((sp: any) => sp.tests?.every((t: any) => t.result === 'passed'))) || [];
      const failedTests = results.suites?.filter((s: any) => s.specs?.some((sp: any) => sp.tests?.some((t: any) => t.result === 'failed'))) || [];
      const totalTests = results.suites?.length || 0;

      console.log('\n📊 VISUAL TEST SUMMARY:');
      console.log(`   ✅ Passed: ${passedTests.length}`);
      console.log(`   ❌ Failed: ${failedTests.length}`);
      console.log(`   📊 Total: ${totalTests}`);
      console.log(`   📈 Success Rate: ${(passedTests.length / totalTests * 100).toFixed(1)}%`);

      if (failedTests.length > 0) {
        console.log('\n⚠️ VISUAL REGRESSIONS DETECTED:');
        failedTests.forEach((suite: any) => {
          suite.specs.forEach((spec: any) => {
            spec.tests?.filter((test: any) => test.result !== 'passed').forEach((test: any) => {
              console.log(`   • ${suite.title} → ${spec.title}: ${test.error}`);
            });
          });
        });

        console.log('\n💡 HINT: Review screenshots in ./test-results/screenshots/');
        console.log('   Update baselines if changes are intentional: npm run visual:baseline');
      } else {
        console.log('\n🎉 No visual regressions detected!');
      }
    }

  } catch (error) {
    console.log(`⚠️ Could not generate summary report: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Clean up resources
  try {
    await checkServer.get('http://localhost:3000/apps/dashboard', { timeout: 1000 });
    console.log('✅ Server cleanup check completed');
  } catch {
    // Server already stopped or not accessible
  }

  await checkServer.dispose();
  console.log('🧹 Visual regression cleanup complete');
}

export default globalTeardown;