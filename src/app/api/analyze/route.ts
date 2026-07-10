import { NextRequest, NextResponse } from "next/server";
import { analyze, analyzeCost } from "@/lib/clarity/analyzer";

const MAX_CODE_LENGTH = 100_000; // 100KB
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3456",
  "https://clarityforge-sigma.vercel.app",
  "https://clarityforge.vercel.app",
];

export async function POST(req: NextRequest) {
  // Origin check (CSRF protection)
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = ALLOWED_ORIGINS.some((o) => origin === o)
    || process.env.NODE_ENV === "development"
    || origin === ""; // same-origin requests

  if (!isAllowed) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  // Content-Type check
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  // Parse body
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Missing 'code' field" }, { status: 400 });
  }

  // Length limit
  if (body.code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({
      error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
    }, { status: 413 });
  }

  // Analyze
  const result = analyze(body.code);
  const cost = analyzeCost(body.code);

  return NextResponse.json({
    ...result,
    costEstimate: cost,
  });
}

// Rate limiting via config
export const runtime = "nodejs";
export const maxDuration = 5; // 5 second timeout
