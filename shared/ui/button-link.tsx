import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  children: ReactNode;
  href: string;
  className?: string;
  showArrow?: boolean;
};

export function ButtonLink({
  children,
  href,
  className = "",
  showArrow = true,
}: ButtonLinkProps) {
  return (
    <Link className={`button ${className}`.trim()} href={href}>
      <span>{children}</span>
      {showArrow ? <span aria-hidden="true">{"\u2197"}</span> : null}
    </Link>
  );
}
