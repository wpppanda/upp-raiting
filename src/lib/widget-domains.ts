/**
 * Widget domain allow-list.
 *
 * A project always has one primary `domain` plus an optional list of extra
 * `allowedDomains`. The public widget API only answers requests coming from a
 * hostname that matches one of them (exact match, or sub-domain match for
 * `*.example.com` entries).
 */

export const DOMAIN_RE = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
export const MAX_ALLOWED_DOMAINS = 20;

/** Strips protocol / path / port, lowercases, validates. Returns null when unusable. */
export function normalizeDomain(raw: unknown): string | null {
  let value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (value.startsWith("www.")) value = value.slice(4);
  if (!DOMAIN_RE.test(value)) return null;
  return value;
}

function hostnameMatches(pattern: string, hostname: string) {
  if (pattern.startsWith("*.")) {
    const root = pattern.slice(2);
    return hostname === root || hostname.endsWith(`.${root}`);
  }
  return hostname === pattern;
}

export type DomainOwner = { domain: string; allowedDomains?: string[] | null };

/** True when the request Origin is allowed to talk to this project's widget API. */
export function originAllowed(project: DomainOwner, origin: string | null): boolean {
  if (!origin) return true;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!hostname) return false;
  // Local development convenience: the widget can be exercised on localhost.
  if (process.env.NODE_ENV !== "production" && (hostname === "localhost" || hostname === "127.0.0.1")) return true;
  const patterns = [project.domain, ...(Array.isArray(project.allowedDomains) ? project.allowedDomains : [])]
    .map((entry) => normalizeDomain(entry))
    .filter((entry): entry is string => Boolean(entry));
  // Compare against the normalized hostname so www./no-www. both match.
  const candidate = normalizeDomain(hostname) ?? hostname;
  return patterns.some((pattern) => hostnameMatches(pattern, candidate));
}

/**
 * Validates an incoming allow-list (array of domains, or a comma / newline
 * separated string) and returns the clean array, or an error message.
 */
export function parseAllowedDomains(raw: unknown): string[] | string {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,\n;]/)
      : null;
  if (!list) return "Allowed domains must be a list.";
  const out: string[] = [];
  for (const item of list) {
    const value = String(item ?? "").trim();
    if (!value) continue;
    const domain = normalizeDomain(value);
    if (!domain) return `Enter a valid domain, for example example.com ("${value}" is not valid).`;
    if (!out.includes(domain)) out.push(domain);
  }
  if (out.length > MAX_ALLOWED_DOMAINS) {
    return `You can allow up to ${MAX_ALLOWED_DOMAINS} domains for the widget.`;
  }
  return out;
}
