// API Route: POST /api/research — triggers the LangGraph agent
import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/agent/graph";

export const maxDuration = 60; // Allow up to 60s for the agent pipeline

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName } = body;

    if (!companyName || typeof companyName !== "string" || companyName.trim().length === 0) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY && !process.env.DEEPSEEK_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "No LLM API keys configured. Please add GROQ_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    const result = await runResearch(companyName.trim());

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Research API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
