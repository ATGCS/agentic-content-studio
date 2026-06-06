/**
 * Pre-compile main studio routes before opening the browser in dev mode.
 * Usage: node scripts/prewarm-routes.mjs [baseUrl]
 */

const baseUrl = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '');

const routes = [
  '/login',
  '/dashboard',
  '/contents',
  '/reviews',
  '/agent-tasks',
  '/accounts',
  '/settings/ima',
  '/materials',
  '/publishing',
  '/analytics',
  '/settings',
];

async function waitForServer(maxAttempts = 90, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function prewarmRoute(route) {
  const url = `${baseUrl}${route}`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log(`  [prewarm] ${route} -> ${res.status}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  [prewarm] ${route} failed: ${message}`);
  }
}

async function main() {
  console.log(`[prewarm] Waiting for ${baseUrl} ...`);
  const ready = await waitForServer();
  if (!ready) {
    console.warn('[prewarm] Server not ready in time; skipping.');
    process.exit(1);
  }

  console.log('[prewarm] Compiling main routes...');
  for (const route of routes) {
    await prewarmRoute(route);
  }
  console.log('[prewarm] Done.');
}

main();
