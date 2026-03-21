import { format, parseISO } from "date-fns";

// ============================================================================
// Item 21 Remark Templates
// Auto-generated per NAVMC 10132 instructions
// ============================================================================

function fmtDate(date: string): string {
  return format(parseISO(date), "yyyy-MM-dd");
}

export function remarkAdditionalOffense(
  date: string,
  article: string,
  offenseType: string,
  summary: string,
  finding: string
): string {
  return `${fmtDate(date)} ITEM 1: ${article} ${offenseType}. ${summary}. ${finding}.`;
}

export function remarkForwardingRecommendation(
  date: string,
  authority: string,
  recommendation: string
): string {
  return `${fmtDate(date)} ITEM 2: Fwd to ${authority} recom ${recommendation}.`;
}

export function remarkVacationOfSuspension(
  date: string,
  punishment: string,
  njpDate: string
): string {
  return `${fmtDate(date)} ITEM 7: ${punishment} susp on ${fmtDate(njpDate)} vacated.`;
}

export function remarkFiveDayRestrictionStay(
  date: string,
  appealDate: string
): string {
  return `${fmtDate(date)} ITEM 13: Appeal submitted ${fmtDate(appealDate)}, five days elapsed with no action. Punishment of restriction stayed.`;
}

export function remarkFiveDayExtraDutiesStay(
  date: string,
  appealDate: string
): string {
  return `${fmtDate(date)} ITEM 13: Appeal submitted ${fmtDate(appealDate)}, five days elapsed with no action. Punishment of extra duties stayed.`;
}

export function remarkAppealDenied(date: string, reason: string): string {
  return `${fmtDate(date)} ITEM 14: Appeal denied, ${reason}.`;
}

export function remarkAppealGranted(date: string, relief: string): string {
  return `${fmtDate(date)} ITEM 14: Appeal granted, ${relief}.`;
}

export function remarkPunishmentSetAside(date: string, punishment: string): string {
  return `${fmtDate(date)} ITEM 14: ${punishment} is set aside. All rights, privileges, and property affected will be restored.`;
}

export function remarkAdditionalVictim(
  date: string,
  letter: string,
  status: string,
  sex: string,
  race: string,
  ethnicity: string
): string {
  return `${fmtDate(date)} ITEM 22: Additional Victims: ${letter}. ${status} / ${sex} / ${race} / ${ethnicity}`;
}
