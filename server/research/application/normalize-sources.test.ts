import { describe, expect, it } from "vitest";

import { normalizeResearchSources } from "./normalize-sources";

describe("normalizeResearchSources", () => {
  it("keeps only public HTTP sources and deduplicates tracking variants", () => {
    const sources = normalizeResearchSources([
      {
        title: "Campus budgeting guide",
        url: "https://example.com/guide?utm_source=search#costs",
        snippet: "Students report difficulty planning irregular semester costs.",
        publishedAt: "2026-06-01",
      },
      {
        title: "Duplicate guide",
        url: "https://example.com/guide",
        snippet: "The same source without tracking parameters.",
        publishedAt: null,
      },
      {
        title: "Unsafe local file",
        url: "file:///C:/private.txt",
        snippet: "This must never become evidence.",
        publishedAt: null,
      },
      {
        title: "Cloud metadata endpoint",
        url: "http://169.254.169.254/latest/meta-data",
        snippet: "A link-local address must never become evidence.",
        publishedAt: null,
      },
      {
        title: "Private IPv6 endpoint",
        url: "http://[fd00::1]/internal",
        snippet: "A private IPv6 address must never become evidence.",
        publishedAt: null,
      },
      {
        title: "Credential-bearing link",
        url: "https://user:password@example.com/private",
        snippet: "Credentials must not be exposed in a source link.",
        publishedAt: null,
      },
    ]);

    expect(sources).toEqual([
      {
        id: "src-1",
        title: "Campus budgeting guide",
        url: "https://example.com/guide",
        snippet: "Students report difficulty planning irregular semester costs.",
        publishedAt: "2026-06-01",
      },
    ]);
  });
});
