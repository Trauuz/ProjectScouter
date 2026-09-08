import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  StepOneVisual,
  StepThreeVisual,
  StepTwoVisual,
} from "./scroll-guide-visuals";

describe("landing illustration accessibility", () => {
  it.each([StepOneVisual, StepTwoVisual, StepThreeVisual])(
    "keeps decorative SVGs out of the accessibility tree",
    (Visual) => {
      const markup = renderToStaticMarkup(<Visual />);

      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('focusable="false"');
    },
  );
});
