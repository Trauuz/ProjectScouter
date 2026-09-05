import React from "react";

export function StepOneVisual() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="step-one-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
          <stop offset="42%" stopColor="var(--color-accent)" stopOpacity="0.08" />
          <stop offset="72%" stopColor="var(--color-accent)" stopOpacity="0.025" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="250" cy="205" rx="230" ry="185" fill="url(#step-one-glow)" className="step1-bg" />
      <rect x="60" y="80" width="380" height="200" rx="16" fill="var(--color-paper-raised)" stroke="var(--color-rule)" strokeWidth="1" className="step1-window" />
      <rect x="60" y="80" width="380" height="48" rx="16" fill="var(--color-paper)" className="step1-header" />
      <circle cx="85" cy="104" r="5" fill="var(--color-rule)" />
      <circle cx="105" cy="104" r="5" fill="var(--color-rule)" />
      <circle cx="125" cy="104" r="5" fill="var(--color-rule)" />
      <path d="M60 128H440" stroke="var(--color-rule)" strokeWidth="1" />
      <rect x="90" y="160" width="180" height="12" rx="6" fill="var(--color-ink-soft)" className="step1-line1" />
      <rect x="90" y="190" width="140" height="10" rx="5" fill="var(--color-ink-faint)" className="step1-line2" />
      <rect x="90" y="220" width="320" height="40" rx="8" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1" className="step1-input" />
      <path d="M105 240l4-8 4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="var(--color-accent)" className="step1-icon" />
      <rect x="130" y="236" width="120" height="8" rx="4" fill="var(--color-ink-soft)" className="step1-text" />
      <rect x="255" y="232" width="2" height="16" fill="var(--color-accent-dark)" className="step1-cursor" />
      <rect x="375" y="228" width="24" height="24" rx="6" fill="var(--color-accent-soft)" className="step1-btn" />
      <path d="M383 240l4-4 4 4" stroke="var(--color-accent-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="step1-btn-arrow" />
    </svg>
  );
}

export function StepTwoVisual() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <circle cx="250" cy="200" r="150" fill="var(--color-accent-dark)" opacity="0.03" filter="blur(60px)" />
      <path d="M250 200 L120 120" stroke="var(--color-rule)" strokeWidth="2" strokeDasharray="4 4" className="step2-line1" />
      <path d="M250 200 L380 120" stroke="var(--color-rule)" strokeWidth="2" strokeDasharray="4 4" className="step2-line2" />
      <path d="M250 200 L120 280" stroke="var(--color-rule)" strokeWidth="2" strokeDasharray="4 4" className="step2-line3" />
      <path d="M250 200 L380 280" stroke="var(--color-rule)" strokeWidth="2" strokeDasharray="4 4" className="step2-line4" />
      <circle cx="250" cy="200" r="32" fill="var(--color-paper-raised)" stroke="var(--color-accent)" strokeWidth="2" className="step2-center" />
      <circle cx="250" cy="200" r="14" fill="var(--color-accent-soft)" className="step2-center-inner" />
      <g className="step2-card1">
        <rect x="60" y="80" width="120" height="80" rx="8" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1" />
        <rect x="75" y="95" width="40" height="8" rx="4" fill="var(--color-ink-soft)" />
        <rect x="75" y="115" width="80" height="6" rx="3" fill="var(--color-ink-faint)" />
        <rect x="75" y="128" width="60" height="6" rx="3" fill="var(--color-ink-faint)" />
      </g>
      <g className="step2-card2">
        <rect x="320" y="80" width="120" height="80" rx="8" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1" />
        <rect x="335" y="95" width="50" height="8" rx="4" fill="var(--color-ink-soft)" />
        <rect x="335" y="115" width="70" height="6" rx="3" fill="var(--color-ink-faint)" />
        <rect x="335" y="128" width="60" height="6" rx="3" fill="var(--color-ink-faint)" />
      </g>
      <g className="step2-card3">
        <rect x="60" y="240" width="120" height="80" rx="8" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1" />
        <rect x="75" y="255" width="45" height="8" rx="4" fill="var(--color-ink-soft)" />
        <rect x="75" y="275" width="85" height="6" rx="3" fill="var(--color-ink-faint)" />
        <rect x="75" y="288" width="55" height="6" rx="3" fill="var(--color-ink-faint)" />
      </g>
      <g className="step2-card4">
        <rect x="320" y="240" width="120" height="80" rx="8" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1" />
        <rect x="335" y="255" width="35" height="8" rx="4" fill="var(--color-ink-soft)" />
        <rect x="335" y="275" width="75" height="6" rx="3" fill="var(--color-ink-faint)" />
        <rect x="335" y="288" width="65" height="6" rx="3" fill="var(--color-ink-faint)" />
      </g>
    </svg>
  );
}

export function StepThreeVisual() {
  const cards = [
    { id: 1, x: 50 },
    { id: 2, x: 190 },
    { id: 3, x: 330 },
  ];

  return (
    <svg width="100%" height="100%" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <circle cx="250" cy="200" r="150" fill="var(--color-accent-soft)" opacity="0.05" filter="blur(60px)" />
      <path d="M250 80 L250 110" stroke="var(--color-rule)" strokeWidth="2" className="step3-line" />
      <path d="M110 110 L390 110" stroke="var(--color-rule)" strokeWidth="2" className="step3-line" />
      <path d="M110 110 L110 130" stroke="var(--color-rule)" strokeWidth="2" className="step3-line" />
      <path d="M390 110 L390 130" stroke="var(--color-rule)" strokeWidth="2" className="step3-line" />
      <path d="M250 110 L250 130" stroke="var(--color-rule)" strokeWidth="2" className="step3-line" />

      {cards.map((c) => (
        <g key={c.id} className={`step3-card step3-card${c.id}`}>
          {/* Base Border */}
          <rect x={c.x} y="130" width="120" height="180" rx="10" fill="var(--color-paper)" stroke="var(--color-rule)" strokeWidth="1" className="s3-card-base" />

          {/* Active Highlight Border (hidden by default) */}
          <rect x={c.x} y="130" width="120" height="180" rx="10" fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0" className="s3-card-border" />

          {/* Glow (hidden by default) */}
          <rect x={c.x} y="130" width="120" height="180" rx="10" fill="var(--color-accent-soft)" opacity="0" filter="blur(20px)" className="s3-glow" />

          {/* Icon container */}
          <rect x={c.x + 15} y="150" width="32" height="32" rx="16" fill="var(--color-workspace-soft)" className="s3-icon-bg" />

          {/* Checkmark (hidden by default) */}
          <path d={`M${c.x + 23} 166l5 5 9-9`} stroke="var(--color-accent-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0" className="s3-check" />

          {/* Text lines */}
          <rect x={c.x + 15} y="195" width="80" height="10" rx="5" fill="var(--color-ink-soft)" className="s3-text-strong" />
          <rect x={c.x + 15} y="215" width="60" height="8" rx="4" fill="var(--color-ink-faint)" className="s3-text-weak" />
          <rect x={c.x + 15} y="235" width="70" height="8" rx="4" fill="var(--color-ink-faint)" className="s3-text-weak" />
          <rect x={c.x + 15} y="255" width="40" height="8" rx="4" fill="var(--color-ink-faint)" className="s3-text-weak" />
        </g>
      ))}
    </svg>
  );
}
