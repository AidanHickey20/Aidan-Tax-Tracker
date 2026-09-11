/**
 * Minimal structured logger.
 *
 * Emits single-line JSON to stdout/stderr so entries are searchable in the
 * Vercel logs dashboard. No external dependency. If Sentry is ever added, the
 * `captureException` hook below is the single place to forward errors.
 */

type Meta = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, meta?: Meta) {
  const line = JSON.stringify({ level, event, ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(event: string, meta?: Meta) {
  emit("info", event, meta);
}

export function logWarn(event: string, meta?: Meta) {
  emit("warn", event, meta);
}

/**
 * Log an error with context. `event` is a stable, greppable label
 * (e.g. "documents.upload_failed"); `meta` carries request-specific fields.
 * Never pass secrets or full request bodies.
 */
export function logError(event: string, error: unknown, meta?: Meta) {
  const err =
    error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : { message: String(error) };
  emit("error", event, { ...meta, error: err });
  // Forward to an external monitor here if one is configured (e.g. Sentry).
}
