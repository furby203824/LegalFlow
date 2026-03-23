import { describe, it, expect } from "vitest";
import { buildPunishmentList } from "./documents";

/**
 * Tests that buildPunishmentList correctly maps the punishment record fields
 * produced by SubmitPunishmentFromGuide (hearing guide flow) into the
 * item6Punishments array used by the NAVMC 10132 PDF generator.
 *
 * This is the root cause fix for Items 6/7 being empty in the PDF —
 * previously SubmitPunishmentFromGuide saved fields like `forfeiture: true`
 * and `forfeitureDetail: "500"` instead of `forfeitureAmount: 500`.
 */
describe("buildPunishmentList", () => {
  it("should map forfeiture fields from hearing guide format", () => {
    const pr = {
      punishmentDate: "2026-03-23",
      forfeitureAmount: 500,
      forfeitureMonths: 2,
    };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: "FORFEITURE",
      amount: 500,
      months: 2,
      suspended: false,
    });
  });

  it("should map extra duties days", () => {
    const pr = { extraDutiesDays: 14 };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: "EXTRA_DUTIES",
      duration: 14,
      suspended: false,
    });
  });

  it("should map restriction days", () => {
    const pr = { restrictionDays: 30 };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: "RESTRICTION",
      duration: 30,
      suspended: false,
    });
  });

  it("should map correctional custody days", () => {
    const pr = { corrCustodyDays: 7 };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: "CORRECTIONAL_CUSTODY",
      duration: 7,
      suspended: false,
    });
  });

  it("should map reduction with grade info", () => {
    const pr = {
      reductionImposed: true,
      reductionToGrade: "E3",
      reductionFromGrade: "E4",
    };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: "REDUCTION",
      reducedToGrade: "E3",
      reducedFromGrade: "E4",
      suspended: false,
    });
  });

  it("should map reprimand from reprimandType field", () => {
    const pr = { reprimandType: "Written" };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: "REPRIMAND", suspended: false });
  });

  it("should map admonition from admonitionType field", () => {
    const pr = { admonitionType: "Oral" };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: "ADMONITION", suspended: false });
  });

  it("should map reprimand from admonitionReprimand='reprimand'", () => {
    const pr = { admonitionReprimand: "reprimand" };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: "REPRIMAND" });
  });

  it("should map admonition from admonitionReprimand='admonition'", () => {
    const pr = { admonitionReprimand: "admonition" };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: "ADMONITION" });
  });

  it("should handle multiple punishments together", () => {
    const pr = {
      forfeitureAmount: 300,
      extraDutiesDays: 14,
      restrictionDays: 14,
      reprimandType: "Written",
    };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(4);
    const types = list.map((p) => p.type);
    expect(types).toContain("FORFEITURE");
    expect(types).toContain("EXTRA_DUTIES");
    expect(types).toContain("RESTRICTION");
    expect(types).toContain("REPRIMAND");
  });

  it("should mark suspended punishments using abbreviated keys", () => {
    // This is how SubmitPunishmentFromGuide formats suspension data
    const pr = {
      forfeitureAmount: 500,
      extraDutiesDays: 14,
      restrictionDays: 14,
      suspensionImposed: true,
      suspensionPunishment: "forfeiture, extra",
      suspensionMonths: 6,
    };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(3);

    const forfeiture = list.find((p) => p.type === "FORFEITURE")!;
    expect(forfeiture.suspended).toBe(true);
    expect(forfeiture.suspensionMonths).toBe(6);

    const extra = list.find((p) => p.type === "EXTRA_DUTIES")!;
    expect(extra.suspended).toBe(true);

    const restriction = list.find((p) => p.type === "RESTRICTION")!;
    expect(restriction.suspended).toBe(false);
  });

  it("should return empty list when no punishment fields present", () => {
    const pr = { punishmentDate: "2026-03-23" };
    const list = buildPunishmentList(pr);
    expect(list).toHaveLength(0);
  });

  it("should NOT produce entries from old wrong field names", () => {
    // These were the OLD field names that SubmitPunishmentFromGuide used to produce
    const pr = {
      forfeiture: true,
      forfeitureDetail: "500",
      extraDuties: true,
      extraDutiesDetail: "14",
      restriction: true,
      restrictionDetail: "14",
      reprimand: true,
      admonition: true,
    };
    const list = buildPunishmentList(pr);
    // None of these should produce entries — they're the wrong format
    expect(list).toHaveLength(0);
  });
});
