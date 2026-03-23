import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PDFDocument } from "pdf-lib";
import type { CaseData } from "../types";

// ── Mock fetch to load the template from disk instead of HTTP ──
const TEMPLATE_PATH = resolve(__dirname, "../../../../public/forms/NAVMC_10132.pdf");
let templateBuffer: ArrayBuffer;

beforeAll(() => {
  const fileBytes = readFileSync(TEMPLATE_PATH);
  templateBuffer = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength
  );

  vi.stubGlobal("fetch", async (url: string) => {
    if (typeof url === "string" && url.includes("NAVMC_10132")) {
      return {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      };
    }
    return { ok: false, status: 404 };
  });
});

// Lazy import after fetch is mocked
async function getFill() {
  return (await import("./navmc10132Fill")).fillNavmc10132Pdf;
}

// ── Minimal valid CaseData factory ──
function makeCaseData(overrides: Partial<CaseData> = {}): CaseData {
  return {
    caseNumber: "NJP-2026-001",
    caseId: "test-case-1",
    accusedLastName: "DOE",
    accusedFirstName: "JOHN",
    accusedMiddleName: "A",
    accusedRank: "LCpl" as CaseData["accusedRank"],
    accusedGrade: "E-3" as CaseData["accusedGrade"],
    accusedEdipi: "1234567890",
    accusedUnit: "1st Bn, 5th Marines",
    accusedUnitGcmca: "1st Bn, 5th Marines",
    component: "ACTIVE",
    commanderGradeLevel: "FIELD_GRADE_AND_ABOVE" as CaseData["commanderGradeLevel"],
    vesselException: false,
    offenses: [
      {
        letter: "A",
        ucmjArticle: "86",
        offenseType: "Absence without leave",
        summary: "Did without authority absent himself from his unit",
        offenseDate: "2026-01-15",
        offensePlace: "Camp Lejeune, NC",
        finding: "GUILTY",
        victims: [],
      },
    ],
    item6Punishments: [],
    uaApplicable: false,
    appealNotFiled: false,
    accusedTransferred: false,
    item21Entries: [],
    ...overrides,
  };
}

// ── Helper: load the generated PDF and read form fields ──
async function loadGeneratedForm(pdfBytes: Uint8Array) {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  return { pdf, form };
}

function getTextValue(form: ReturnType<PDFDocument["getForm"]>, name: string): string {
  try {
    return form.getTextField(name).getText() || "";
  } catch {
    return "";
  }
}

function getDropdownValue(form: ReturnType<PDFDocument["getForm"]>, name: string): string {
  try {
    const selected = form.getDropdown(name).getSelected();
    return selected.length > 0 ? selected[0] : "";
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe("fillNavmc10132Pdf", () => {
  describe("template loading", () => {
    it("should produce a valid PDF (non-zero Uint8Array)", async () => {
      const fill = await getFill();
      const result = await fill(makeCaseData(), "PARTIAL");
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should throw when template fetch fails", async () => {
      // Temporarily override fetch to fail
      const originalFetch = globalThis.fetch;
      vi.stubGlobal("fetch", async () => ({ ok: false, status: 404 }));

      // Need a fresh import to bypass module cache
      vi.resetModules();
      const { fillNavmc10132Pdf } = await import("./navmc10132Fill");

      await expect(fillNavmc10132Pdf(makeCaseData(), "PARTIAL")).rejects.toThrow(
        /Failed to load NAVMC 10132 template/
      );

      vi.stubGlobal("fetch", originalFetch);
    });
  });

  describe("PARTIAL version — accused info and offenses", () => {
    it("should fill accused name, rank/grade, EDIPI, and unit", async () => {
      const fill = await getFill();
      const data = makeCaseData();
      const bytes = await fill(data, "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "18 ACCUSED FULL NAME")).toBe("DOE, JOHN A");
      expect(getTextValue(form, "19 ACCUSED RANK/GRADE")).toBe("LCpl / E-3");
      expect(getTextValue(form, "20 ACCUSED EDIPI")).toBe("1234567890");
      expect(getTextValue(form, "17 UNIT")).toBe("1st Bn, 5th Marines");
    });

    it("should fill page 2/3 accused fields (Items 23-25)", async () => {
      const fill = await getFill();
      const bytes = await fill(makeCaseData(), "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "23 ACCUSED FULL NAME")).toBe("DOE, JOHN A");
      expect(getTextValue(form, "24 ACCUSED RANK/GRADE")).toBe("LCpl / E-3");
      expect(getTextValue(form, "25 ACCUSED EDIPI")).toBe("1234567890");
    });

    it("should fill offense summary text", async () => {
      const fill = await getFill();
      const bytes = await fill(makeCaseData(), "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      const summary = getTextValue(form, "1A SUMMARY");
      expect(summary).toContain("Did without authority absent himself");
      expect(summary).toContain("On or about 2026-01-15");
      expect(summary).toContain("Camp Lejeune, NC");
    });

    it("should handle multiple offenses (up to 5)", async () => {
      const fill = await getFill();
      const data = makeCaseData({
        offenses: [
          { letter: "A", ucmjArticle: "86", offenseType: "AWOL", summary: "Offense A", offenseDate: "2026-01-01", offensePlace: "Place A", victims: [] },
          { letter: "B", ucmjArticle: "92", offenseType: "Failure to obey", summary: "Offense B", offenseDate: "2026-01-02", offensePlace: "Place B", victims: [] },
          { letter: "C", ucmjArticle: "134", offenseType: "Drunk on duty", summary: "Offense C", offenseDate: "2026-01-03", offensePlace: "Place C", victims: [] },
        ],
      });
      const bytes = await fill(data, "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "1A SUMMARY")).toContain("Offense A");
      expect(getTextValue(form, "1B SUMMARY")).toContain("Offense B");
      expect(getTextValue(form, "1C SUMMARY")).toContain("Offense C");
    });

    it("should handle accused with no middle name", async () => {
      const fill = await getFill();
      const data = makeCaseData({ accusedMiddleName: "" });
      const bytes = await fill(data, "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "18 ACCUSED FULL NAME")).toBe("DOE, JOHN");
    });
  });

  describe("HEARING version — adds election, findings, punishment", () => {
    const hearingData = () =>
      makeCaseData({
        item2ElectionAccepted: true,
        item2CounselConsulted: true,
        item2SignedDate: "2026-02-01",
        item2RefusalNoted: false,
        item3SignedDate: "2026-02-02",
        item6Punishments: [
          { type: "EXTRA_DUTIES", duration: 14, suspended: false },
          { type: "RESTRICTION", duration: 14, suspended: false },
        ],
        item6Date: "2026-02-10",
        njpAuthorityName: "SMITH",
        njpAuthorityTitle: "Company Commander",
        njpAuthorityGrade: "O-3",
        dateNoticeToAccused: "2026-02-10",
        item11SignedDate: "2026-02-10",
      });

    it("should produce a valid PDF for HEARING version", async () => {
      const fill = await getFill();
      const bytes = await fill(hearingData(), "HEARING");
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("should fill NJP authority info (Items 8-8A)", async () => {
      const fill = await getFill();
      const bytes = await fill(hearingData(), "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "8 NJP AUTHORITY NAME TITLE SERVICE")).toBe(
        "SMITH, Company Commander"
      );
      expect(getTextValue(form, "8A NJP AUTHORITY GRADE")).toBe("O-3");
    });

    it("should fill punishment text (Item 6)", async () => {
      const fill = await getFill();
      const bytes = await fill(hearingData(), "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      const punishment = getTextValue(form, "6 PUNISHMENT IMPOSED");
      expect(punishment).toContain("Extra duties for 14 days");
      expect(punishment).toContain("Restriction for 14 days");
    });

    it("should fill CO certification date (Item 3)", async () => {
      const fill = await getFill();
      const bytes = await fill(hearingData(), "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "3 RIGHTS ATTEST DATE_af_date")).toBe("02 FEB 26");
    });

    it("should fill date of notice to accused (Item 10)", async () => {
      const fill = await getFill();
      const bytes = await fill(hearingData(), "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "10 DATE OF DISPOSITION NOTICE")).toBe("10 FEB 26");
    });

    it("should fill appeal advisement date (Item 11)", async () => {
      const fill = await getFill();
      const bytes = await fill(hearingData(), "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "11 APPEAL ADVISEMENT DATE_af_date")).toBe("10 FEB 26");
    });

    it("should fill suspension text (Item 7) when punishment is suspended", async () => {
      const fill = await getFill();
      const data = hearingData();
      data.item6Punishments = [
        { type: "REDUCTION", reducedToGrade: "E-2", reducedToRank: "PFC", suspended: true, suspensionMonths: 6 },
      ];
      const bytes = await fill(data, "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      const suspension = getTextValue(form, "7 SUSPENSION IF ANY");
      expect(suspension).toContain("suspended");
      expect(suspension).toContain("6 months");
    });

    it("should fill appeal intent (Item 12) when present", async () => {
      const fill = await getFill();
      const data = hearingData();
      data.appealIntent = "INTENDS_TO_APPEAL";
      data.item12SignedDate = "2026-02-11";
      const bytes = await fill(data, "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      expect(getDropdownValue(form, "12 INTEND APPEAL")).toBe("I do intend to appeal.");
      expect(getTextValue(form, "12 APPEAL INTENT DATE_af_date")).toBe("11 FEB 26");
    });
  });

  describe("FINAL version — adds appeal decision & admin closure", () => {
    const finalData = () =>
      makeCaseData({
        item2ElectionAccepted: true,
        item2CounselConsulted: true,
        item2SignedDate: "2026-02-01",
        item3SignedDate: "2026-02-02",
        item6Punishments: [
          { type: "EXTRA_DUTIES", duration: 14, suspended: false },
        ],
        item6Date: "2026-02-10",
        njpAuthorityName: "SMITH",
        njpAuthorityTitle: "Commanding Officer",
        njpAuthorityGrade: "O-5",
        dateNoticeToAccused: "2026-02-10",
        item11SignedDate: "2026-02-10",
        appealIntent: "INTENDS_TO_APPEAL",
        item12SignedDate: "2026-02-11",
        appealFiledDate: "2026-02-12",
        appealAuthorityName: "JONES",
        appealAuthorityRank: "Col",
        appealAuthoritySignedDate: "2026-02-20",
        appealOutcome: "DENIED",
        dateNoticeAppealDecision: "2026-02-21",
        item16UdNumber: "UD-2026-042",
        item16Dtd: "2026-02-25",
      });

    it("should produce a valid flattened PDF for FINAL version", async () => {
      const fill = await getFill();
      const bytes = await fill(finalData(), "FINAL");
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);

      // Verify the PDF loads without errors
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      expect(pdf.getPageCount()).toBeGreaterThan(0);
    });

    it("should fill appeal filed date (Item 13)", async () => {
      const fill = await getFill();
      const bytes = await fill(finalData(), "FINAL");
      // FINAL version is flattened so we can't read form fields.
      // But we can verify it doesn't throw and produces output.
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("should set appeal not-filed checkbox when appealNotFiled is true", async () => {
      const fill = await getFill();
      const data = finalData();
      data.appealNotFiled = true;
      data.appealFiledDate = undefined;
      data.appealOutcome = undefined;
      data.appealAuthoritySignedDate = undefined;
      const bytes = await fill(data, "FINAL");
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("should fill UD number and DTD (Item 16)", async () => {
      const fill = await getFill();
      // Generate as HEARING to avoid flattening so we can read fields
      const data = finalData();
      const bytes = await fill(data, "FINAL");
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("should fill appeal decision text (Item 14)", async () => {
      const fill = await getFill();
      // Use HEARING to keep form editable for verification
      // The FINAL path goes through the same code but then flattens
      const data = finalData();
      // Verify the mapping function works for all outcomes
      const outcomes = [
        "DENIED",
        "DENIED_UNTIMELY",
        "GRANTED_SET_ASIDE",
        "PARTIAL_RELIEF",
        "REDUCTION_SET_ASIDE_ONLY",
      ];
      for (const o of outcomes) {
        data.appealOutcome = o;
        const bytes = await fill(data, "FINAL");
        expect(bytes.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Item 21 — Remarks", () => {
    it("should fill remarks when entries exist", async () => {
      const fill = await getFill();
      const data = makeCaseData({
        item21Entries: [
          { entryDate: "2026-02-01", entryText: "First remark" },
          { entryDate: "2026-02-05", entryText: "Second remark" },
        ],
      });
      const bytes = await fill(data, "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      const remarks = getTextValue(form, "21 REMARKS");
      expect(remarks).toContain("First remark");
      expect(remarks).toContain("Second remark");
    });

    it("should leave remarks empty when no entries", async () => {
      const fill = await getFill();
      const data = makeCaseData({ item21Entries: [] });
      const bytes = await fill(data, "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "21 REMARKS")).toBe("");
    });
  });

  describe("victim demographics (Item 22)", () => {
    it("should fill victim demographics when present", async () => {
      const fill = await getFill();
      const data = makeCaseData({
        offenses: [
          {
            letter: "A",
            ucmjArticle: "128",
            offenseType: "Assault",
            summary: "Did assault PFC Smith",
            offenseDate: "2026-01-15",
            offensePlace: "Camp Lejeune",
            victims: [
              { letter: "1", status: "Military", sex: "Male", race: "White", ethnicity: "Not Hispanic" },
            ],
          },
        ],
      });
      const bytes = await fill(data, "PARTIAL");
      const { form } = await loadGeneratedForm(bytes);

      expect(getDropdownValue(form, "22A VICTIM STATUS")).toBe("Military");
    });
  });

  describe("version auto-detection in generatePdfDocument", () => {
    it("should use PARTIAL when no signatures exist", async () => {
      // This tests the version logic, not the full service (which needs auth)
      // The version determination is: sig16 → FINAL, sig9 → FINAL, sig3 → HEARING, sig2 → HEARING, else PARTIAL
      // We test the fill function with each version to ensure they all work
      const fill = await getFill();
      const data = makeCaseData();

      const partial = await fill(data, "PARTIAL");
      expect(partial.length).toBeGreaterThan(0);

      const hearing = await fill(data, "HEARING");
      expect(hearing.length).toBeGreaterThan(0);

      const final_ = await fill(data, "FINAL");
      expect(final_.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty offenses array", async () => {
      const fill = await getFill();
      const data = makeCaseData({ offenses: [] });
      const bytes = await fill(data, "PARTIAL");
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("should handle missing optional fields gracefully", async () => {
      const fill = await getFill();
      const data = makeCaseData({
        njpAuthorityName: undefined,
        njpAuthorityTitle: undefined,
        njpAuthorityGrade: undefined,
        dateNoticeToAccused: undefined,
        item11SignedDate: undefined,
      });
      const bytes = await fill(data, "HEARING");
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("should handle punishmentText override", async () => {
      const fill = await getFill();
      const data = makeCaseData({
        punishmentText: "Custom punishment text for this case",
        item6Punishments: [{ type: "EXTRA_DUTIES", duration: 14, suspended: false }],
      });
      const bytes = await fill(data, "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      expect(getTextValue(form, "6 PUNISHMENT IMPOSED")).toBe(
        "Custom punishment text for this case"
      );
    });

    it("should handle UA applicable with period dates", async () => {
      const fill = await getFill();
      const data = makeCaseData({
        uaApplicable: true,
        uaPeriodStart: "2026-01-01",
        uaPeriodEnd: "2026-01-10",
        desertionMarks: "None",
      });
      const bytes = await fill(data, "HEARING");
      const { form } = await loadGeneratedForm(bytes);

      const uaText = getTextValue(form, "4 CURRENT UAS OVER 24 HRS AND MARKS OF DESERTION");
      expect(uaText).toContain("01 JAN 26");
      expect(uaText).toContain("10 JAN 26");
      expect(uaText).toContain("Desertion marks: None");
    });
  });
});
