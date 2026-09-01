import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

let cached: { raw: string } | null = null;

export function GET() {
  if (!cached) {
    cached = {
      raw: readFileSync(
        path.join(process.cwd(), "data", "history_compare.json"),
        "utf-8"
      ),
    };
  }
  return new NextResponse(cached.raw, {
    headers: { "Content-Type": "application/json" },
  });
}
