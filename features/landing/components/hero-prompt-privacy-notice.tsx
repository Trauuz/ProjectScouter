import Link from "next/link";

export function HeroPromptPrivacyNotice() {
  return (
    <p className="hero-composer__privacy" id="hero-prompt-privacy">
      Do not include personal, sensitive, or confidential information. Your
      prompt is sent to research and AI providers after you continue.{" "}
      <Link href="/privacy-policy">Privacy details</Link>
    </p>
  );
}
