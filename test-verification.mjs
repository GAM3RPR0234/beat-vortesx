import { runVortexAICoreVerification, logVerificationReport } from './src/utils/vortexAIVerification.ts';

async function main() {
  const report = await runVortexAICoreVerification();
  logVerificationReport(report);
  process.exit(report.overallPassed ? 0 : 1);
}

main().catch(console.error);
