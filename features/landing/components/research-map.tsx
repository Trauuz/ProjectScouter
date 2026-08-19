import { HeroComposer } from "./hero-composer";

export function ResearchMap() {
  return (
    <figure
      className="hero-workspace"
      aria-labelledby="research-map-caption"
      data-animate="hero-visual"
    >
      <HeroComposer />
      <figcaption className="visually-hidden" id="research-map-caption">
        Enter a project topic to begin an evidence-backed research brief.
      </figcaption>
    </figure>
  );
}
