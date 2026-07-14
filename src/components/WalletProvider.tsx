"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// Lazy-load @stacks/connect only on the client
let connectModule: any = null;
async function getConnectModule() {
  if (!connectModule) {
    connectModule = await import("@stacks/connect");
  }
  return connectModule;
}

interface WalletState {
  connected: boolean;
  address: string | null;
  addresses: { symbol?: string; address: string }[];
  connecting: boolean;
}

interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  address: null,
  addresses: [],
  connecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    addresses: [],
    connecting: false,
  });

  // Restore connection from localStorage on mount
  useEffect(() => {
    getConnectModule().then((mod) => {
      if (mod.isConnected()) {
        const stored = mod.getLocalStorage();
        const stxAddr = stored?.addresses?.stx?.[0];
        setState({
          connected: true,
          address: stxAddr?.address ?? null,
          addresses: stored?.addresses?.stx ?? [],
          connecting: false,
        });
      }
    }).catch(() => {});
  }, []);

  const connectWallet = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      const mod = await getConnectModule();
      const result = await mod.connect();
      const stxAddrs = result.addresses.filter(
        (a: any) => a.symbol === "STX" || !a.symbol
      );
      setState({
        connected: true,
        address: stxAddrs[0]?.address ?? null,
        addresses: stxAddrs,
        connecting: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection rejected";
      if (!msg.includes("reject") && !msg.includes("closed")) {
        console.error("Wallet connect error:", err);
      }
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    const mod = await getConnectModule();
    mod.disconnect();
    setState({
      connected: false,
      address: null,
      addresses: [],
      connecting: false,
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
