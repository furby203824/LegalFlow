// Abbreviated text for UPB Item 6
export function punishmentAbbreviated(p: {
  type: string;
  duration?: number;
  amount?: number;
  months?: number;
  reducedToGrade?: string;
}): string {
  switch (p.type) {
    case "CORRECTIONAL_CUSTODY":
      return `CC ${p.duration} days`;
    case "FORFEITURE":
      if (p.months && p.months > 1) {
        return `Forf $${p.amount}/mo for ${p.months} mos`;
      }
      return `Forf $${p.amount}`;
    case "REDUCTION":
      return `Red to ${p.reducedToGrade}`;
    case "EXTRA_DUTIES":
      return `ED ${p.duration} days`;
    case "RESTRICTION":
      return `Rest ${p.duration} days`;
    case "ARREST_IN_QUARTERS":
      return `AiQ ${p.duration} days`;
    case "DETENTION_OF_PAY":
      return `Det ${p.duration} days`;
    case "ADMONITION":
      return "Admonition";
    case "REPRIMAND":
      return "Reprimand";
    default:
      return p.type;
  }
}

// Full text for script announcement
export function punishmentFull(p: {
  type: string;
  duration?: number;
  amount?: number;
  months?: number;
  reducedToGrade?: string;
  reducedToRank?: string;
}): string {
  switch (p.type) {
    case "CORRECTIONAL_CUSTODY":
      return `Correctional custody for ${p.duration} days`;
    case "FORFEITURE":
      if (p.months && p.months > 1) {
        return `Forfeiture of $${p.amount} pay per month for ${p.months} months`;
      }
      return `Forfeiture of $${p.amount} pay`;
    case "REDUCTION":
      return `Reduction to ${p.reducedToRank || p.reducedToGrade}`;
    case "EXTRA_DUTIES":
      return `Extra duties for ${p.duration} days`;
    case "RESTRICTION":
      return `Restriction for ${p.duration} days`;
    case "ARREST_IN_QUARTERS":
      return `Arrest in quarters for ${p.duration} days`;
    case "DETENTION_OF_PAY":
      return `Detention of pay for ${p.duration} days`;
    case "ADMONITION":
      return "Oral admonition";
    case "REPRIMAND":
      return "Written reprimand";
    default:
      return p.type;
  }
}

// Max punishment text by grade for charge sheet
export function maxPunishmentByGrade(commanderGradeLevel: string): string[] {
  if (commanderGradeLevel === "FIELD_GRADE_AND_ABOVE") {
    return [
      "Correctional custody: up to 30 days",
      "Forfeiture: up to 1/2 of 1 month's pay for 2 months",
      "Reduction: to lowest or any intermediate pay grade (E1-E4 only)",
      "Extra duties: up to 45 days",
      "Restriction: up to 60 days",
      "Arrest in quarters: up to 30 days",
      "Admonition or reprimand",
    ];
  }
  return [
    "Correctional custody: up to 7 days",
    "Forfeiture: up to 7 days' pay",
    "Reduction: one pay grade (E4 and below only)",
    "Extra duties: up to 14 days",
    "Restriction: up to 14 days",
    "Admonition or reprimand",
  ];
}
