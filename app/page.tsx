import { redirect } from "next/navigation";

import { LandingPage } from "@/features/landing";
import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";

export default async function Home() {
  if (await getOptionalAuthIdentity()) {
    redirect("/research");
  }

  return <LandingPage />;
}
