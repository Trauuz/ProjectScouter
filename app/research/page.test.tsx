// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResearchPage from "./page";

vi.mock("@/features/research", () => ({
  ResearchWorkspace: () => <div data-testid="research-workspace" />,
}));

vi.mock("@/shared/layout/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

describe("ResearchPage", () => {
  it("renders the site header above the workspace", async () => {
    const page = await ResearchPage({ searchParams: Promise.resolve({}) });

    render(page);

    expect(screen.getByTestId("research-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
  });
});
