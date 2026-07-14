"use client";

import dynamic from "next/dynamic";
import { type ReactNode } from "react";

const ThemeProvider = dynamic(
  () => import("./ThemeProvider").then((mod) => ({ default: mod.ThemeProvider })),
  { ssr: false }
);

const WalletProvider = dynamic(
  () => import("./WalletProvider").then((mod) => ({ default: mod.WalletProvider })),
  { ssr: false }
);

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>{children}</WalletProvider>
    </ThemeProvider>
  );
}
