import { NextResponse } from "next/server";
import { getTodayMatches } from "@/lib/match-service";
import { MOCK_MATCHES } from "@/lib/mock-data";

const useMock = !process.env.FOOTBALL_DATA_API_KEY;

export async function GET() {
  if (useMock) {
    return NextResponse.json({ matches: MOCK_MATCHES });
  }

  try {
    const all = await getTodayMatches();
    const matches = all.filter(
      (m) => m.status === "SCHEDULED" || m.status === "TIMED"
    );
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Failed to fetch matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's matches" },
      { status: 500 }
    );
  }
}
