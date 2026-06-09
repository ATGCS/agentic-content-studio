export function isAgentDebugEnabled(): boolean {
  if (process.env.DEBUG_AGENT === 'false') return false;
  return (
    process.env.DEBUG_AGENT === 'true' || process.env.NODE_ENV === 'development'
  );
}
