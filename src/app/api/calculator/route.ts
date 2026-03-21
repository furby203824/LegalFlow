import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculateSmcrForfeiture } from "@/lib/calculator";
import type { CommanderGradeCategory } from "@/types";

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
      commanderGradeCategory,
    } = body;

    if (
      drillPay === undefined ||
      drillsInSixtyDays === undefined ||
      activeDutyBasicPay === undefined ||
      activeDutyDaysInSixtyDays === undefined ||
      !njpDate ||
      !commanderGradeCategory
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
      commanderGradeCategory: commanderGradeCategory as CommanderGradeCategory,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
