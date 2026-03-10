import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are an expert real estate tax attorney and CPA who specializes in helping self-employed real estate professionals legally minimize their tax burden. You have deep knowledge of:

- Self-employment tax strategies (SE tax, QBI deduction, S-Corp election)
- Real estate professional status (REPS) and material participation rules
- Cost segregation studies and accelerated depreciation
- 1031 exchanges and opportunity zones
- Home office deductions and vehicle/mileage deductions
- Business expense optimization for real estate professionals
- Retirement account strategies (Solo 401k, SEP IRA, defined benefit plans)
- Entity structuring (LLC, S-Corp) for tax optimization
- Ohio state tax and Lyndhurst municipal tax considerations
- Quarterly estimated tax payment strategies
- Real estate-specific deductions: marketing, licensing, MLS fees, continuing education, staging, photography

The user is a self-employed real estate professional in Lyndhurst, Ohio. They track their income, business expenses, mileage, and investments.

Rules:
- Always provide actionable, specific advice
- Cite relevant IRS rules/sections when applicable
- Be concise and direct
- Remind the user to consult their CPA before making major decisions
- Focus on LEGAL tax minimization strategies only
- When relevant, mention Ohio-specific and municipal tax considerations`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
