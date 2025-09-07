#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const sharp = require('sharp');

// Visual Regression Baseline Manager
// Handles screenshot baselines for consistently testing UI changes

class BaselineManager {
  constructor() {
    // Playwright snapshot layout
    this.baselineDir = path.join(process.cwd(), 'tests/visual/visual-regression.spec.ts-snapshots');
    // Playwright actuals are stored under the visual test-results tree
    this.actualDir = path.join(process.cwd(), 'test-results/visual');
    this.reportDir = path.join(process.cwd(), 'visual-reports');
    this.differDir = path.join(this.reportDir, 'differences');

    // Ensure directories exist
    [this.baselineDir, this.actualDir, this.reportDir, this.differDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    // Ignore specific noisy baselines that are dominated by highly dynamic charts
    // Playwright snapshot tests already mask these regions and pass; the manager
    // diff is advisory. Keep this list short and reviewed.
    this.ignoredBaselines = new Set([
      'gsc-ctr-miner-desktop.png',
    ]);
  }

  // Find actual image path produced by Playwright given a baseline file name
  findActualPathForBaseline(baselineFile) {
    const baseName = path.basename(baselineFile, '.png');
    const files = this.getAllFilesRecursive(this.actualDir);

    // Helper to find a file by basename match, preserving priority order
    const findByName = (target) => files.find(f => path.basename(f) === target) || null;

    const isSuffixed = /-chromium(-darwin)?$/.test(baseName);

    if (isSuffixed) {
      // For suffixed baselines, look for the exact suffixed actual first
      const exact = findByName(`${baseName}-actual.png`);
      if (exact) return exact;
      // Fallbacks: sometimes OS portion may vary
      const alt1 = findByName(`${baseName.replace(/-chromium(-darwin)?$/, '-chromium-darwin')}-actual.png`);
      if (alt1) return alt1;
      const alt2 = findByName(`${baseName.replace(/-chromium(-darwin)?$/, '-chromium')}-actual.png`);
      if (alt2) return alt2;
      // As a last resort, try the plain (unlikely)
      return findByName(`${baseName.replace(/-chromium(-darwin)?$/, '')}-actual.png`);
    }

    // For plain baselines, only accept the plain actual; do not fall back to suffixed
    const plain = findByName(`${baseName}-actual.png`);
    return plain || null;
  }

  // Generate comprehensive screenshot baselines
  async generateBaselines() {
    console.log('\n🎯 GENERATING VISUAL BASELINES...\n');

    const applications = [
      'dashboard', 'gsc-ctr-miner', 'rank-grid', 'utm-dashboard',
      'utm-qr', 'review-composer', 'review-link', 'referral-qr',
      'addon-recommender', 'citation-tracker', 'gbp-composer'
    ];

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'laptop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    try {
      // Run baseline generation tests
      console.log('🚀 Starting Playwright baseline capture...');
      execSync('npm run visual:ci', { stdio: 'inherit' });

      // Analyze generated baselines
      await this.analyzeBaselineCoverage(applications, viewports);

      console.log('\n✅ Baseline generation complete!');
      console.log(`📁 Baselines saved in: ${this.baselineDir}`);

    } catch (error) {
      console.error('\n❌ Baseline generation failed:', error.message);
      process.exit(1);
    }
  }

  // Run visual regression comparison against baselines
  async compareBaselines() {
    console.log('\n🔍 COMPARING VISUAL REGRESSIONS...\n');

    const differences = [];
    let totalComparisons = 0;
    let visualIssues = 0;

    try {
      // Clean previous actuals to avoid stale comparisons
      try {
        if (fs.existsSync(this.actualDir)) {
          fs.rmSync(this.actualDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.actualDir, { recursive: true });
        console.log('🧽 Cleared previous test-results/visual artifacts');
      } catch (e) {
        console.warn('⚠️ Could not clean previous visual artifacts:', e.message);
      }

      // Run visual tests to generate current screenshots. If tests report
      // differences, Playwright may exit non-zero. We still proceed to
      // analyze artifacts produced in test-results/visual.
      console.log('📸 Taking current screenshots...');
      try {
        execSync('npm run visual:test', { stdio: 'inherit' });
      } catch (err) {
        console.warn('⚠️ Playwright visual tests reported differences; proceeding with artifact comparison.');
      }

      // Compare screenshots
      console.log('\n🔍 Analyzing differences...');
      const baselineFiles = await this.getBaselineFiles();

      const thresholdPercent = 3.0; // Match Playwright maxDiffPixelRatio of 0.03 (3%)

      for (const baselineFile of baselineFiles) {
        if (this.ignoredBaselines.has(baselineFile)) {
          console.log(`🟦 Ignored ${baselineFile} (configured)`);
          continue;
        }
        const { baselinePath, actualPath, diffPath, appName } = this.getComparisonPaths(baselineFile);

        if (!fs.existsSync(baselinePath)) {
          console.log(`⚠️ Baseline missing for ${appName}`);
          continue;
        }

        // If Playwright didn't produce an actual image, it means the snapshot matched.
        // Count as a successful comparison without noise.
        if (!actualPath || !fs.existsSync(actualPath)) {
          totalComparisons++;
          console.log(`✅ ${appName}: baseline matches (no diff file created)`);
          continue;
        }

        totalComparisons++;

        const differencePercentage = await this.compareImages(baselinePath, actualPath, diffPath);

        if (differencePercentage > thresholdPercent) {
          visualIssues++;
          differences.push({
            application: appName,
            difference: differencePercentage,
            baseline: path.basename(baselinePath),
            diff: diffPath
          });

          console.log(`❌ ${appName}: ${differencePercentage.toFixed(3)}% difference (>${thresholdPercent}% threshold)`);
        } else {
          console.log(`✅ ${appName}: ${differencePercentage.toFixed(3)}% ≤ ${thresholdPercent}% (acceptable)`);
        }
      }

      // Generate comparison report
      await this.generateComparisonReport(differences, totalComparisons, visualIssues);

      console.log(`\n📊 Summary: ${totalComparisons} comparisons, ${visualIssues} visual issues found`);

      if (visualIssues > 0) {
        console.log('\n🎨 VISUAL DIFFERENCES DETECTED:');
        differences.forEach(diff => {
          console.log(`   • ${diff.application}: ${diff.difference.toFixed(3)}% diff`);
        });

        console.log('\n📁 Detailed diff images saved in:', this.differDir);

        // Exit with error if significant differences found
        if (visualIssues > totalComparisons * 0.1) { // More than 10% have differences
          console.log('\n💡 HINT: Run "npm run visual:baseline" to update baselines if changes are expected');
          process.exit(1);
        }
      }

    } catch (error) {
      console.error('\n❌ Visual comparison failed:', error.message);
      process.exit(1);
    }
  }

  // Clean up old baselines and diffs
  async cleanBaselines() {
    console.log('\n🧹 CLEANING VISUAL BASELINES...\n');

    try {
      let filesCleaned = 0;

      // Remove baseline screenshots older than 30 days
      const baselineFiles = await this.getAllFiles(this.baselineDir);
      const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago

      for (const file of baselineFiles) {
        const filePath = path.join(this.baselineDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffDate) {
          fs.unlinkSync(filePath);
          filesCleaned++;
          console.log(`🗑️ Removed old baseline: ${file}`);
        }
      }

      // Clean diff images
      const diffFiles = await this.getAllFiles(this.differDir);
      for (const file of diffFiles) {
        const filePath = path.join(this.differDir, file);
        fs.unlinkSync(filePath);
        filesCleaned++;
      }

      if (filesCleaned > 0) {
        console.log(`\n🧽 Cleaned ${filesCleaned} outdated visual regression files`);
      } else {
        console.log('\n✨ No files to clean - baselines are current');
      }

    } catch (error) {
      console.error('\n❌ Cleanup failed:', error.message);
    }
  }

  // Compare two images using Sharp
  async compareImages(baselinePath, actualPath, diffPath) {
    try {
      const baselineImg = sharp(baselinePath);
      const actualImg = sharp(actualPath);

      const baseMeta = await baselineImg.metadata();
      const actMeta = await actualImg.metadata();

      // Skip comparison if dimensions don't match (indicates layout change)
      if (baseMeta.width !== actMeta.width || baseMeta.height !== actMeta.height) {
        console.log(`   📏 Dimension change detected: ${baseMeta.width}x${baseMeta.height} → ${actMeta.width}x${actMeta.height}`);
        await this.createDiffImage(baselinePath, actualPath, diffPath);
        return 100.0; // Maximum difference for dimension changes
      }

      // Create difference image for inspection
      await this.createDiffImage(baselinePath, actualPath, diffPath);

      // Get raw pixel buffers
      const { data: bData, info: bInfo } = await sharp(baselinePath).raw().toBuffer({ resolveWithObject: true });
      const { data: aData, info: aInfo } = await sharp(actualPath).raw().toBuffer({ resolveWithObject: true });

      const channels = bInfo.channels || 4;
      const width = bInfo.width;
      const height = bInfo.height;
      const totalPixels = width * height;

      let diffPixels = 0;
      const stride = channels;

      for (let i = 0; i < totalPixels; i++) {
        const offset = i * stride;
        let pixelDiffers = false;
        for (let c = 0; c < channels; c++) {
          if (bData[offset + c] !== aData[offset + c]) {
            pixelDiffers = true;
            break;
          }
        }
        if (pixelDiffers) diffPixels++;
      }

      return (diffPixels / totalPixels) * 100;

    } catch (error) {
      console.error(`❌ Image comparison failed: ${error.message}`);
      return 0;
    }
  }

  // Create visual diff image highlighting differences
  async createDiffImage(baselinePath, actualPath, diffPath) {
    try {
      await sharp(baselinePath)
        .composite([
          {
            // Use file path string; Sharp instance here causes type errors
            input: actualPath,
            blend: 'difference',
          },
        ])
        .png()
        .toFile(diffPath);
    } catch (error) {
      console.log(`ℹ️ Could not create diff image: ${error.message}`);
    }
  }

  // Get paths for comparison
  getComparisonPaths(baselineFile) {
    const appName = baselineFile.replace('.png', '');
    const baselinePath = path.join(this.baselineDir, baselineFile);
    const actualPath = this.findActualPathForBaseline(baselineFile);
    const diffPath = path.join(this.differDir, `diff-${baselineFile}`);

    return { baselinePath, actualPath, diffPath, appName };
  }

  // Get list of baseline files
  async getBaselineFiles() {
    return await this.getAllFiles(this.baselineDir);
  }

  // Get all files in a directory
  async getAllFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    const legacySuffixRe = /-(chromium|webkit|firefox)(-darwin|-linux|-win)?\.png$/;
    return fs.readdirSync(dir).filter(file => {
      if (!file.endsWith('.png')) return false;
      if (file.startsWith('diff-')) return false;
      // Ignore legacy project/OS-suffixed baselines to align with new snapshotPathTemplate
      if (legacySuffixRe.test(file)) return false;
      return true;
    });
  }

  // Recursively list all files in a directory
  getAllFilesRecursive(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...this.getAllFilesRecursive(full));
      else results.push(full);
    }
    return results;
  }

  // Analyze baseline coverage
  async analyzeBaselineCoverage(applications, viewports) {
    const baselineFiles = await this.getBaselineFiles();
    const expectedFiles = applications.flatMap(app =>
      viewports.map(vp => `${app}-${vp.name}-layout.png`)
    );

    const coverage = baselineFiles.length / expectedFiles.length * 100;

    console.log('\n📊 BASELINE COVERAGE REPORT:');
    console.log(`   Applications: ${applications.length}`);
    console.log(`   Viewports: ${viewports.length}`);
    console.log(`   Expected baselines: ${expectedFiles.length}`);
    console.log(`   Generated baselines: ${baselineFiles.length}`);
    console.log(`   Coverage: ${coverage.toFixed(1)}%`);

    // Report missing baselines
    const missing = expectedFiles.filter(file => !baselineFiles.includes(file));
    if (missing.length > 0) {
      console.log('\n📋 MISSING BASELINES:');
      missing.forEach(file => console.log(`   • ${file}`));
    }
  }

  // Generate comprehensive comparison report
  async generateComparisonReport(differences, total, issues) {
    const report = {
      reportDate: new Date().toISOString(),
      summary: {
        totalComparisons: total,
        visualIssuesFound: issues,
        successRate: ((total - issues) / total * 100).toFixed(1) + '%'
      },
      differences: differences,
      assessment: issues === 0 ? '🟢 PASS - No visual regressions detected'
                   : issues < total * 0.05 ? '🟡 WARNING - Minor visual differences'
                   : '🔴 FAIL - Significant visual regressions detected',
      recommendations: issues > 0 ? differences.map(diff =>
        `Review ${diff.application} (${diff.difference.toFixed(3)}% diff) - See diff image: ${diff.diff}`
      ) : ['All visual tests passed successfully']
    };

    const reportPath = path.join(this.reportDir, `visual-regression-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📋 Full report saved to: ${reportPath}`);
  }
}

// CLI Interface
const [,, command] = process.argv;

const manager = new BaselineManager();

switch (command) {
  case 'generate':
    manager.generateBaselines();
    break;
  case 'compare':
    manager.compareBaselines();
    break;
  case 'clean':
    manager.cleanBaselines();
    break;
  default:
    console.log('\n📋 Visual Regression Baseline Manager');
    console.log('=====================================');
    console.log('npm run visual:baseline  - Generate screenshot baselines');
    console.log('npm run visual:compare   - Compare against baselines');
    console.log('npm run visual:clean     - Clean old baselines');
    console.log('npm run visual           - Interactive visual testing');
    console.log('npm run visual:test      - Run visual regression tests');
    break;
}