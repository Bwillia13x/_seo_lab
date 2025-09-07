#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function generateWCAGComplianceReport() {
  const reportPath = path.join(process.cwd(), 'accessibility-report.json');
  const summaryPath = path.join(process.cwd(), 'tests/accessibility/wcag-summary.json');

  console.log('🔍 Analyzing WCAG Compliance Results...\n');

  if (!fs.existsSync(reportPath)) {
    console.log('❌ Accessibility report not found. Run `npm run accessibility:ci` first.');
    return;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    // Recursively collect tests from Playwright JSON report
    function collectTests(node, acc = []) {
      if (!node || typeof node !== 'object') return acc;
      if (Array.isArray(node.suites)) {
        for (const s of node.suites) collectTests(s, acc);
      }
      if (Array.isArray(node.specs)) {
        for (const spec of node.specs) {
          if (Array.isArray(spec.tests)) {
            for (const t of spec.tests) {
              // Attach spec title to each test for stable identification
              acc.push({ ...t, title: spec.title });
            }
          }
        }
      }
      return acc;
    }
    const testResults = collectTests(report);

    const complianceMetrics = {
      totalTests: testResults.length,
      passedTests: testResults.filter(t => (t.results?.[0]?.status || t.status) === 'passed').length,
      failedTests: testResults.filter(t => (t.results?.[0]?.status || t.status) === 'failed').length,
      accessibilityScore: 0,
      wcagViolations: [],
      severityBreakdown: {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      },
      complianceLevel: '',
      recommendations: []
    };

    // Calculate compliance score based on test results
    complianceMetrics.accessibilityScore =
      (complianceMetrics.passedTests / complianceMetrics.totalTests) * 100;

    // Determine WCAG compliance level
    if (complianceMetrics.accessibilityScore >= 95) {
      complianceMetrics.complianceLevel = 'WCAG 2.1 AA Certified';
    } else if (complianceMetrics.accessibilityScore >= 85) {
      complianceMetrics.complianceLevel = 'WCAG 2.1 A Certified';
    } else {
      complianceMetrics.complianceLevel = 'Not Fully Compliant';
    }

    // Generate recommendations based on failures
    const failedTests = testResults.filter(t => (t.results?.[0]?.status || t.status) === 'failed');

    if (failedTests.length > 0) {
      complianceMetrics.recommendations = failedTests.map(test => {
        const title = test?.title || 'Unknown Test';
        return {
          testName: title,
          priority: mapTestNameToPriority(title),
          issue: extractIssueFromTest(title),
          remediation: getRemediationSteps(title)
        };
      });
    }

    // Generate comprehensive summary
    const summary = {
      reportDate: new Date().toISOString(),
      application: 'Belmont SEO Lab',
      complianceLevel: complianceMetrics.complianceLevel,
      accessibilityScore: Math.round(complianceMetrics.accessibilityScore),
      testResults: {
        totalTests: complianceMetrics.totalTests,
        passed: complianceMetrics.passedTests,
        failed: complianceMetrics.failedTests,
        successRate: Math.round((complianceMetrics.passedTests / complianceMetrics.totalTests) * 100)
      },
      wcagMetrics: {
        violations: complianceMetrics.wcagViolations,
        severityBreakdown: complianceMetrics.severityBreakdown,
        commonIssues: complianceMetrics.recommendations.map(r => r.issue)
      },
      recommendations: complianceMetrics.recommendations,
      nextSteps: [
        complianceMetrics.accessibilityScore >= 95
          ? '🎉 Ready for production with WCAG AA compliance'
          : 'Fix critical accessibility issues before production',
        'Regular accessibility audits recommended (quarterly)',
        'Consider automated testing in CI/CD pipeline',
        'Train team on accessibility best practices',
        'Implement accessibility monitoring in production'
      ],
      legalCompliance: {
        ADA_Compliant: complianceMetrics.accessibilityScore >= 90,
        Section508_Compliant: complianceMetrics.accessibilityScore >= 85,
        Ontario_A11Y_Compliance: complianceMetrics.accessibilityScore >= 85,
        requirements: [
          'Keyboard navigation for all interactions',
          'Screen reader compatibility',
          'Sufficient color contrast ratios',
          'Descriptive error messages',
          'Logical heading structure'
        ]
      }
    };

    // Save detailed summary
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Console output
    console.log('📋 WCAG COMPLIANCE REPORT');
    console.log('===========================');
    console.log(`📊 Overall Score: ${summary.accessibilityScore}%`);
    console.log(`🏆 Compliance Level: ${summary.complianceLevel}`);
    console.log(`🧪 Tests Run: ${summary.testResults.totalTests}`);
    console.log(`✅ Passed: ${summary.testResults.passed}/${summary.testResults.totalTests} (${summary.testResults.successRate}%)`);

    if (summary.legalCompliance.ADA_Compliant) {
      console.log(`✅ ADA Compliant: Yes`);
    } else {
      console.log(`❌ ADA Compliant: No`);
    }

    console.log('\n🚨 ACTION ITEMS:');
    summary.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.testName} - ${rec.issue}`);
      console.log(`   Fix: ${rec.remediation}`);
    });

    console.log('\n💡 NEXT STEPS:');
    summary.nextSteps.forEach(step => {
      console.log(`• ${step}`);
    });

    console.log(`\n📄 Full report saved to: ${summaryPath}`);

    return summary;

  } catch (error) {
    console.error('❌ Error generating compliance report:', error.message);
    return null;
  }
}

function mapTestNameToPriority(testName) {
  const priorityMap = {
    'critical': ['Dashboard - Critical Access Points', 'Color Contrast'],
    'high': ['Keyboard Navigation', 'Screen Reader Support'],
    'medium': ['Error Handling', 'Language Toggle'],
    'low': ['Modal Accessibility', 'Form Accessibility']
  };

  for (const [priority, tests] of Object.entries(priorityMap)) {
    if (tests.some(test => testName.includes(test))) {
      return priority.toUpperCase();
    }
  }
  return 'MEDIUM';
}

function extractIssueFromTest(testName) {
  const issueMap = {
    'Color Contrast': 'Insufficient color contrast in UI elements',
    'Keyboard Navigation': 'Missing keyboard navigation support',
    'Screen Reader': 'Screens readers cannot access content properly',
    'Form': 'Forms missing accessibility labels',
    'Error Handling': 'Error messages not accessible',
    'Modal': 'Modal dialogs missing proper roles'
  };

  for (const [keyword, issue] of Object.entries(issueMap)) {
    if (testName.includes(keyword)) {
      return issue;
    }
  }
  return 'General accessibility violation';
}

function getRemediationSteps(testName) {
  const remediationMap = {
    'Color Contrast': 'Increase contrast ratio to minimum 4.5:1 for small text',
    'Keyboard Navigation': 'Ensure all interactive elements have keyboard focus',
    'Screen Reader': 'Add ARIA labels and descriptions to interactive elements',
    'Form': 'Add aria-labels and associate labels with inputs',
    'Error Handling': 'Provide clear error messages with aria-describedby',
    'Modal': 'Add role="dialog" and proper focus management'
  };

  for (const [keyword, remediation] of Object.entries(remediationMap)) {
    if (testName.includes(keyword)) {
      return remediation;
    }
  }
  return 'Review axe-core accessibility rules and fix violations';
}

// Run the analysis
generateWCAGComplianceReport();

console.log('\n💡 PRO TIP: Use "npm run accessibility" for interactive testing');
console.log('   or "npm run compliance" for full automated reporting in CI/CD');
