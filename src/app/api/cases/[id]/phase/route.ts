import { NextRequest, NextResponse } from "next/server";
import { casesStore, auditStore } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  vrR2005,
  vrR3013,
  vrR4001,
  vrR5002,
  vrR5005,
  vrR7001,
  vrCv001,
  validatePunishment,
  vrR3010,
  vrR5001,
  getLockedItems,
  calculateSuspensionEndDate,
  applyAbbreviations,
} from "@/lib/validation";
import type { Grade, CommanderGradeLevel } from "@/types";

// POST /api/cases/[id]/phase - Advance case through phases
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { action, data } = body;

    const njpCaseOrNull = casesStore.findById(id);
    if (!njpCaseOrNull) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    const njpCase = njpCaseOrNull;

    if (njpCase.formLocked) {
      return NextResponse.json({ error: "Case form is locked" }, { status: 400 });
    }

    // Helper to get signed item numbers
    const signedItems = (njpCase.signatures || []).map((s: { itemNumber: string }) => s.itemNumber);

    // Helper to create audit log
    function audit(actionType: string, notes?: string, field?: string, oldVal?: string, newVal?: string) {
      auditStore.append({
        caseId: id,
        caseNumber: njpCase.caseNumber,
        userId: user.userId,
        userRole: user.role,
        userName: user.username,
        action: actionType,
        field,
        oldValue: oldVal,
        newValue: newVal,
        notes,
      });
    }

    // Helper to create signature
    function createSignature(itemNumber: string, signerName: string, opts?: {
      refusalNoted?: boolean;
      coSignedInstead?: boolean;
      method?: string;
    }) {
      const itemsLocked = getLockedItems([...signedItems, itemNumber]);
      casesStore.addSignature(id, {
        itemNumber,
        signerRole: user.role,
        signerUserId: user.userId,
        signerName,
        signedDate: new Date().toISOString().split("T")[0],
        signatureMethod: opts?.method || "ELECTRONIC",
        refusalNoted: opts?.refusalNoted || false,
        coSignedInstead: opts?.coSignedInstead || false,
        itemsLocked: JSON.stringify(itemsLocked),
      });
    }

    switch (action) {
      // ============================================================
      // Phase 2 - Rights Advisement
      // ============================================================
      case "SIGN_ITEM_2": {
        const { acceptsNjp, counselProvided, refusedToSign, signerName } = data;

        // If demands court-martial and no vessel exception
        if ((!acceptsNjp || refusedToSign) && !njpCase.vesselException) {
          createSignature("2", signerName || user.username, {
            refusalNoted: refusedToSign,
            coSignedInstead: refusedToSign,
          });

          casesStore.update(id, {
            status: "REFERRED_COURT_MARTIAL",
            currentPhase: "RIGHTS_ADVISEMENT",
          });

          audit("SIGN", "Item 2 signed - court-martial demanded or refused");
          return NextResponse.json({
            message: "Case referred to court-martial jurisdiction",
            status: "REFERRED_COURT_MARTIAL",
          });
        }

        createSignature("2", signerName || user.username);

        casesStore.update(id, { currentPhase: "RIGHTS_ADVISEMENT" });

        // Lock offenses and victims
        const updatedCase = casesStore.findById(id)!;
        const lockedOffenses = (updatedCase.offenses || []).map((o: Record<string, unknown>) => ({ ...o, locked: true }));
        const lockedVictims = (updatedCase.victims || []).map((v: Record<string, unknown>) => ({ ...v, locked: true }));
        casesStore.update(id, { offenses: lockedOffenses, victims: lockedVictims });

        audit("SIGN", "Item 2 signed - NJP accepted");
        return NextResponse.json({ message: "Item 2 signed successfully" });
      }

      case "SIGN_ITEM_3": {
        if (!signedItems.includes("2")) {
          return NextResponse.json({ error: "Item 2 must be signed first" }, { status: 400 });
        }

        const { signerName } = data;
        createSignature("3", signerName || user.username);

        casesStore.update(id, {
          status: "RIGHTS_ADVISED",
          currentPhase: "RIGHTS_ADVISEMENT",
        });

        audit("SIGN", "Item 3 signed - rights advisement complete");
        return NextResponse.json({ message: "Item 3 signed. Rights advisement complete." });
      }

      // ============================================================
      // Phase 3 - Hearing
      // ============================================================
      case "ENTER_FINDINGS": {
        if (njpCase.status !== "RIGHTS_ADVISED") {
          return NextResponse.json({ error: "Rights advisement must be completed first" }, { status: 400 });
        }

        const { findings } = data;
        const updatedOffenses = [...(njpCase.offenses || [])];
        for (const f of findings) {
          const oIdx = updatedOffenses.findIndex((o: { id: string }) => o.id === f.offenseId);
          if (oIdx >= 0) {
            updatedOffenses[oIdx] = { ...updatedOffenses[oIdx], finding: f.finding };
          }
        }
        casesStore.update(id, { offenses: updatedOffenses, currentPhase: "HEARING" });

        audit("UPDATE", "Findings entered");
        return NextResponse.json({ message: "Findings entered" });
      }

      case "ENTER_PUNISHMENT": {
        if (njpCase.currentPhase !== "HEARING") {
          return NextResponse.json({ error: "Must be in hearing phase" }, { status: 400 });
        }

        const { punishment, noPunishment } = data;

        // No punishment - destroy case
        if (noPunishment) {
          casesStore.update(id, { status: "DESTROYED", njpDate: punishment?.punishmentDate });
          audit("UPDATE", "Case destroyed - no punishment imposed");
          return NextResponse.json({ message: "Case destroyed - no punishment imposed" });
        }

        // Validate Item 3 date
        const item3Sig = (njpCase.signatures || []).find((s: { itemNumber: string }) => s.itemNumber === "3");
        const item3Date = item3Sig?.signedDate;
        const item3Error = vrR2005(item3Date || undefined, punishment.punishmentDate);
        if (item3Error) {
          return NextResponse.json({ error: item3Error.message }, { status: 400 });
        }

        // Validate punishment limits
        const pErrors = validatePunishment(
          punishment,
          njpCase.commanderGradeLevel as CommanderGradeLevel,
          njpCase.accusedGrade as Grade
        );
        if (pErrors.length > 0) {
          return NextResponse.json({ errors: pErrors.map((e: { message: string }) => e.message) }, { status: 400 });
        }

        // Check JA review thresholds
        const jaThresholds = vrR3010(
          punishment,
          njpCase.accusedGrade as Grade
        );

        // Build punishment text
        const parts: string[] = [];
        if (punishment.corrCustodyDays) parts.push(`Correctional custody for ${punishment.corrCustodyDays} days`);
        if (punishment.forfeitureAmount) {
          const months = punishment.forfeitureMonths || 1;
          parts.push(`Forfeiture of $${punishment.forfeitureAmount}/mo for ${months} month(s)`);
        }
        if (punishment.reductionImposed) parts.push(`Reduction to ${punishment.reductionToGrade}`);
        if (punishment.extraDutiesDays) parts.push(`Extra duties for ${punishment.extraDutiesDays} days`);
        if (punishment.restrictionDays) parts.push(`Restriction for ${punishment.restrictionDays} days`);
        if (punishment.arrestQuartersDays) parts.push(`Arrest in quarters for ${punishment.arrestQuartersDays} days`);
        if (punishment.detentionDays) parts.push(`Detention of pay for ${punishment.detentionDays} days`);
        if (punishment.admonitionReprimand) parts.push(punishment.admonitionType || "Admonition/Reprimand");
        const punishmentText = applyAbbreviations(parts.join("; ") + `. ${punishment.punishmentDate}.`);

        // Suspension
        let suspensionText = "NONE";
        let suspensionEndDate: string | null = null;
        if (punishment.suspensionImposed && punishment.suspensionMonths) {
          suspensionEndDate = calculateSuspensionEndDate(
            punishment.punishmentDate,
            punishment.suspensionMonths
          );
          suspensionText = `${punishment.suspensionPunishment} suspended for ${punishment.suspensionMonths} months.`;
        }

        // Upsert punishment
        casesStore.upsertPunishment(id, {
          corrCustodyDays: punishment.corrCustodyDays || null,
          forfeitureAmount: punishment.forfeitureAmount || null,
          forfeitureMonths: punishment.forfeitureMonths || null,
          forfeitureTotal: punishment.forfeitureAmount && punishment.forfeitureMonths
            ? punishment.forfeitureAmount * punishment.forfeitureMonths : null,
          smcrDrillPay: punishment.smcrDrillPay || null,
          smcrDrills60Days: punishment.smcrDrills60Days || null,
          smcrAdBasicPay: punishment.smcrAdBasicPay || null,
          smcrAdDays60: punishment.smcrAdDays60 || null,
          smcr60DayStart: punishment.smcr60DayStart || null,
          smcrMaxForfeiture: punishment.smcrMaxForfeiture || null,
          reductionImposed: punishment.reductionImposed || false,
          reductionFromRank: punishment.reductionImposed ? njpCase.accusedRank : null,
          reductionFromGrade: punishment.reductionImposed ? njpCase.accusedGrade : null,
          reductionToRank: punishment.reductionToRank || null,
          reductionToGrade: punishment.reductionToGrade || null,
          reductionSuspendedOnly: punishment.reductionSuspendedOnly || false,
          extraDutiesDays: punishment.extraDutiesDays || null,
          restrictionDays: punishment.restrictionDays || null,
          restrictionLocation: punishment.restrictionLocation || null,
          restrictionWithSuspDuty: punishment.restrictionWithSuspDuty || false,
          arrestQuartersDays: punishment.arrestQuartersDays || null,
          detentionDays: punishment.detentionDays || null,
          detentionAmount: punishment.detentionAmount || null,
          admonitionReprimand: punishment.admonitionReprimand || false,
          admonitionType: punishment.admonitionType || null,
          punishmentText,
          punishmentDate: punishment.punishmentDate,
          suspensionImposed: punishment.suspensionImposed || false,
          suspensionPunishment: punishment.suspensionPunishment || null,
          suspensionMonths: punishment.suspensionMonths || null,
          suspensionStartDate: punishment.suspensionImposed ? punishment.punishmentDate : null,
          suspensionEndDate,
          suspensionRemissionTerms: punishment.suspensionImposed
            ? "unless sooner vacated, will be remitted without further action."
            : null,
          suspensionText,
          suspensionStatus: punishment.suspensionImposed ? "ACTIVE" : "NONE",
          jaThresholdArrestQuarters: jaThresholds.thresholds.arrestQuarters,
          jaThresholdCorrCustody: jaThresholds.thresholds.corrCustody,
          jaThresholdForfeiture: jaThresholds.thresholds.forfeiture,
          jaThresholdReduction: jaThresholds.thresholds.reduction,
          jaThresholdExtraDuties: jaThresholds.thresholds.extraDuties,
          jaThresholdRestriction: jaThresholds.thresholds.restriction,
          jaThresholdDetention: jaThresholds.thresholds.detention,
          anyJaThresholdMet: jaThresholds.anyMet,
          locked: false,
        });

        // Update case
        casesStore.update(id, {
          njpDate: punishment.punishmentDate,
          jaReviewRequired: jaThresholds.anyMet,
        });

        audit("UPDATE", "Punishment entered", "punishment", undefined, punishmentText);
        return NextResponse.json({
          message: "Punishment entered",
          jaReviewRequired: jaThresholds.anyMet,
        });
      }

      case "SIGN_ITEM_9": {
        // VR-R3-013: Item 9 prerequisites
        const item9prereqs = vrR3013({
          item3Signed: signedItems.includes("3"),
          allFindingsEntered: (njpCase.offenses || []).every((o: { finding: string | null }) => o.finding),
          punishmentEntered: !!njpCase.punishment,
        });
        if (item9prereqs) {
          return NextResponse.json({ error: item9prereqs.message, ruleId: item9prereqs.ruleId }, { status: 400 });
        }

        const { authorityName, authorityTitle, authorityUnit, authorityRank, authorityGrade, authorityEdipi } = data;

        if (authorityRank || authorityGrade) {
          const cvCheck = vrCv001(authorityRank, authorityGrade);
          if (cvCheck) {
            return NextResponse.json({ error: cvCheck.message, ruleId: cvCheck.ruleId }, { status: 400 });
          }
        }

        createSignature("9", authorityName || user.username);

        // Lock punishment record
        if (njpCase.punishment) {
          casesStore.upsertPunishment(id, { locked: true });
        }

        casesStore.update(id, {
          status: "PUNISHMENT_IMPOSED",
          njpAuthorityName: authorityName,
          njpAuthorityTitle: authorityTitle,
          njpAuthorityUnit: authorityUnit,
          njpAuthorityRank: authorityRank,
          njpAuthorityGrade: authorityGrade,
          njpAuthorityEdipi: authorityEdipi,
        });

        audit("SIGN", "Item 9 signed - punishment imposed");
        return NextResponse.json({ message: "Item 9 signed. Punishment imposed." });
      }

      // ============================================================
      // Phase 4 - Notification
      // ============================================================
      case "SIGN_ITEM_11": {
        if (njpCase.status !== "PUNISHMENT_IMPOSED") {
          return NextResponse.json({ error: "Punishment must be imposed first" }, { status: 400 });
        }

        const { item10Date, signerName } = data;
        const item11Date = new Date().toISOString().split("T")[0];

        const item11Error = vrR4001(item11Date, njpCase.njpDate || undefined);
        if (item11Error) {
          return NextResponse.json({ error: item11Error.message }, { status: 400 });
        }

        createSignature("11", signerName || user.username);

        casesStore.update(id, {
          currentPhase: "NOTIFICATION",
          dateNoticeToAccused: item10Date,
        });

        audit("SIGN", "Item 11 signed");
        return NextResponse.json({ message: "Item 11 signed" });
      }

      case "SIGN_ITEM_12": {
        if (!signedItems.includes("11")) {
          return NextResponse.json({ error: "Item 11 must be signed first" }, { status: 400 });
        }

        const { appealIntent, signerName, refusedToSign } = data;

        createSignature("12", signerName || user.username, {
          refusalNoted: refusedToSign,
          coSignedInstead: refusedToSign,
        });

        const intendsToAppeal = appealIntent === "INTENDS_TO_APPEAL";
        const newStatus = intendsToAppeal ? "APPEAL_PENDING" : "NOTIFICATION_COMPLETE";

        // Create/update appeal record
        casesStore.upsertAppeal(id, {
          appealIntent,
          item12SignedDate: new Date().toISOString().split("T")[0],
          item12SignedById: user.userId,
          appealFiled: false,
          appealNotFiled: false,
          fiveDayAlertSent: false,
          restrictionStayed: false,
          extraDutiesStayed: false,
          jaReviewRequired: njpCase.jaReviewRequired || false,
          jaReviewComplete: false,
          items1314Locked: false,
        });

        casesStore.update(id, {
          status: newStatus,
          currentPhase: intendsToAppeal ? "APPEAL" : "NOTIFICATION",
        });

        audit("SIGN", intendsToAppeal ? "Item 12 - appeal initiated" : "Item 12 - no appeal");
        return NextResponse.json({
          message: intendsToAppeal ? "Appeal initiated" : "No appeal. Proceeding to admin completion.",
          status: newStatus,
        });
      }

      // ============================================================
      // Phase 5 - Appeal
      // ============================================================
      case "ENTER_APPEAL_DATE": {
        if (njpCase.status !== "APPEAL_PENDING") {
          return NextResponse.json({ error: "Case must be in appeal status" }, { status: 400 });
        }

        casesStore.upsertAppeal(id, {
          appealFiled: true,
          appealFiledDate: data.appealDate,
          fiveDayClockStart: data.appealDate,
        });

        casesStore.update(id, {
          appealFiledDate: data.appealDate,
          appealDate: data.appealDate,
        });

        audit("UPDATE", "Appeal date entered", "appealFiledDate", undefined, data.appealDate);
        return NextResponse.json({ message: "Appeal date entered" });
      }

      case "LOG_JA_REVIEW": {
        if (!njpCase.jaReviewRequired) {
          return NextResponse.json({ error: "JA review not required for this case" }, { status: 400 });
        }

        const jaLogCheck = vrR5002(data.reviewerName, data.reviewDate);
        if (jaLogCheck) {
          return NextResponse.json({ error: jaLogCheck.message, ruleId: jaLogCheck.ruleId }, { status: 400 });
        }

        casesStore.update(id, {
          jaReviewComplete: true,
          jaReviewerName: data.reviewerName,
          jaReviewDate: data.reviewDate,
          jaReviewNotes: data.summary,
        });

        if (njpCase.appeal) {
          casesStore.upsertAppeal(id, {
            jaReviewComplete: true,
            jaReviewerName: data.reviewerName,
            jaReviewDate: data.reviewDate,
            jaReviewSummary: data.summary,
          });
        }

        audit("UPDATE", "JA review completed");
        return NextResponse.json({ message: "JA review logged" });
      }

      case "SIGN_ITEM_14": {
        if (njpCase.jaReviewRequired && !njpCase.jaReviewComplete) {
          return NextResponse.json(
            { error: "JA review must be completed before appeal authority action" },
            { status: 400 }
          );
        }

        const { outcome, outcomeDetail, authorityName: appealAuthName, authorityRank: appealAuthRank, item15Date } = data;

        const outcomeCheck = vrR5005(outcome, outcomeDetail);
        if (outcomeCheck) {
          return NextResponse.json({ error: outcomeCheck.message, ruleId: outcomeCheck.ruleId }, { status: 400 });
        }

        createSignature("14", appealAuthName || user.username);

        casesStore.upsertAppeal(id, {
          appealAuthorityName: appealAuthName,
          appealAuthorityRank: appealAuthRank,
          appealAuthoritySignedDate: new Date().toISOString().split("T")[0],
          appealOutcome: outcome,
          appealOutcomeDetail: outcomeDetail || null,
          appealDecisionNoticeDate: item15Date,
          items1314Locked: true,
        });

        casesStore.update(id, {
          status: "APPEAL_COMPLETE",
          dateNoticeAppealDecision: item15Date,
        });

        audit("SIGN", `Item 14 signed - appeal ${outcome}`);
        return NextResponse.json({ message: "Appeal decision entered" });
      }

      // ============================================================
      // Phase 7 - Admin Completion
      // ============================================================
      case "CONFIRM_OMPF": {
        casesStore.update(id, {
          ompfScanConfirmed: true,
          ompfConfirmedBy: user.userId,
          ompfConfirmedDate: new Date().toISOString(),
        });

        audit("UPDATE", "OMPF/ESR confirmation logged");
        return NextResponse.json({ message: "OMPF/ESR confirmation logged" });
      }

      case "SIGN_ITEM_16": {
        const { udNumber, udDate, signerName } = data;
        const appeal16 = njpCase.appeal;

        // VR-R7-001: Item 16 prerequisites
        const prereqCheck = vrR7001({
          item3Signed: signedItems.includes("3"),
          item9Signed: signedItems.includes("9"),
          item12Signed: signedItems.includes("12"),
          appealResolved: !appeal16?.appealIntent || appeal16?.appealIntent !== "INTENDS_TO_APPEAL" || !!appeal16?.items1314Locked,
          ompfConfirmed: njpCase.ompfScanConfirmed,
          udNumber: udNumber || "",
          udDate: udDate || "",
        });
        if (prereqCheck) {
          return NextResponse.json({ error: prereqCheck.message, ruleId: prereqCheck.ruleId }, { status: 400 });
        }

        createSignature("16", signerName || user.username);

        const hasSuspension = njpCase.punishment?.suspensionStatus === "ACTIVE";
        const finalStatus = hasSuspension ? "CLOSED_SUSPENSION_ACTIVE" : "CLOSED";

        casesStore.update(id, {
          status: finalStatus,
          currentPhase: "CLOSED",
          item16SignedDate: new Date().toISOString().split("T")[0],
          item16UdNumber: udNumber,
          item16Dtd: udDate,
          formLocked: true,
          caseFinalDate: new Date().toISOString().split("T")[0],
        });

        // Lock all item 21 entries
        const currentCase = casesStore.findById(id)!;
        const lockedEntries = (currentCase.item21Entries || []).map(
          (e: Record<string, unknown>) => ({ ...e, locked: true })
        );
        casesStore.update(id, { item21Entries: lockedEntries });

        // Create 4 distribution copy document records
        const distributions = [
          { suffix: "E-SRB", flags: { distributionEsrb: true } },
          { suffix: "OMPF", flags: { distributionOmpf: true } },
          { suffix: "FILES", flags: { distributionFiles: true } },
          { suffix: "MEMBER", flags: { distributionMember: true } },
        ];
        for (const dist of distributions) {
          casesStore.addDocument(id, {
            documentType: `NAVMC_10132_${dist.suffix}`,
            generatedById: user.userId,
            generatedAt: new Date().toISOString(),
            ...dist.flags,
          });
        }

        audit("SIGN", "Item 16 signed - case closed");
        return NextResponse.json({ message: "Case closed", status: finalStatus });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Phase action error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
