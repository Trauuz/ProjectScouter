"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./landing-story.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const trustPoints = [
  "Recent public sources",
  "Three distinct directions",
  "Weak-evidence warnings",
  "Beginner-friendly scope",
] as const;

// ... (keep the rest of constants) ...
const evidenceStages = [
  {
    kind: "Observed evidence",
    title: "Public sources",
    description: "Recent discussions, reviews, and public pages provide the material ProjectScout can inspect.",
  },
  {
    kind: "Observed pattern",
    title: "Recurring complaints",
    description: "Repeated frustrations are grouped without treating a single comment as a market-wide fact.",
  },
  {
    kind: "Interpretation",
    title: "AI interpretation",
    description: "ProjectScout explains what the pattern may mean and keeps that inference separate from the source evidence.",
  },
  {
    kind: "Qualified synthesis",
    title: "Final recommendation",
    description: "A scoped project direction combines the signal, its limits, and a practical way to validate it.",
  },
] as const;

const directions = [
  {
    title: "Campus Momentum",
    targetUser: "Students who want a consistent workout partner.",
    coreProblem: "Motivation drops when schedules do not align and plans stay informal.",
    mvpScope: "Availability matching, one accountability partner, and shared weekly check-ins.",
    evidenceStrength: "Moderate — the complaint repeats publicly, but demand should be checked on one campus.",
  },
  {
    title: "Equipment Window",
    targetUser: "Campus gym visitors with limited time between classes.",
    coreProblem: "Crowding makes it difficult to know whether a short workout will be practical.",
    mvpScope: "Recent crowd reports, equipment availability, and preferred-session alerts.",
    evidenceStrength: "Moderate — crowding is a visible signal; reporting behavior still needs validation.",
  },
  {
    title: "Routine Reset",
    targetUser: "Beginners returning to exercise after a long break.",
    coreProblem: "Existing plans often assume momentum that a returning beginner does not have.",
    mvpScope: "A seven-day restart plan with short sessions and one daily reflection.",
    evidenceStrength: "Weak — the restart problem appears, but interest in a dedicated tool is uncertain.",
  },
] as const;

const audiences = [
  {
    name: "Students",
    description: "Turn a broad assignment theme into a project with a defensible problem and scope.",
  },
  {
    name: "Beginner developers",
    description: "Choose a direction that is useful without requiring an enterprise-sized build.",
  },
  {
    name: "Hackathon teams",
    description: "Compare viable directions before spending a short build window on the first idea mentioned.",
  },
  {
    name: "Portfolio builders",
    description: "Explain why a project exists, who it serves, and what evidence shaped the decision.",
  },
  {
    name: "Coursework projects",
    description: "Connect research, requirements, and a realistic implementation plan in one narrative.",
  },
] as const;

const principles = [
  {
    title: "Source-backed recommendations",
    description: "Recommendations should be grounded in the public evidence available for the topic.",
  },
  {
    title: "No invented market claims",
    description: "Unsupported assumptions stay labelled as interpretation, not presented as market facts.",
  },
  {
    title: "Differentiated ideas, not clones",
    description: "Each direction should change the user, problem, or product approach in a meaningful way.",
  },
  {
    title: "Realistic MVP scope",
    description: "The first version should fit the likely skill level and time available to build it.",
  },
] as const;

type SectionIntroProps = {
  description: string;
  headingId: string;
  title: string;
};

function SectionIntro({ description, headingId, title }: SectionIntroProps) {
  return (
    <header className={styles.sectionIntro + " section-intro"}>
      <h2 id={headingId} className="intro-heading">{title}</h2>
      <p className="intro-desc">{description}</p>
    </header>
  );
}

export function TrustStrip() {
  const container = useRef<HTMLElement>(null);
  
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        noMotion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean };
        gsap.set(".trust-elem", { autoAlpha: 1, y: 0 });

        if (reduceMotion) {
          gsap.set(".trust-line", { scaleX: 1 });
          return;
        }

        gsap.set(".trust-line", { scaleX: 0 });

        gsap.to(".trust-elem", {
          scrollTrigger: { 
            trigger: container.current, 
            start: "top 85%", 
            once: true,
          },
          autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out"
        });
        gsap.to(".trust-line", {
          scrollTrigger: { 
            trigger: container.current, 
            start: "top 85%", 
            once: true,
          },
          scaleX: 1, duration: 0.6, stagger: 0.1, ease: "power2.out", delay: 0.3
        });
      }
    );
  }, { scope: container });

  return (
    <section className={styles.trust} id="trust" aria-label="What ProjectScout prioritizes" ref={container}>
      <span className={"trust-elem " + styles.eyebrow}>Trusted Research Workflow</span>
      <ul className={styles.trustList}>
        {trustPoints.map((point, i) => (
          <li key={point} className="trust-elem">
            <span aria-hidden="true" className={styles.trustIcon} />
            {point}
            {i < trustPoints.length - 1 && <div className={"trust-line " + styles.trustLine} aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LandingStory() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        noMotion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean };

        const setInitial = (selector: string, props: gsap.TweenVars) => {
          if (!reduceMotion) gsap.set(selector, props);
        };

        // Evidence
        setInitial(".ev-intro .intro-heading, .ev-intro .intro-desc", { autoAlpha: 0, y: 20 });
        setInitial(".evidence-node", { autoAlpha: 0, y: 20 });
        setInitial(".evidence-line", { scaleX: 0, scaleY: 0 });
        setInitial(".evidence-node-inner", { scale: 0, autoAlpha: 0 });

        // Directions
        setInitial(".dir-intro .intro-heading, .dir-intro .intro-desc", { autoAlpha: 0, y: 20 });
        setInitial(".dir-topic", { autoAlpha: 0, scale: 0.95 });
        setInitial(".dir-svg path", { strokeDasharray: "200", strokeDashoffset: 200 });
        setInitial(".dir-card", { autoAlpha: 0, y: 30 });

        // Audience
        setInitial(".aud-intro .intro-heading, .aud-intro .intro-desc", { autoAlpha: 0, y: 20 });
        setInitial(".aud-card", { autoAlpha: 0, y: 30 });

        // Before/After
        setInitial(".trans-intro .intro-heading, .trans-intro .intro-desc", { autoAlpha: 0, y: 20 });
        setInitial(".trans-before", { autoAlpha: 0, x: -30 });
        setInitial(".trans-arrow", { autoAlpha: 0, scale: 0.5 });
        setInitial(".trans-after", { autoAlpha: 0, x: 30 });
        setInitial(".trans-highlight", { backgroundColor: "transparent" });

        // Principles
        setInitial(".princ-intro .intro-heading, .princ-intro .intro-desc", { autoAlpha: 0, y: 20 });
        setInitial(".princ-item", { autoAlpha: 0, y: 20 });

        if (reduceMotion) return;

        // Animations
        const evTl = gsap.timeline({ scrollTrigger: { trigger: "#evidence", start: "top 85%", once: true } });
        evTl.to(".ev-intro .intro-heading", { autoAlpha: 1, y: 0, duration: 0.4 })
            .to(".ev-intro .intro-desc", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
            .to(".evidence-node", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.3 }, "-=0.2")
            .to(".evidence-line", { scaleX: 1, scaleY: 1, duration: 0.4, stagger: 0.3 }, "-=1.2")
            .to(".evidence-node-inner", { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.3 }, "-=1.1");

        const dirTl = gsap.timeline({ scrollTrigger: { trigger: "#directions", start: "top 85%", once: true } });
        dirTl.to(".dir-intro .intro-heading", { autoAlpha: 1, y: 0, duration: 0.4 })
             .to(".dir-intro .intro-desc", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
             .to(".dir-topic", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)" }, "-=0.2")
             .to(".dir-svg path", { strokeDashoffset: 0, duration: 0.6, stagger: 0.1, ease: "power2.inOut" })
             .to(".dir-card", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.15, ease: "power2.out" }, "-=0.4");

        const audTl = gsap.timeline({ scrollTrigger: { trigger: "#audience", start: "top 85%", once: true } });
        audTl.to(".aud-intro .intro-heading", { autoAlpha: 1, y: 0, duration: 0.4 })
             .to(".aud-intro .intro-desc", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
             .to(".aud-card", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.2");

        const transTl = gsap.timeline({ scrollTrigger: { trigger: "#before-after", start: "top 85%", once: true } });
        transTl.to(".trans-intro .intro-heading", { autoAlpha: 1, y: 0, duration: 0.4 })
               .to(".trans-intro .intro-desc", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
               .to(".trans-before", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power2.out" }, "-=0.1")
               .to(".trans-arrow", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "-=0.2")
               .to(".trans-after", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power2.out" }, "-=0.2")
               .to(".trans-highlight", { backgroundColor: "var(--color-accent-soft)", duration: 0.8, stagger: 0.15 }, "-=0.1");

        const princTl = gsap.timeline({ scrollTrigger: { trigger: "#principles", start: "top 85%", once: true } });
        princTl.to(".princ-intro .intro-heading", { autoAlpha: 1, y: 0, duration: 0.4 })
               .to(".princ-intro .intro-desc", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
               .to(".princ-item", { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.2, ease: "power2.out" }, "-=0.2");
      }
    );
  }, { scope: container });

  return (
    <div ref={container}>
      <section className={styles.storySection} id="evidence" aria-labelledby="evidence-title">
        <div className="ev-intro">
          <SectionIntro
            headingId="evidence-title"
            title="Follow the evidence into the recommendation."
            description="ProjectScout keeps what people said separate from what the system infers, so a recommendation never masquerades as a sourced fact."
          />
        </div>
        <div className={styles.evidencePipeline}>
          {evidenceStages.map((stage, i) => (
            <div key={stage.title} className={styles.evidenceStage + " evidence-node"} data-active={i === evidenceStages.length - 1 ? "true" : "false"}>
              <div className={styles.evidenceNodeIcon} aria-hidden="true">
                <div className={styles.evidenceNodeInner + " evidence-node-inner"} />
              </div>
              <div className={styles.evidenceContent}>
                <span className={styles.eyebrow}>{stage.kind}</span>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </div>
              {i < evidenceStages.length - 1 && (
                <div className={styles.evidenceConnector + " evidence-line"} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.storySection} id="directions" aria-labelledby="directions-title">
        <div className="dir-intro">
          <SectionIntro
            headingId="directions-title"
            title="One topic. Three different bets."
            description="The same research can support different users, problems, and product shapes. The comparison makes those trade-offs visible."
          />
        </div>
        <div className={styles.directionsContainer}>
          <div className={styles.directionsTopic + " dir-topic"}>
            <span className={styles.eyebrow}>Research Topic</span>
            <h3>Student Fitness Apps</h3>
          </div>
          <svg className="dir-svg" width="300" height="60" viewBox="0 0 300 60" fill="none" preserveAspectRatio="none" style={{ overflow: "visible" }}>
            <path d="M150 0 C 150 30, 50 30, 50 60" stroke="var(--color-rule)" strokeWidth="2" fill="none" />
            <path d="M150 0 L 150 60" stroke="var(--color-rule)" strokeWidth="2" fill="none" />
            <path d="M150 0 C 150 30, 250 30, 250 60" stroke="var(--color-rule)" strokeWidth="2" fill="none" />
          </svg>
          <div className={styles.directionsGrid}>
            {directions.map((direction) => (
              <article className={styles.directionCard + " dir-card"} key={direction.title}>
                <h3>{direction.title}</h3>
                <dl>
                  <div>
                    <dt>Target user</dt>
                    <dd>{direction.targetUser}</dd>
                  </div>
                  <div>
                    <dt>Core problem</dt>
                    <dd>{direction.coreProblem}</dd>
                  </div>
                  <div>
                    <dt>MVP scope</dt>
                    <dd>{direction.mvpScope}</dd>
                  </div>
                  <div>
                    <dt>Evidence strength</dt>
                    <dd>{direction.evidenceStrength}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.storySection} id="audience" aria-labelledby="audience-title">
        <div className="aud-intro">
          <SectionIntro
            headingId="audience-title"
            title="Research direction without a research department."
            description="ProjectScout is built for people who need a credible project decision without advanced market-research experience."
          />
        </div>
        <dl className={styles.audienceGrid}>
          {audiences.map((audience) => (
            <div key={audience.name} className={styles.audienceCard + " aud-card"}>
              <dt>{audience.name}</dt>
              <dd>{audience.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.transformation} id="before-after" aria-labelledby="transformation-title">
        <div className="trans-intro">
          <SectionIntro
            headingId="transformation-title"
            title="Move from an interest to a direction."
            description="Specificity arrives through evidence: a clearer user, a repeated problem, and a first version that can be tested."
          />
        </div>
        <div className={styles.transformationFlow}>
          <div className={styles.transformCard + " trans-before"} data-state="before">
            <span className={styles.eyebrow}>Before</span>
            <p>“I want to build something with fitness”</p>
          </div>
          <div className={styles.transformArrow + " trans-arrow"} aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
          <div className={styles.transformCard + " trans-after"} data-state="after">
            <span className={styles.eyebrow}>After</span>
            <p>
              A <span className="trans-highlight">beginner-friendly</span> campus workout <span className="trans-highlight">accountability app</span> based on recurring complaints about <span className="trans-highlight">motivation and scheduling</span>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.storySection} id="principles" aria-labelledby="principles-title">
        <div className="princ-intro">
          <SectionIntro
            headingId="principles-title"
            title="The rules behind a useful direction."
            description="These constraints keep the output honest, meaningfully different, and realistic enough to build."
          />
        </div>
        <ul className={styles.principleList}>
          {principles.map((principle, i) => (
            <li key={principle.title} className={styles.principleItem + " princ-item"}>
              <div className={styles.principleIndex}>0{i + 1}</div>
              <div className={styles.principleContent}>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

