export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  return typeof message === 'string' && (
    /failed to load chunk|loading (?:css )?chunk [\s\S]*failed|CSS_CHUNK_LOAD_FAILED/i.test(message) ||
    /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(message)
  );
}
