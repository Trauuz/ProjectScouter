type PromptHistoryProps = {
  prompts: string[];
  onSelect(prompt: string): void;
};

export function PromptHistory({ prompts, onSelect }: PromptHistoryProps) {
  const visiblePrompts = prompts.slice(0, 4);

  return (
    <section
      className="research-history"
      aria-label="Previous prompts"
      data-has-overflow={prompts.length > visiblePrompts.length}
    >
      <div className="research-history__heading">
        <h3>Previous prompts</h3>
        <span>{prompts.length}</span>
      </div>

      <ul className="research-history__list">
        {visiblePrompts.map((prompt) => (
          <li key={prompt}>
            <button type="button" title={prompt} onClick={() => onSelect(prompt)}>
              {prompt}
            </button>
          </li>
        ))}
      </ul>

      <select
        className="research-history__select"
        aria-label="Choose a previous prompt"
        value=""
        onChange={(event) => {
          const selectedPrompt = event.currentTarget.value;
          if (selectedPrompt) {
            onSelect(selectedPrompt);
          }
        }}
      >
        <option value="">Choose a previous prompt</option>
        {prompts.map((prompt) => (
          <option value={prompt} key={prompt}>
            {prompt}
          </option>
        ))}
      </select>
    </section>
  );
}
