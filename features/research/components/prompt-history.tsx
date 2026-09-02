"use client";

import {
  forwardRef,
  type MouseEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import type { PromptHistoryEntry } from "../prompt-history/prompt-history-store";

gsap.registerPlugin(useGSAP);

export type PromptHistoryHandle = {
  animateDeletion(id: string): Promise<void>;
  restoreDeletion(id: string): void;
};

type PromptHistoryProps = {
  entries: PromptHistoryEntry[];
  activeId: string | null;
  deletingId: string | null;
  onDelete(id: string): void;
  onSelect(id: string): void;
};

type DeletionAnimation = {
  promise: Promise<void>;
  resolve(): void;
  timeline: ReturnType<typeof gsap.timeline>;
};

function reducedMotionRequested(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

class PromptHistoryAnimator {
  private readonly items = new Map<string, HTMLLIElement>();
  private readonly animations = new Map<string, DeletionAnimation>();

  bind(id: string, item: HTMLLIElement | null): void {
    if (item) {
      this.items.set(id, item);
      return;
    }
    this.items.delete(id);
  }

  animate(id: string): Promise<void> {
    const currentAnimation = this.animations.get(id);
    if (currentAnimation) {
      return currentAnimation.promise;
    }

    const item = this.items.get(id);
    if (!item) {
      return Promise.resolve();
    }

    let resolveAnimation: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const finish = () => {
      this.animations.delete(id);
      resolveAnimation();
    };
    const timeline = gsap.timeline({ onComplete: finish });
    this.animations.set(id, {
      promise,
      resolve: resolveAnimation,
      timeline,
    });

    if (reducedMotionRequested()) {
      timeline.to(item, {
        autoAlpha: 0,
        duration: 0.08,
        ease: "power1.out",
      });
      return promise;
    }

    gsap.set(item, {
      height: item.getBoundingClientRect().height,
      overflow: "hidden",
      transformOrigin: "right center",
    });
    timeline
      .to(item, {
        autoAlpha: 0,
        scale: 0.96,
        x: 20,
        duration: 0.2,
        ease: "power2.in",
      })
      .to(item, {
        height: 0,
        marginBottom: 0,
        borderWidth: 0,
        duration: 0.18,
        ease: "power2.inOut",
      }, "-=0.06");
    return promise;
  }

  restore(id: string): void {
    const animation = this.animations.get(id);
    animation?.timeline.kill();
    animation?.resolve();
    this.animations.delete(id);

    const item = this.items.get(id);
    if (item) {
      gsap.set(item, { clearProps: "all" });
    }
  }

  dispose(): void {
    this.animations.forEach((animation) => {
      animation.timeline.kill();
      animation.resolve();
    });
    this.animations.clear();
  }
}

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

export const PromptHistory = forwardRef<PromptHistoryHandle, PromptHistoryProps>(
function PromptHistory({
  entries,
  activeId,
  deletingId,
  onDelete,
  onSelect,
}, ref) {
  const listRef = useRef<HTMLUListElement>(null);
  const [animator] = useState(() => new PromptHistoryAnimator());
  const { contextSafe } = useGSAP(
    () => () => animator.dispose(),
    { scope: listRef },
  );

  const animateDeletion = contextSafe(
    (id: string): Promise<void> => animator.animate(id),
  );
  const restoreDeletion = contextSafe(
    (id: string) => animator.restore(id),
  );

  useImperativeHandle(ref, () => ({
    animateDeletion,
    restoreDeletion,
  }), [animateDeletion, restoreDeletion]);

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

      <ul className="research-history__list" ref={listRef}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            ref={(item) => animator.bind(entry.id, item)}
            data-active={entry.id === activeId || undefined}
            aria-busy={entry.id === deletingId || undefined}
          >
            <button
              className="research-history__select-prompt"
              type="button"
              title={entry.prompt}
              aria-pressed={entry.id === activeId}
              disabled={entry.id === deletingId}
              onClick={() => onSelect(entry.id)}
            >
              <span>{entry.prompt}</span>
            </button>
            <button
              className="research-history__delete"
              type="button"
              aria-label={`Delete research: ${entry.prompt}`}
              title="Delete research"
              disabled={entry.id === deletingId}
              onClick={(event) => requestDeletion(event, entry.id)}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
});
