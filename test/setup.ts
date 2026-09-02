import "@testing-library/jest-dom/vitest";

import { afterEach, vi } from "vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });
}

afterEach(async () => {
  if (typeof document === "undefined") {
    return;
  }

  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
