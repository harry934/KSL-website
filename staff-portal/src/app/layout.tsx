import type { Metadata } from "next";
import type { CSSProperties } from "react";
import localFont from "next/font/local";
import { FeedbackProvider } from "@/components/ui/feedback";
import { PUBLIC_SITE_URL } from "@/lib/site-url";
import "./globals.css";

const sourceSans = localFont({
  src: "../fonts/source-sans-3-latin-wght-normal.woff2",
  variable: "--font-source-sans",
  display: "swap",
  weight: "200 900",
});

export const metadata: Metadata = {
  title: "KSL Admin portal",
  description: "Kenya Shipyards Limited staff content management",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/favicon.png", type: "image/png" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteRoot = `${PUBLIC_SITE_URL}/`;
  const publicAssets = {
    "--ksl-flag-strip": `url("${new URL("img/ksl/kenya-flag-strip.png", siteRoot)}")`,
    "--ksl-public-banner-photo": `url("${new URL("img/ksl/mombasa.webp", siteRoot)}")`,
  } as CSSProperties;
  return (
    <html lang="en" style={publicAssets}>
      <body className={`${sourceSans.variable} font-sans antialiased`}>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
