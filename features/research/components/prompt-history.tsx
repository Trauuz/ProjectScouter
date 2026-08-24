import type { MouseEvent } from "react";

import type { PromptHistoryEntry } from "../prompt-history/prompt-history-store";

type PromptHistoryProps = {
  entries: PromptHistoryEntry[];
  activeId: string | null;
  onDelete(id: string): void;
  onSelect(id: string): void;
};

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function PromptHistory({
  entries,
  activeId,
  onDelete,
  onSelect,
}: PromptHistoryProps) {
  function requestDeletion(
    event: MouseEvent<HTMLButtonElement>,
    id: string,
  ) {
    event.stopPropagation();
    onDelete(id);
  }

  return (
    <section
      className="research-history"
      aria-label="Previous prompts"
    >
      <div className="research-history__heading">
        <h3>Previous prompts</h3>
        <span>{entries.length}</span>
      </div>

      <ul className="research-history__list">
        {entries.map((entry) => (
          <li key={entry.id} data-active={entry.id === activeId || undefined}>
            <button
              className="research-history__select-prompt"
              type="button"
              title={entry.prompt}
              aria-pressed={entry.id === activeId}
              onClick={() => onSelect(entry.id)}
            >
              <span>{entry.prompt}</span>
            </button>
            <button
              className="research-history__delete"
              type="button"
              aria-label={`Delete research: ${entry.prompt}`}
              title="Delete research"
              onClick={(event) => requestDeletion(event, entry.id)}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
