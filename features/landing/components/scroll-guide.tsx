"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { speedAdjustedInterval } from "@/shared/motion/motion-config";

import styles from "./scroll-guide.module.css";
import { StepOneVisual, StepTwoVisual, StepThreeVisual } from "./scroll-guide-visuals";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const STEP_THREE_SPEED_MULTIPLIER = 2;

const GUIDE_STEPS = [
  {
    panelId: "topic",
    title: "Enter a topic or app",
    description:
      "Start with a rough topic, app idea, problem space, or concept.",
  },
  {
    panelId: "evidence",
    title: "Find public evidence",
    description:
      "ProjectScout looks for public evidence, recurring complaints, signals, and relevant sources.",
  },
  {
    panelId: "directions",
    title: "Compare project directions",
    description:
      "Compare three distinct project directions instead of one generic recommendation.",
  },
] as const;

function stepFromProgress(progress: number) {
  if (progress < 1 / 3) {
    return 0;
  }

  if (progress < 2 / 3) {
    return 1;
  }

  return 2;
}

interface ScrollGuideProps {
  preview: ReactNode;
}

export function ScrollGuide({ preview }: ScrollGuideProps) {
  const guide = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef(0);
  const [activeStep, setActiveStep] = useState(0);
  const step3Loop = useRef<gsap.core.Timeline>(null);

  useEffect(() => {
    if (activeStep === 2) {
      step3Loop.current?.play();
    } else {
      step3Loop.current?.pause(0);
    }
  }, [activeStep]);

  useGSAP(
    () => {
      const panels = gsap.utils.toArray<HTMLElement>("[data-guide-panel]");

      if (!stage.current || panels.length !== GUIDE_STEPS.length) {
        return;
      }

      const stageElement = stage.current;
      const measureHeaderHeight = () => {
        const height =
          document
            .querySelector<HTMLElement>(".site-header")
            ?.getBoundingClientRect().height ?? 0;

        stageElement.style.setProperty("--guide-header-height", `${height}px`);
        return height;
      };
      const media = gsap.matchMedia();

      measureHeaderHeight();

      media.add(
        {
          desktop: "(min-width: 60rem)",
          compact: "(max-width: 59.999rem)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { desktop, reduceMotion } = context.conditions as {
            desktop: boolean;
            reduceMotion: boolean;
          };
          const updateActiveStep = (progress: number) => {
            const nextStep = stepFromProgress(progress);

            if (nextStep === activeStepRef.current) {
              return;
            }

            activeStepRef.current = nextStep;
            setActiveStep(nextStep);

            if (reduceMotion) {
              gsap.set(panels, {
                autoAlpha: (index: number) => (index === nextStep ? 1 : 0),
              });
            }
          };
          const scrollDistance = () => {
            const viewportMultiplier = speedAdjustedInterval(
              desktop ? 1.6 : 1.3,
            );
            const minimumDistance = speedAdjustedInterval(800);
            return `+=${Math.max(
              window.innerHeight * viewportMultiplier,
              minimumDistance,
            )}`;
          };
          const pinStart = () => `top ${measureHeaderHeight()}px`;
          const scrollTrigger = {
            trigger: guide.current,
            start: pinStart,
            end: scrollDistance,
            pin: stage.current,
            pinSpacing: true,
            scrub: reduceMotion ? true : speedAdjustedInterval(0.6),
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self: ScrollTrigger) => updateActiveStep(self.progress),
          };

          gsap.set(panels, {
            autoAlpha: (index: number) => (index === 0 ? 1 : 0),
            y: 0,
            scale: 1,
          });

          gsap.set(".step1-cursor", { autoAlpha: 0 });
          gsap.set(".step1-text, .step1-icon, .step1-bg", { autoAlpha: 0, scale: 0.95, transformOrigin: "center" });
          gsap.set(".step2-center, .step2-center-inner, .step2-card1, .step2-card2, .step2-card3, .step2-card4", { autoAlpha: 0, scale: 0.9, transformOrigin: "center" });
          gsap.set(".step2-line1, .step2-line2, .step2-line3, .step2-line4", { autoAlpha: 0, strokeDasharray: "4 8" });
          gsap.set(".step3-card1, .step3-card2, .step3-card3", { autoAlpha: 0, y: 16 });
          gsap.set(".step3-line", { strokeDashoffset: 100, strokeDasharray: "100 100" });

          if (reduceMotion) {
            const progressProxy = { value: 0 };
            
            gsap.set(".step1-text, .step1-icon, .step1-bg, .step1-cursor, .step2-center, .step2-center-inner, .step2-card1, .step2-card2, .step2-card3, .step2-card4, .step3-card1, .step3-card2, .step3-card3, .step2-line1, .step2-line2, .step2-line3, .step2-line4", { autoAlpha: 1, scale: 1, y: 0 });
            gsap.set(".step3-line", { strokeDashoffset: 0 });

            // Static highlight for Card 2 in reduced motion
            gsap.set(".step3-card2 .s3-glow", { autoAlpha: 0.28 });
            gsap.set(".step3-card2 .s3-check, .step3-card2 .s3-card-border", { autoAlpha: 1 });
            gsap.set(".step3-card2 .s3-icon-bg", { fill: "var(--color-accent-soft)" });
            gsap.set(".step3-card2 .s3-text-strong", { fill: "var(--color-ink)" });

            gsap
              .timeline({ scrollTrigger })
              .to(progressProxy, { value: 1, duration: 1, ease: "none" });
            return;
          }

          gsap.to(".step1-icon", {
            y: -4,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });

          gsap.to(".step1-cursor", {
            opacity: 0,
            duration: 0.4,
            repeat: -1,
            yoyo: true,
            ease: "steps(1)",
          });

          gsap.to(".step2-line1, .step2-line2, .step2-line3, .step2-line4", {
            strokeDashoffset: -12,
            duration: 0.6,
            repeat: -1,
            ease: "none",
          });

          gsap.to(".step2-center-inner", {
            scale: 1.15,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });

          // Step 3 sequence animation
          const highlightTl = gsap
            .timeline({ repeat: -1, paused: true })
            .timeScale(STEP_THREE_SPEED_MULTIPLIER);
          [1, 2, 3].forEach((id) => {
            highlightTl
              .to('.step3-card' + id + ' .s3-glow', { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" })
              .to('.step3-card' + id + ' .s3-check', { autoAlpha: 1, duration: 0.6 }, "<0.2")
              .to('.step3-card' + id + ' .s3-card-border', { autoAlpha: 1, duration: 0.6 }, "<")
              .to('.step3-card' + id + ' .s3-icon-bg', { fill: "var(--color-accent-soft)", duration: 0.6 }, "<")
              .to('.step3-card' + id + ' .s3-text-strong', { fill: "var(--color-ink)", duration: 0.6 }, "<")
              .to({}, { duration: 1.8 }) // hold
              .to('.step3-card' + id + ' .s3-glow', { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" })
              .to('.step3-card' + id + ' .s3-check, .step3-card' + id + ' .s3-card-border', { autoAlpha: 0, duration: 0.6 }, "<")
              .to('.step3-card' + id + ' .s3-icon-bg', { fill: "var(--color-workspace-soft)", duration: 0.6 }, "<")
              .to('.step3-card' + id + ' .s3-text-strong', { fill: "var(--color-ink-soft)", duration: 0.6 }, "<");
          });

          step3Loop.current = highlightTl;
          if (activeStepRef.current === 2) {
            step3Loop.current.play();
          }

          const timeline = gsap.timeline({
            defaults: { duration: 0.28, ease: "power2.inOut" },
            scrollTrigger,
          });

          timeline
            .addLabel("topic", 0)
            .to(panels[0], { autoAlpha: 1, duration: 0.72 }, "topic")
            .to(".step1-bg", { autoAlpha: 1, scale: 1, duration: 0.3 }, "topic+=0.1")
            .to(".step1-cursor", { autoAlpha: 1, duration: 0.1 }, "topic+=0.15")
            .to(".step1-text", { autoAlpha: 1, scale: 1, duration: 0.2 }, "topic+=0.25")
            .to(".step1-icon", { autoAlpha: 1, scale: 1, duration: 0.2 }, "topic+=0.35")
            
            .addLabel("evidence", 0.72)
            .to(panels[0], { autoAlpha: 0, y: -14, scale: 0.985 }, "evidence")
            .fromTo(panels[1], { autoAlpha: 0, y: 14, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1 }, "evidence")
            .to(".step2-center", { autoAlpha: 1, scale: 1, duration: 0.2 }, "evidence+=0.1")
            .to(".step2-line1, .step2-line2, .step2-line3, .step2-line4", { autoAlpha: 1, duration: 0.3 }, "evidence+=0.15")
            .to(".step2-card1, .step2-card2, .step2-card3, .step2-card4", { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.05 }, "evidence+=0.2")
            .to(".step2-center-inner", { autoAlpha: 1, duration: 0.15 }, "evidence+=0.3")
            .to(panels[1], { autoAlpha: 1, duration: 0.72 }, "evidence+=0.28")
            
            .addLabel("directions", 1.72)
            .to(panels[1], { autoAlpha: 0, y: -14, scale: 0.985 }, "directions")
            .fromTo(panels[2], { autoAlpha: 0, y: 14, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1 }, "directions")
            .to(".step3-line", { strokeDashoffset: 0, duration: 0.3 }, "directions+=0.1")
            .to(".step3-card1", { autoAlpha: 1, y: 0, duration: 0.2 }, "directions+=0.15")
            .to(".step3-card3", { autoAlpha: 1, y: 0, duration: 0.2 }, "directions+=0.2")
            .to(".step3-card2", { autoAlpha: 1, y: 0, duration: 0.2 }, "directions+=0.25")
            .to(panels[2], { autoAlpha: 1, duration: 0.72 }, "directions+=0.28");
        },
      );

      return () => {
        media.revert();
        stageElement.style.removeProperty("--guide-header-height");
      };
    },
    { scope: guide },
  );

  return (
    <section
      className={styles.guide}
      ref={guide}
      id="how-it-works"
      aria-label="Project research workflow"
    >
      <div
        className={styles.stage}
        ref={stage}
        data-testid="scroll-guide-stage"
      >
        <div className={styles.workflowViewport}>
          <div className={styles.workflow}>
            <ol className={styles.steps} aria-label="Project research steps">
              {GUIDE_STEPS.map((step, index) => (
                <li
                  className={styles.step}
                  data-active={index === activeStep ? "true" : "false"}
                  aria-current={index === activeStep ? "step" : undefined}
                  key={step.title}
                >
                  <div>
                    <span className={styles.stepBadge}>
                      STEP {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <figure
              className={styles.visual}
              aria-labelledby="scroll-guide-visual-caption"
            >
              {GUIDE_STEPS.map((step, index) => (
                <div
                  className={styles.panel}
                  data-guide-panel={step.panelId}
                  aria-hidden="true"
                  key={step.panelId}
                >
                  {index === 0 && <StepOneVisual />}
                  {index === 1 && <StepTwoVisual />}
                  {index === 2 && <StepThreeVisual />}
                </div>
              ))}

              <figcaption
                className="visually-hidden"
                id="scroll-guide-visual-caption"
                aria-live="polite"
              >
                Step {activeStep + 1}: {GUIDE_STEPS[activeStep].title}
              </figcaption>
            </figure>
          </div>
        </div>

        <div className={styles.preview}>{preview}</div>

      </div>
    </section>
  );
}
