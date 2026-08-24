"use client";

import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

const MAX_COMPOSER_HEIGHT = 224;

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";

  const nextHeight = Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden";
}

export function HeroComposer() {
  function handleInput(event: FormEvent<HTMLTextAreaElement>) {
    resizeComposer(event.currentTarget);
  }

  function handlePromptKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="hero-composer" action="/research" method="get">
      <label className="visually-hidden" htmlFor="hero-prompt">
        Describe the project you want to explore
      </label>
      <textarea
        id="hero-prompt"
        name="prompt"
        rows={1}
        minLength={10}
        maxLength={500}
        required
        placeholder="What kind of project do you want to explore?"
        autoComplete="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        suppressHydrationWarning
        onInput={handleInput}
        onKeyDownCapture={handlePromptKeyDown}
      />
      <button
        className="hero-composer__submit"
        type="submit"
        aria-label="Submit project prompt"
      >
        <span aria-hidden="true">{"\u2197"}</span>
      </button>
    </form>
  );
}
