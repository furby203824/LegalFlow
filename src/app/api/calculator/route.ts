import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculateSmcrForfeiture } from "@/lib/calculator";
import type { CommanderGradeLevel } from "@/types";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      drillPay,
      drillsInSixtyDays,
      activeDutyBasicPay,
      activeDutyDaysInSixtyDays,
      njpDate,
      commanderGradeLevel,
    } = body;

    if (
      drillPay === undefined ||
      drillsInSixtyDays === undefined ||
      activeDutyBasicPay === undefined ||
      activeDutyDaysInSixtyDays === undefined ||
      !njpDate ||
      !commanderGradeLevel
    ) {
      return NextResponse.json(
        { error: "All calculator fields are required" },
        { status: 400 }
      );
    }

    const result = calculateSmcrForfeiture({
      drillPay,
      drillsInSixtyDays,
      activeDutyBasicPay,
      activeDutyDaysInSixtyDays,
      njpDate,
      commanderGradeLevel: commanderGradeLevel as CommanderGradeLevel,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
