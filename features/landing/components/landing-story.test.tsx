// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { gsap, useGSAP } = vi.hoisted(() => ({
  gsap: {
    matchMedia: vi.fn(() => ({
      add: vi.fn(
        (
          _conditions: Record<string, string>,
          callback: (context: { conditions: { reduceMotion: boolean } }) => void,
        ) => callback({ conditions: { reduceMotion: false } }),
      ),
    })),
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis() })),
  },
  useGSAP: vi.fn((callback: () => void) => callback()),
}));

vi.mock("@gsap/react", () => ({ useGSAP }));
vi.mock("gsap", () => ({ gsap }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

import { LandingStory, TrustStrip } from "./landing-story";

describe("TrustStrip", () => {
  it("states the four evidence-focused product positions without fake metrics", () => {
    render(<TrustStrip />);

    const trust = screen.getByRole("region", {
      name: "What ProjectScout prioritizes",
    });

    expect(within(trust).getAllByRole("listitem")).toHaveLength(4);
    for (const point of [
      "Recent public sources",
      "Three distinct directions",
      "Weak-evidence warnings",
      "Beginner-friendly scope",
    ]) {
      expect(within(trust).getByText(point)).toBeInTheDocument();
    }
  });

  it("keeps trust points visible instead of resetting them after the scroll trigger leaves", () => {
    render(<TrustStrip />);

    expect(gsap.set).toHaveBeenCalledWith(".trust-elem", {
      autoAlpha: 1,
      y: 0,
    });
    expect(gsap.to).toHaveBeenCalledWith(
      ".trust-elem",
      expect.objectContaining({
        scrollTrigger: expect.objectContaining({
          toggleActions: "play none play none",
        }),
      }),
    );
  });
});

describe("LandingStory", () => {
  it("omits the example and weak-evidence sections", () => {
    render(<LandingStory />);

    expect(document.querySelector("#example")).not.toBeInTheDocument();
    expect(document.querySelector("#weak-evidence")).not.toBeInTheDocument();
  });

  it("separates observed evidence from AI interpretation in order", () => {
    render(<LandingStory />);

    const evidence = document.querySelector("#evidence");
    expect(evidence).not.toBeNull();
    const stages = Array.from(
      (evidence as HTMLElement).querySelectorAll<HTMLElement>(".evidence-node"),
    );

    expect(stages.map((stage) => within(stage).getByRole("heading").textContent))
      .toEqual([
        "Public sources",
        "Recurring complaints",
        "AI interpretation",
        "Final recommendation",
      ]);
    expect(stages[0]).toHaveTextContent("Observed evidence");
    expect(stages[1]).toHaveTextContent("Observed pattern");
    expect(stages[2]).toHaveTextContent("Interpretation");
    expect(stages[3]).toHaveTextContent("Qualified synthesis");
  });

  it("compares three materially different project directions", () => {
    render(<LandingStory />);

    const comparison = screen.getByRole("region", {
      name: "One topic. Three different bets.",
    });
    const directions = within(comparison).getAllByRole("article");

    expect(directions).toHaveLength(3);
    expect(directions.map((direction) => within(direction).getByRole("heading").textContent))
      .toEqual(["Campus Momentum", "Equipment Window", "Routine Reset"]);

    for (const direction of directions) {
      expect(direction).toHaveTextContent("Target user");
      expect(direction).toHaveTextContent("Core problem");
      expect(direction).toHaveTextContent("MVP scope");
      expect(direction).toHaveTextContent("Evidence strength");
    }
  });

  it("covers audiences, transformation, and principles", () => {
    render(<LandingStory />);

    for (const audience of [
      "Students",
      "Beginner developers",
      "Hackathon teams",
      "Portfolio builders",
      "Coursework projects",
    ]) {
      expect(screen.getByText(audience)).toBeInTheDocument();
    }

    expect(document.querySelector(".trans-before"))
      .toHaveTextContent("I want to build something with fitness");
    expect(document.querySelector(".trans-after")).toHaveTextContent(
      "A beginner-friendly campus workout accountability app based on recurring complaints about motivation and scheduling",
    );

    for (const principle of [
      "Source-backed recommendations",
      "No invented market claims",
      "Differentiated ideas, not clones",
      "Realistic MVP scope",
    ]) {
      expect(screen.getByRole("heading", { name: principle })).toBeInTheDocument();
    }
  });
});
