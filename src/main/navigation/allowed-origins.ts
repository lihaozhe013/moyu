export class OriginError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'OriginError';
  }
}

export function normalizeOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new OriginError('Origin is not a valid URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new OriginError('Only HTTP and HTTPS origins are supported.');
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new OriginError(
      'Allowed origins must not contain credentials, paths, queries, or fragments.',
    );
  }

  return parsed.origin;
}

export function originIsAllowed(url: URL, allowedOrigins: readonly string[]): boolean {
  return allowedOrigins.includes(url.origin);
}
