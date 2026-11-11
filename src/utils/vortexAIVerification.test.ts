// Beat Vortex - Vortex AI Core Verification Tests
// Jest test wrapper for the verification module

import { runVortexAICoreVerification } from './vortexAIVerification';

describe('Vortex AI Core Verification', () => {
  it('should pass all Smart Queue, Adaptive EQ, and Lyrics Service verifications', async () => {
    const report = await runVortexAICoreVerification();

    // Log the report for visibility
    console.log('Verification Report:', JSON.stringify(report, null, 2));

    // Assert all tests passed
    expect(report.overallPassed).toBe(true);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.total).toBe(28); // 7 Smart Queue + 10 Adaptive EQ + 11 Lyrics = 28
  });

  it('should have all 28 individual verifications pass', async () => {
    const report = await runVortexAICoreVerification();

    // Check each verification passed
    report.results.forEach(result => {
      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error(`FAILED: ${result.feature} - ${result.error}`);
      }
    });
  });
});