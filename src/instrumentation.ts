/**
 * Next.js instrumentation file
 * This runs when the Node.js server starts
 * Used to start the background scheduler for periodic surveys
 */

export async function register() {
  // Only run on server, not during build or in edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler')
    startScheduler()
  }
}
