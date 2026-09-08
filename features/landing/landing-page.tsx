import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";
import { MotionScene } from "@/shared/motion/motion-scene";
import { StartResearchButton } from "@/features/auth";

import { ResearchMap } from "./components/research-map";
import { LandingStory, TrustStrip } from "./components/landing-story";
import { ScrollGuide } from "./components/scroll-guide";

export function LandingPage() {
  return (
    <MotionScene>
      <SiteHeader />
      <main id="top">
        <section className="hero" id="hero" aria-labelledby="hero-title">
          <div className="hero__bg" data-animate="hero-bg" />
          <div className="hero__copy">
            <p className="hero__eyebrow" data-animate="hero-aside">
              [ Evidence-backed project research ]
            </p>
            <h1 id="hero-title">
              <span className="hero__line" data-animate="hero-line">
                Build better projects.
              </span>
              <span className="hero__line" data-animate="hero-line">
                Start with evidence.
              </span>
            </h1>
            <p className="hero__lede" data-animate="hero-aside">
              ProjectScout researches current problems, traces supporting
              evidence, and returns three distinct directions.
            </p>
          </div>
          <ResearchMap />
        </section>

        <ScrollGuide preview={<TrustStrip />} />

        <LandingStory />

        <section
          className="direction-cta"
          id="research"
          aria-labelledby="direction-title"
        >
          <h2 id="direction-title">Ready to test a direction?</h2>
          <p>
            Bring a rough topic. Leave with three evidence-backed directions.
          </p>
          <StartResearchButton className="button direction-cta__button">
            Get started for free
          </StartResearchButton>
        </section>
      </main>
      <SiteFooter />
    </MotionScene>
  );
}
