import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
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
      <body className={`${sourceSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
