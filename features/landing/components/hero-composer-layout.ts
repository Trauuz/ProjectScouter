const MAX_COMPOSER_HEIGHT = 224;

export type ComposerViewport = {
  height: number;
  overflowY: "auto" | "hidden";
};

export function composerViewport(scrollHeight: number): ComposerViewport {
  return {
    height: Math.min(scrollHeight, MAX_COMPOSER_HEIGHT),
    overflowY: scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden",
  };
}
