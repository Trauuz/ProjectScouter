"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "./auth-context";

export function StartResearchButton({
  className = "button",
  children = "Start research",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();

  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        if (auth.requireAuth({ kind: "open_research" }, "signup")) {
          router.push("/research");
        }
      }}
    >
      {children}
    </button>
  );
}

