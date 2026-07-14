"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { WalletProvider } from "./WalletProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>{children}</WalletProvider>
    </ThemeProvider>
  );
}
