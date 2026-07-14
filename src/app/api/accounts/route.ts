import { NextResponse } from "next/server";

// Generate a random Stacks testnet address
function randomAddress(): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let addr = "ST";
  for (let i = 0; i < 38; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
}

// Fund a testnet address via Hiro faucet
async function fundAddress(address: string): Promise<{ funded: boolean; txId?: string }> {
  try {
    const res = await fetch(
      `https://api.testnet.hiro.so/extended/v1/faucets/stx?address=${address}&stacking=false`,
      { method: "POST" }
    );
    if (res.ok) {
      const data = await res.json();
      return { funded: true, txId: data.txid };
    }
    return { funded: false };
  } catch {
    return { funded: false };
  }
}

export async function GET() {
  const accounts = [];
  const count = 5;

  for (let i = 0; i < count; i++) {
    const address = randomAddress();
    
    // Try to fund via faucet
    const fundResult = await fundAddress(address);

    accounts.push({
      address,
      balance: "100 STX", // simulated initial balance
      funded: fundResult.funded,
      faucetTxId: fundResult.txId || null,
      label: `Account ${i + 1}`,
    });
  }

  return NextResponse.json({ accounts });
}
