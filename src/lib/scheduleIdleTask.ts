export function scheduleIdleTask(task: () => void, timeout = 1500) {
  if (typeof window === 'undefined') return () => undefined

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(task, { timeout })
    return () => window.cancelIdleCallback(idleId)
  }

  const timer = window.setTimeout(task, Math.min(timeout, 300))
  return () => window.clearTimeout(timer)
}
