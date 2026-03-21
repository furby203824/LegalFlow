import { addDays, parseISO } from "date-fns";
import type { CommanderGradeCategory, SmcrForfeitureInput, SmcrForfeitureResult } from "@/types";

// ============================================================================
// SMCR Forfeiture Calculator
// Per MCO 5800.16 Volume 14
// ============================================================================

export function calculateSmcrForfeiture(input: SmcrForfeitureInput): SmcrForfeitureResult {
  const sixtyDayEndDate = addDays(parseISO(input.njpDate), 60)
    .toISOString()
    .split("T")[0];

  let maxForfeiture: number;
  let formula: string;

  if (input.commanderGradeCategory === "COMPANY_GRADE") {
    // Company grade formula:
    // ([Drill Pay] x [Drills in 60 days] x 0.2333 + [AD Basic Pay]) /
    // (30 x [AD days in 60 days] / 2)
    const numerator =
      input.drillPay * input.drillsInSixtyDays * 0.2333 +
      input.activeDutyBasicPay;
    const denominator = (30 * input.activeDutyDaysInSixtyDays) / 2;
    maxForfeiture = denominator > 0 ? numerator / denominator : 0;
    formula = `(${input.drillPay} × ${input.drillsInSixtyDays} × 0.2333 + ${input.activeDutyBasicPay}) / (30 × ${input.activeDutyDaysInSixtyDays} / 2)`;
  } else {
    // Field grade and above formula:
    // ([Drill Pay] x [Drills in 60 days] x 0.5) +
    // ([AD Basic Pay] / 30 x [AD days in 60 days] / 2)
    const part1 = input.drillPay * input.drillsInSixtyDays * 0.5;
    const part2 = (input.activeDutyBasicPay / 30) * (input.activeDutyDaysInSixtyDays / 2);
    maxForfeiture = part1 + part2;
    formula = `(${input.drillPay} × ${input.drillsInSixtyDays} × 0.5) + (${input.activeDutyBasicPay} / 30 × ${input.activeDutyDaysInSixtyDays} / 2)`;
  }

  // Round down to nearest whole dollar
  maxForfeiture = Math.floor(maxForfeiture);

  return {
    maxForfeiture,
    formula,
    sixtyDayEndDate,
  };
}
