// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HeroComposer } from "./hero-composer";

function renderComposer() {
  render(<HeroComposer />);
  const prompt = screen.getByRole("textbox", {
    name: "Describe the project you want to explore",
  });
  const form = prompt.closest("form");

  expect(form).not.toBeNull();
  const requestSubmit = vi
    .spyOn(form as HTMLFormElement, "requestSubmit")
    .mockImplementation(() => undefined);

  return { prompt, requestSubmit };
}

describe("HeroComposer", () => {
  it("submits the prompt through the form when Enter is pressed", async () => {
    const user = userEvent.setup();
    const { prompt, requestSubmit } = renderComposer();

    await user.type(prompt, "A finance app for independent design studios");
    await user.keyboard("{Enter}");

    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(prompt).toHaveValue(
      "A finance app for independent design studios",
    );
  });

  it("inserts a line break instead of submitting on Shift+Enter", async () => {
    const user = userEvent.setup();
    const { prompt, requestSubmit } = renderComposer();

    await user.type(prompt, "Compare finance apps");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(requestSubmit).not.toHaveBeenCalled();
    expect(prompt).toHaveValue("Compare finance apps\n");
  });

  it("submits Enter when the browser retains its composition flag", () => {
    const { prompt, requestSubmit } = renderComposer();

    fireEvent.keyDown(prompt, {
      key: "Enter",
      code: "Enter",
      isComposing: true,
    });

    expect(requestSubmit).toHaveBeenCalledOnce();
  });
});
