"use client";

import {
  useEffect,
  useState,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { speedAdjustedInterval } from "@/shared/motion/motion-config";

import {
  HERO_PLACEHOLDER_DELAY_MS,
  HERO_PROMPT_EXAMPLES,
  advanceHeroPlaceholder,
  heroPlaceholderText,
  initialHeroPlaceholder,
} from "./hero-placeholder";

const MAX_COMPOSER_HEIGHT = 224;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";

  const nextHeight = Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden";
}

export function HeroComposer() {
  const [placeholder, setPlaceholder] = useState(initialHeroPlaceholder);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const timer = window.setTimeout(
      () => setPlaceholder(advanceHeroPlaceholder),
      speedAdjustedInterval(HERO_PLACEHOLDER_DELAY_MS[placeholder.phase]),
    );
    return () => window.clearTimeout(timer);
  }, [placeholder, reducedMotion]);

  const placeholderText = reducedMotion
    ? HERO_PROMPT_EXAMPLES[0]
    : heroPlaceholderText(placeholder);

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
        placeholder={placeholderText}
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
