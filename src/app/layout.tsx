import type { Metadata } from "next";
import { Space_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ClarityForge — The Visual IDE for Stacks",
  description:
    "A browser-based IDE for Clarity smart contracts. Build, simulate, and deploy directly to the Stacks blockchain — no CLI required.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable} scroll-smooth`}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
