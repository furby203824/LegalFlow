import { format, parseISO } from "date-fns";

// SHORT: "D Mmm YY" -- Items 6, 7 in UPB
export function fmtShort(date: string): string {
  try {
    const d = parseISO(date);
    return `${d.getDate()} ${format(d, "MMM yy")}`.toUpperCase();
  } catch {
    return date;
  }
}

// STANDARD: "DD Mmm YY" -- form date fields
export function fmtStandard(date: string): string {
  try {
    return format(parseISO(date), "dd MMM yy").toUpperCase();
  } catch {
    return date;
  }
}

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
