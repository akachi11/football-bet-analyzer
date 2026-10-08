import { NextResponse } from "next/server";
import { getMatchAnalysis } from "@/lib/match-service";
import { getBudgetStatus } from "@/lib/api-football";
import { getMockAnalysis } from "@/lib/mock-data";
import type { MatchAnalysisData } from "@/lib/types";

const useMock = !process.env.FOOTBALL_DATA_API_KEY;
const inflightAnalysis = new Map<number, Promise<MatchAnalysisData>>();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id, 10);

  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  if (useMock) {
    return NextResponse.json({
      analysis: getMockAnalysis(matchId),
      budget: { remaining: 95 },
    });
  }

  const budget = getBudgetStatus();
  if (!budget.allowed) {
    return NextResponse.json(
      {
        error: "API request budget exhausted for today",
        remaining: budget.remaining,
      },
      { status: 429 }
    );
  }

  try {
    let promise = inflightAnalysis.get(matchId);
    if (!promise) {
      promise = getMatchAnalysis(matchId);
      inflightAnalysis.set(matchId, promise);
      promise.finally(() => inflightAnalysis.delete(matchId));
    }
    const analysis = await promise;
    return NextResponse.json({
      analysis,
      budget: { remaining: getBudgetStatus().remaining },
    });
  } catch (error) {
    console.error(`Failed to fetch match ${matchId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch match analysis" },
      { status: 500 }
    );
  }
}
