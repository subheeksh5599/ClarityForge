"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// Direct Stacks wallet integration (SIP-030) — no @stacks/connect dependency
// Leather/Xverse wallets inject window.StacksProvider

interface StacksProvider {
  request(method: string, params?: any): Promise<any>;
}

interface WalletState {
  connected: boolean;
  address: string | null;
  connecting: boolean;
}

interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  address: null,
  connecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

function getProvider(): StacksProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.StacksProvider || w.LeatherProvider || w.XverseProvider || null;
}

function getStoredAddress(): string | null {
  try {
    const data = localStorage.getItem("@stacks/connect");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed?.addresses?.stx?.[0]?.address || null;
  } catch {
    return null;
  }
}

function clearStoredAddress() {
  try {
    localStorage.removeItem("@stacks/connect");
  } catch {}
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    connecting: false,
  });

  // Restore connection from localStorage on mount
  useEffect(() => {
    const addr = getStoredAddress();
    if (addr) {
      setState({ connected: true, address: addr, connecting: false });
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      const provider = getProvider();
      if (!provider) {
        // No wallet extension found — prompt user to install
        const installed = window.confirm(
          "No Stacks wallet detected.\n\nInstall Leather (leather.io) or Xverse (xverse.app) to connect.\n\nClick OK to open Leather."
        );
        if (installed) window.open("https://leather.io", "_blank");
        setState((s) => ({ ...s, connecting: false }));
        return;
      }

      // Request addresses from wallet (SIP-030 getAddresses)
      const result = await provider.request("getAddresses", {
        network: "testnet",
      });

      const addresses = result?.result?.addresses || result?.addresses || [];
      const stxAddr = addresses.find(
        (a: any) => a.symbol === "STX" || !a.symbol
      );

      if (stxAddr?.address) {
        // Store in localStorage for persistence
        try {
          localStorage.setItem(
            "@stacks/connect",
            JSON.stringify({
              addresses: { stx: [{ address: stxAddr.address }] },
              version: "1",
            })
          );
        } catch {}

        setState({
          connected: true,
          address: stxAddr.address,
          connecting: false,
        });
      } else {
        throw new Error("No STX address returned");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection rejected";
      if (!msg.includes("reject") && !msg.includes("closed") && !msg.includes("cancel")) {
        console.error("Wallet connect error:", msg);
      }
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    clearStoredAddress();
    setState({
      connected: false,
      address: null,
      connecting: false,
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{ ...state, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Deploy helper — call from demo page
export async function deployContract(code: string, contractName: string): Promise<{
  txid?: string;
  contractId?: string;
  error?: string;
}> {
  const provider = getProvider();
  if (!provider) {
    return { error: "No wallet detected. Install Leather or Xverse." };
  }

  try {
    // Get addresses first
    const addrResult = await provider.request("getAddresses", {
      network: "testnet",
    });
    const addresses = addrResult?.result?.addresses || addrResult?.addresses || [];
    const stxAddr = addresses.find((a: any) => a.symbol === "STX" || !a.symbol);
    const deployer = stxAddr?.address;
    if (!deployer) {
      return { error: "No STX address found in wallet" };
    }

    // Request contract deployment
    const result = await provider.request("stx_deployContract", {
      name: contractName,
      clarityCode: code,
      network: "testnet",
    });

    // Extract txid from various response formats
    const txid =
      result?.result?.txid ||
      result?.txid ||
      result?.result?.transaction?.txid ||
      "";

    return {
      txid,
      contractId: `${deployer}.${contractName}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Deploy failed";
    return { error: msg };
  }
}
