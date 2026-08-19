"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function AuthSuccessIcon() {
  const badgeRef = useRef<SVGPolygonElement>(null);

  useGSAP(() => {
    // Check if the user prefers reduced motion
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    
    if (prefersReducedMotion || !badgeRef.current) {
      return;
    }

    // Spin infinitely and linearly
    gsap.to(badgeRef.current, {
      rotation: 360,
      duration: 20, // Slow, smooth rotation
      ease: "none",
      repeat: -1,
      transformOrigin: "50% 50%",
    });
  }, []);

  return (
    <svg
      className="auth-success-icon"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Success checkmark"
    >
      <g>
        <polygon
          ref={badgeRef}
          points="50.00,5.50 52.28,6.42 54.33,8.84 56.04,11.87 57.56,14.44 59.19,15.71 61.24,15.42 63.84,13.95 66.84,12.19 69.81,11.12 72.25,11.46 73.77,13.40 74.33,16.51 74.30,19.99 74.33,22.98 75.10,24.90 77.02,25.67 80.01,25.70 83.49,25.67 86.60,26.23 88.54,27.75 88.88,30.19 87.81,33.16 86.05,36.16 84.58,38.76 84.29,40.81 85.56,42.44 88.13,43.96 91.16,45.67 93.58,47.72 94.50,50.00 93.58,52.28 91.16,54.33 88.13,56.04 85.56,57.56 84.29,59.19 84.58,61.24 86.05,63.84 87.81,66.84 88.88,69.81 88.54,72.25 86.60,73.77 83.49,74.33 80.01,74.30 77.02,74.33 75.10,75.10 74.33,77.02 74.30,80.01 74.33,83.49 73.77,86.60 72.25,88.54 69.81,88.88 66.84,87.81 63.84,86.05 61.24,84.58 59.19,84.29 57.56,85.56 56.04,88.13 54.33,91.16 52.28,93.58 50.00,94.50 47.72,93.58 45.67,91.16 43.96,88.13 42.44,85.56 40.81,84.29 38.76,84.58 36.16,86.05 33.16,87.81 30.19,88.88 27.75,88.54 26.23,86.60 25.67,83.49 25.70,80.01 25.67,77.02 24.90,75.10 22.98,74.33 19.99,74.30 16.51,74.33 13.40,73.77 11.46,72.25 11.12,69.81 12.19,66.84 13.95,63.84 15.42,61.24 15.71,59.19 14.44,57.56 11.87,56.04 8.84,54.33 6.42,52.28 5.50,50.00 6.42,47.72 8.84,45.67 11.87,43.96 14.44,42.44 15.71,40.81 15.42,38.76 13.95,36.16 12.19,33.16 11.12,30.19 11.46,27.75 13.40,26.23 16.51,25.67 19.99,25.70 22.98,25.67 24.90,24.90 25.67,22.98 25.70,19.99 25.67,16.51 26.23,13.40 27.75,11.46 30.19,11.12 33.16,12.19 36.16,13.95 38.76,15.42 40.81,15.71 42.44,14.44 43.96,11.87 45.67,8.84 47.72,6.42"
          fill="var(--color-success)"
        />
        <path
          d="M35 52 L45 62 L65 40"
          fill="none"
          stroke="var(--color-paper-raised)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
