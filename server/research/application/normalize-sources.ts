import { isIP } from "node:net";

import type {
  RawResearchSource,
  ResearchSource,
} from "../domain/research-report";

const MAX_SOURCES = 24;
const TRACKING_PARAMETERS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid"]);

function isNonPublicIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isNonPublicIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") ||
    Boolean(mappedIpv4 && isNonPublicIpv4(mappedIpv4))
  );
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const unwrapped = normalized.replace(/^\[|\]$/g, "");
  const ipVersion = isIP(unwrapped);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".local") ||
    (ipVersion === 4 && isNonPublicIpv4(unwrapped)) ||
    (ipVersion === 6 && isNonPublicIpv6(unwrapped))
  );
}

function canonicalizeUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      isPrivateHostname(url.hostname)
    ) {
      return null;
    }

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || TRACKING_PARAMETERS.has(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeResearchSources(
  candidates: RawResearchSource[],
): ResearchSource[] {
  const seen = new Set<string>();
  const normalized: ResearchSource[] = [];

  for (const candidate of candidates) {
    const url = canonicalizeUrl(candidate.url);

    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    normalized.push({
      id: `src-${normalized.length + 1}`,
      title: candidate.title.trim().slice(0, 200) || "Untitled source",
      url,
      snippet: candidate.snippet.trim().slice(0, 800),
      publishedAt: candidate.publishedAt?.trim() || null,
    });

    if (normalized.length === MAX_SOURCES) {
      break;
    }
  }

  return normalized;
}
