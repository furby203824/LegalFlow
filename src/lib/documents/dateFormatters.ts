import { format, parseISO } from "date-fns";

// SHORT: "3 Mar 26" -- compact dates
export function fmtShort(date: string): string {
  try {
    return format(parseISO(date), "d MMM yy");
  } catch {
    return date;
  }
}

// STANDARD: "23 Mar 26" -- all form date fields
export function fmtStandard(date: string): string {
  try {
    return format(parseISO(date), "d MMM yy");
  } catch {
    return date;
  }
}

// Alias for fmtStandard — kept for explicit use in Items 6/7
export const fmtTitleCase = fmtStandard;

// ISO: "YYYY-MM-DD" -- Item 21 entries
export function fmtISO(date: string): string {
  try {
    return format(parseISO(date), "yyyy-MM-dd");
  } catch {
    return date;
  }
}

// FULL: "DD Mmm YYYY" -- letters and headers
export function fmtFull(date: string): string {
  try {
    return format(parseISO(date), "dd MMM yyyy").toUpperCase();
  } catch {
    return date;
  }
}
