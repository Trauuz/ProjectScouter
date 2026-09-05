"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  MOTION_SPEED_MULTIPLIER,
  speedAdjustedInterval,
} from "@/shared/motion/motion-config";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function serverReducedMotionSnapshot() {
  return false;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const isReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    serverReducedMotionSnapshot,
  );

  useGSAP(() => {
    const previousTimeScale = gsap.globalTimeline.timeScale();
    gsap.globalTimeline.timeScale(MOTION_SPEED_MULTIPLIER);

    return () => {
      gsap.globalTimeline.timeScale(previousTimeScale);
    };
  }, []);

  if (isReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        anchors: true,
        lerp: 0.1 * MOTION_SPEED_MULTIPLIER,
        duration: speedAdjustedInterval(1),
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
