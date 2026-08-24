"use client";

import { type FormEvent, useEffect, useRef } from "react";

import type { PromptHistoryEntry } from "../prompt-history/prompt-history-store";

type DeleteResearchDialogProps = {
  entry: PromptHistoryEntry | null;
  error: string;
  deleting: boolean;
  onCancel(): void;
  onConfirm(): Promise<void>;
};

export function DeleteResearchDialog({
  entry,
  error,
  deleting,
  onCancel,
  onConfirm,
}: DeleteResearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDownRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (entry && !dialog.open) {
      dialog.showModal();
    }
    if (!entry && dialog.open) {
      dialog.close();
    }
  }, [entry]);

  useEffect(() => {
    if (!entry) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [entry]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleting) {
      void onConfirm();
    }
  }

  function cancel() {
    if (!deleting) {
      onCancel();
    }
  }

  return (
    <dialog
      className="delete-research-dialog"
      ref={dialogRef}
      aria-labelledby="delete-research-title"
      aria-describedby="delete-research-description"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onPointerDown={(event) => {
        backdropPointerDownRef.current = event.target === event.currentTarget;
      }}
      onPointerCancel={() => {
        backdropPointerDownRef.current = false;
      }}
      onClick={(event) => {
        const startedOnBackdrop = backdropPointerDownRef.current;
        backdropPointerDownRef.current = false;
        if (startedOnBackdrop && event.target === event.currentTarget) {
          cancel();
        }
      }}
    >
      <form className="delete-research-dialog__surface" onSubmit={handleSubmit}>
        <header>
          <p className="delete-research-dialog__eyebrow">Saved research</p>
          <h2 id="delete-research-title">Delete research?</h2>
          <p id="delete-research-description">
            This will remove this saved research and its result from your history.
          </p>
        </header>

        {entry ? (
          <p className="delete-research-dialog__prompt" title={entry.prompt}>
            {entry.prompt}
          </p>
        ) : null}

        {error ? <p className="delete-research-dialog__error" role="alert">{error}</p> : null}

        <div className="delete-research-dialog__actions">
          <button type="button" className="button" disabled={deleting} onClick={cancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="button delete-research-dialog__confirm"
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete research"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
