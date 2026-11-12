import {checkLiveService} from './src/live-monitor.mjs';

try {
  const result = await checkLiveService(process.env);
  console.log(JSON.stringify({ok: true, ...result}));
} catch (error) {
  // Do not print responses, environment values, or request headers.
  console.error('Live service check failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
}
