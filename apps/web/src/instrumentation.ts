export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./env');
    const { registerStudioAgents } = await import('@acs/studio-agents');
    registerStudioAgents();
  }
}
