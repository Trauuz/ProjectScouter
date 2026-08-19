"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function MotionScene({ children }: { children: ReactNode }) {
  const scene = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          allowMotion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as {
            reduceMotion: boolean;
            allowMotion: boolean;
          };
          const targets = [
            "[data-animate='hero-line']",
            "[data-animate='hero-aside']",
            "[data-animate='hero-visual']",
            "[data-animate='hero-bg']",
            ".direction-cta > *",
          ];

          if (reduceMotion) {
            gsap.set(targets, { clearProps: "all" });
            return;
          }

          const timeline = gsap.timeline({
            defaults: {
              duration: 0.58,
              ease: "power3.out",
            },
          });

          timeline
            .fromTo(
              "[data-animate='hero-line']",
              {
                yPercent: 28,
                autoAlpha: 0,
                willChange: "transform,opacity",
              },
              {
                yPercent: 0,
                autoAlpha: 1,
                stagger: 0.08,
                clearProps: "transform,opacity,visibility,willChange",
              },
            )
            .fromTo(
              "[data-animate='hero-aside']",
              {
                y: 12,
                autoAlpha: 0,
                willChange: "transform,opacity",
              },
              {
                y: 0,
                autoAlpha: 1,
                stagger: 0.05,
                clearProps: "transform,opacity,visibility,willChange",
              },
              "<0.16",
            )
            .fromTo(
              "[data-animate='hero-visual']",
              {
                y: 20,
                autoAlpha: 0,
                willChange: "transform,opacity",
              },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                clearProps: "transform,opacity,visibility,willChange",
              },
              "-=0.18",
            );

          gsap.fromTo(
            "[data-animate='hero-bg']",
            { backgroundPosition: "0px 0px" },
            {
              backgroundPosition: "-150px 150px",
              ease: "none",
              scrollTrigger: {
                trigger: scene.current?.querySelector(".hero") || ".hero",
                start: "top top",
                end: "bottom top",
                scrub: 1,
              },
            },
          );

          gsap.fromTo(
            ".direction-cta > *",
            {
              y: -24,
              autoAlpha: 0,
              willChange: "transform,opacity",
            },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.64,
              ease: "power3.out",
              stagger: 0.08,
              clearProps: "transform,opacity,visibility,willChange",
              scrollTrigger: {
                trigger: ".direction-cta",
                start: "top 78%",
                once: true,
              },
            },
          );
        },
      );

      return () => media.revert();
    },
    { scope: scene },
  );

  return <div ref={scene}>{children}</div>;
}
