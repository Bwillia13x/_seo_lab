#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse Artillery Results
function analyzeArtilleryResults(resultsPath) {
  try {
    if (!fs.existsSync(resultsPath)) {
      console.log('❌ Artillery results not found. Run load test first.');
      return null;
    }

    const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    const metrics = report.aggregate;

    const analysis = {
      timestamp: new Date().toISOString(),
      tool: 'artillery',
      metrics: {
        requestsPerSecond: metrics.rps || 0,
        totalRequests: metrics.scenariosCreated || 0,
        meanResponseTime: metrics.responseTimeMean || 0,
        medianResponseTime: metrics.responseTimeMedian || 0,
        p95ResponseTime: metrics.responseTimeP95 || 0,
        p99ResponseTime: metrics.responseTimeP99 || 0,
        errorRate: (metrics.scenariosErred || 0) / (metrics.scenariosCompleted || 1) * 100,
        scenariosCompleted: metrics.scenariosCompleted || 0,
        codes: metrics.codes || {}
      },
      thresholds: {
        performance: metrics.responseTimeMean < 1000,
        reliability: ((metrics.scenariosCompleted || 0) / (metrics.scenariosCreated || 1)) > 0.95,
        availability: (metrics.codes?.['200'] || 0) / Object.values(metrics.codes || {}).reduce((a, b) => a + b, 1) > 0.99
      }
    };

    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing Artillery results:', error.message);
    return null;
  }
}

// Parse Lighthouse Results
function analyzeLighthouseResults(resultsPath) {
  try {
    if (!fs.existsSync(resultsPath)) {
      console.log('❌ Lighthouse results not found. Run performance test first.');
      return null;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const categories = results.categories;

    const analysis = {
      timestamp: new Date().toISOString(),
      tool: 'lighthouse',
      metrics: {
        performance: (categories.performance?.score || 0) * 100,
        accessibility: (categories.accessibility?.score || 0) * 100,
        pwa: (categories.pwa?.score || 0) * 100,
        auditCount: Object.keys(results.audits || {}).length
      },
      thresholds: {
        performance: (categories.performance?.score || 0) >= 0.8,
        accessibility: (categories.accessibility?.score || 0) >= 0.9,
        pwa: (categories.pwa?.score || 0) >= 0.7
      }
    };

    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing Lighthouse results:', error.message);
    return null;
  }
}

// Generate Performance Report
function generateReport() {
  const artilleryPath = path.join(__dirname, 'artillery-results.json');
  const lighthousePath = path.join(__dirname, 'results.json');

  const artilleryAnalysis = analyzeArtilleryResults(artilleryPath);
  const lighthouseAnalysis = analyzeLighthouseResults(lighthousePath);

  const report = {
    reportDate: new Date().toISOString(),
    seoLabPerformance: {
      artillery: artilleryAnalysis,
      lighthouse: lighthouseAnalysis
    },
    summary: {
      overallPerformance: (artilleryAnalysis?.thresholds.performance && lighthouseAnalysis?.thresholds.performance),
      overallReliability: (artilleryAnalysis?.thresholds.reliability),
      overallScore: calculateOverallScore(artilleryAnalysis, lighthouseAnalysis)
    }
  };

  // Save detailed report
  const reportPath = path.join(__dirname, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Console output
  console.log('\n📊 PERFORMANCE TEST REPORT 📊');
  console.log('===============================');

  if (artilleryAnalysis) {
    console.log('\n🚀 LOAD TEST RESULTS (Artillery):');
    console.log(`   Requests/sec: ${artilleryAnalysis.metrics.requestsPerSecond.toFixed(1)}`);
    console.log(`   Completion Rate: ${(artilleryAnalysis.metrics.scenariosCompleted / artilleryAnalysis.metrics.totalRequests * 100).toFixed(1)}%`);
    console.log(`   P95 Response Time: ${artilleryAnalysis.metrics.p95ResponseTime || 'N/A'}ms`);
    console.log(`   Reliability: ${artilleryAnalysis.thresholds.reliability ? '✅ PASS' : '❌ FAIL'}`);
  }

  if (lighthouseAnalysis) {
    console.log('\n⚡ LIGHTHOUSE RESULTS:');
    console.log(`   Performance Score: ${lighthouseAnalysis.metrics.performance.toFixed(1)}/100`);
    console.log(`   Accessibility Score: ${lighthouseAnalysis.metrics.accessibility.toFixed(1)}/100`);
    console.log(`   PWA Score: ${lighthouseAnalysis.metrics.pwa.toFixed(1)}/100`);
    console.log(`   Performance: ${lighthouseAnalysis.thresholds.performance ? '✅ PASS' : '❌ FAIL'}`);
  }

  console.log('\n📋 OVERALL ASSESSMENT:');
  console.log(`   Performance: ${report.summary.overallPerformance ? '✅ PRODUCTION READY' : '❌ NEEDS OPTIMIZATION'}`);
  console.log(`   Reliability: ${report.summary.overallReliability ? '✅ STABLE' : '❌ UNRELIABLE'}`);
  console.log(`   Overall Score: ${report.summary.overallScore.toFixed(1)}/10`);

  console.log('\n💾 Detailed report saved to:', reportPath);
}

function calculateOverallScore(artillery, lighthouse) {
  let score = 0;

  if (artillery) {
    // 4 points for load performance
    if (artillery.thresholds.performance) score += 2;
    if (artillery.thresholds.reliability) score += 2;
  }

  if (lighthouse) {
    // 4 points for quality metrics
    score += (lighthouse.metrics.performance / 100) * 2;
    score += (lighthouse.metrics.accessibility / 100) * 1;
    score += (lighthouse.metrics.pwa / 100) * 1;
  }

  return score;
}

// Run analysis
generateReport();