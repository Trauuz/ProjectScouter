export type ResearchComposerLayout = {
  height: number;
  multiline: boolean;
};

export function researchComposerLayout(
  scrollHeight: number,
  singleLineScrollHeight: number,
  borderBlockSize: number,
): ResearchComposerLayout {
  return {
    height: Math.max(scrollHeight, singleLineScrollHeight) + borderBlockSize,
    multiline: scrollHeight > singleLineScrollHeight + 1,
  };
}
