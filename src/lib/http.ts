import wretch from 'wretch';

const TIMEOUT_MS = 10_000;

/**
 * wretch with a request timeout. Upstreams sometimes hang instead of failing,
 * and without a cap the UI sits on a spinner forever. Deferred so each
 * request gets a fresh signal.
 */
export function http(url: string) {
  return wretch(url).defer((w) =>
    w.options({ signal: AbortSignal.timeout(TIMEOUT_MS) })
  );
}
