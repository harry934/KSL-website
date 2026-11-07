import type { Metadata } from "next";
import localFont from "next/font/local";
import { FeedbackProvider } from "@/components/ui/feedback";
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
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} font-sans antialiased`}>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
