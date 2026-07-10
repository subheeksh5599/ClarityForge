import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#0C0C0D",
          padding: 80,
          fontFamily: "Space Grotesk",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 6,
              backgroundColor: "#EBEBE5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <path d="M3 13L8 3L13 13H3Z" stroke="#0C0C0D" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#EBEBE5" }}>
            Clarity<span style={{ color: "#999999" }}>Forge</span>
          </span>
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#EBEBE5",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 900,
          }}
        >
          The Remix of Stacks.
        </h1>
        <p style={{ fontSize: 28, color: "#999999", marginTop: 24, maxWidth: 700 }}>
          Browser-based IDE for Clarity smart contracts. Write, simulate, deploy.
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
