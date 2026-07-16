import type { Metadata } from "next";
import { Space_Grotesk, DM_Mono } from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
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
  metadataBase: new URL("https://clarityforge-sigma.vercel.app"),
  title: "ClarityForge — Browser IDE for Clarity",
  description:
    "Browser-based IDE for Clarity smart contracts. Write, simulate, and deploy on Stacks — no CLI required.",
  openGraph: {
    title: "ClarityForge — Browser IDE for Clarity",
    description: "Browser-based IDE for Clarity smart contracts. Write, simulate, and deploy on Stacks.",
    url: "https://clarityforge.vercel.app",
    images: [{ url: "/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClarityForge — Browser IDE for Clarity",
    description: "Browser-based IDE for Clarity smart contracts.",
    images: ["/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable}`}>
      <body className="bg-bg text-text antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
