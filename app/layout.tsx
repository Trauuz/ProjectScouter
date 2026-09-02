import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import { AuthProvider } from "@/features/auth";
import { SmoothScroll } from "@/shared/layout/smooth-scroll";
import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import "@/features/auth/auth.css";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ProjectScout - Find the project worth building",
  description:
    "Evidence-backed discovery for people shaping their next project.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getOptionalAuthIdentity();

  return (
    <html
      lang="en"
      
      className={`${newsreader.variable} ${ibmPlexSans.variable}`}
    >
      <body suppressHydrationWarning>
        <SmoothScroll><AuthProvider initialUser={initialUser}>{children}</AuthProvider></SmoothScroll>
      </body>
    </html>
  );
}

