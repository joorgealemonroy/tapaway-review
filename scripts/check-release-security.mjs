import { scanSources, scanArtifacts, failOnFindings, validatePublicEnv } from '../security/build-guard.mjs';
import { loadEnv } from 'vite';
const env = {...loadEnv('production',process.cwd(),''), ...process.env};
failOnFindings({findings:validatePublicEnv(env)});
const report = process.argv.includes('--artifacts') ? scanArtifacts('dist',env) : scanSources();
failOnFindings(report);
console.log(`Security scan passed: ${report.files} ${process.argv.includes('--artifacts') ? 'release artifacts' : 'source files'}.`);
