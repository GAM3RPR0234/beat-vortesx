import { register } from 'ts-node';
register({
  transpileOnly: true,
  compilerOptions: {
    module: 'ESNext',
    target: 'ES2020',
    moduleResolution: 'bundler',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    baseUrl: '.',
    paths: {
      '@/*': ['src/*'],
      '@components/*': ['src/components/*'],
      '@screens/*': ['src/screens/*'],
      '@navigation/*': ['src/navigation/*'],
      '@store/*': ['src/store/*'],
      '@hooks/*': ['src/hooks/*'],
      '@utils/*': ['src/utils/*'],
      '@types/*': ['src/types/*'],
      '@assets/*': ['src/assets/*'],
      '@constants/*': ['src/constants/*']
    }
  }
});

import { runVortexAICoreVerification, logVerificationReport } from './src/utils/vortexAIVerification.ts';

async function main() {
  const report = await runVortexAICoreVerification();
  logVerificationReport(report);
  process.exit(report.overallPassed ? 0 : 1);
}

main().catch(console.error);