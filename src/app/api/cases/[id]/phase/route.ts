import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const njpCase = await prisma.case.findUnique({
      where: { id },
      include: {
        accused: true,
        offenses: true,
        punishmentRecord: true,
        appealRecord: true,
        signatures: true,
      },
    });

    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (njpCase.formLocked) {
      return NextResponse.json({ error: "Case form is locked" }, { status: 400 });
    }

    // Helper to get signed item numbers
    const signedItems = njpCase.signatures.map((s) => s.itemNumber);

    // Helper to create audit log
    async function audit(actionType: string, notes?: string, field?: string, oldVal?: string, newVal?: string) {
      await prisma.auditLog.create({
        data: {
          caseId: id,
          tableName: "cases",
          recordId: id,
          action: actionType,
          userId: user.userId,
          userRole: user.role,
          userName: user.username,
          fieldName: field,
          oldValue: oldVal,
          newValue: newVal,
          notes,
        },
      });
    }

    // Helper to create signature
    async function createSignature(itemNumber: string, signerName: string, opts?: {
      refusalNoted?: boolean;
      coSignedInstead?: boolean;
      method?: string;
    }) {
      const itemsLocked = getLockedItems([...signedItems, itemNumber]);
      await prisma.signature.create({
        data: {
          caseId: id,
          itemNumber,
          signerRole: user.role,
          signerUserId: user.userId,
          signerName,
          signedDate: new Date().toISOString().split("T")[0],
          signatureMethod: opts?.method || "ELECTRONIC",
          refusalNoted: opts?.refusalNoted || false,
          coSignedInstead: opts?.coSignedInstead || false,
          itemsLocked: JSON.stringify(itemsLocked),
        },
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
          await createSignature("2", signerName || user.username, {
            refusalNoted: refusedToSign,
            coSignedInstead: refusedToSign,
          });

          await prisma.case.update({
            where: { id },
            data: {
              status: "REFERRED_COURT_MARTIAL",
              currentPhase: "RIGHTS_ADVISEMENT",
            },
          });

          await audit("SIGN", "Item 2 signed - court-martial demanded or refused");
          return NextResponse.json({
            message: "Case referred to court-martial jurisdiction",
            status: "REFERRED_COURT_MARTIAL",
          });
        }

        await createSignature("2", signerName || user.username);

        await prisma.case.update({
          where: { id },
          data: { currentPhase: "RIGHTS_ADVISEMENT" },
        });

        // Lock offenses and victims
        await prisma.offense.updateMany({
          where: { caseId: id },
          data: { locked: true },
        });
        await prisma.victim.updateMany({
          where: { caseId: id },
          data: { locked: true },
        });

        await audit("SIGN", "Item 2 signed - NJP accepted");
        return NextResponse.json({ message: "Item 2 signed successfully" });
      }

      case "SIGN_ITEM_3": {
        if (!signedItems.includes("2")) {
          return NextResponse.json({ error: "Item 2 must be signed first" }, { status: 400 });
        }

        const { signerName } = data;
        await createSignature("3", signerName || user.username);

        await prisma.case.update({
          where: { id },
          data: {
            status: "RIGHTS_ADVISED",
            currentPhase: "RIGHTS_ADVISEMENT",
          },
        });

        await audit("SIGN", "Item 3 signed - rights advisement complete");
        return NextResponse.json({ message: "Item 3 signed. Rights advisement complete." });
      }

      // ============================================================
      // Phase 3 - Hearing
      // ============================================================
      case "ENTER_FINDINGS": {
        if (njpCase.status !== "RIGHTS_ADVISED") {
          return NextResponse.json({ error: "Rights advisement must be completed first" }, { status: 400 });
        }

        const { findings } = data; // Array of { offenseId, finding: "G" | "NG" }
        for (const f of findings) {
          await prisma.offense.update({
            where: { id: f.offenseId },
            data: { finding: f.finding },
          });
        }

        await prisma.case.update({
          where: { id },
          data: { currentPhase: "HEARING" },
        });

        await audit("UPDATE", "Findings entered");
        return NextResponse.json({ message: "Findings entered" });
      }

      case "ENTER_PUNISHMENT": {
        if (njpCase.currentPhase !== "HEARING") {
          return NextResponse.json({ error: "Must be in hearing phase" }, { status: 400 });
        }

        const { punishment, noPunishment } = data;

        // No punishment - destroy case
        if (noPunishment) {
          await prisma.case.update({
            where: { id },
            data: { status: "DESTROYED", njpDate: punishment?.punishmentDate },
          });
          await audit("UPDATE", "Case destroyed - no punishment imposed");
          return NextResponse.json({ message: "Case destroyed - no punishment imposed" });
        }

        // Validate Item 3 date
        const item3Sig = njpCase.signatures.find((s) => s.itemNumber === "3");
        const item3Date = item3Sig?.signedDate;
        const item3Error = vrR2005(item3Date || undefined, punishment.punishmentDate);
        if (item3Error) {
          return NextResponse.json({ error: item3Error.message }, { status: 400 });
        }

        // Validate punishment limits
        const pErrors = validatePunishment(
          punishment,
          njpCase.commanderGradeLevel as CommanderGradeLevel,
          njpCase.accused.grade as Grade
        );
        if (pErrors.length > 0) {
          return NextResponse.json({ errors: pErrors.map((e) => e.message) }, { status: 400 });
        }

        // Check JA review thresholds
        const jaThresholds = vrR3010(
          punishment,
          njpCase.accused.grade as Grade
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
        // VR-CV-003: Apply approved abbreviations
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

        // Upsert punishment record
        await prisma.punishmentRecord.upsert({
          where: { caseId: id },
          update: {
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
            reductionFromRank: punishment.reductionImposed ? njpCase.accused.rank : null,
            reductionFromGrade: punishment.reductionImposed ? njpCase.accused.grade : null,
            reductionToRank: punishment.reductionToRank || null,
            reductionToGrade: punishment.reductionToGrade || null,
            extraDutiesDays: punishment.extraDutiesDays || null,
            restrictionDays: punishment.restrictionDays || null,
            restrictionLocation: punishment.restrictionLocation || null,
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
          },
          create: {
            caseId: id,
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
            reductionFromRank: punishment.reductionImposed ? njpCase.accused.rank : null,
            reductionFromGrade: punishment.reductionImposed ? njpCase.accused.grade : null,
            reductionToRank: punishment.reductionToRank || null,
            reductionToGrade: punishment.reductionToGrade || null,
            extraDutiesDays: punishment.extraDutiesDays || null,
            restrictionDays: punishment.restrictionDays || null,
            restrictionLocation: punishment.restrictionLocation || null,
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
          },
        });

        // Update case
        await prisma.case.update({
          where: { id },
          data: {
            njpDate: punishment.punishmentDate,
            jaReviewRequired: jaThresholds.anyMet,
          },
        });

        // Create suspension monitor if applicable
        if (punishment.suspensionImposed && suspensionEndDate) {
          const pRecord = await prisma.punishmentRecord.findUnique({ where: { caseId: id } });
          if (pRecord) {
            await prisma.activeSuspensionMonitor.upsert({
              where: { caseId: id },
              update: {
                suspensionStart: punishment.punishmentDate,
                suspensionEnd: suspensionEndDate,
                suspendedPunishment: punishment.suspensionPunishment || punishmentText,
                monitorStatus: "ACTIVE",
              },
              create: {
                caseId: id,
                punishmentRecordId: pRecord.id,
                suspensionStart: punishment.punishmentDate,
                suspensionEnd: suspensionEndDate,
                suspendedPunishment: punishment.suspensionPunishment || punishmentText,
              },
            });
          }
        }

        await audit("UPDATE", "Punishment entered", "punishment", undefined, punishmentText);
        return NextResponse.json({
          message: "Punishment entered",
          jaReviewRequired: jaThresholds.anyMet,
        });
      }

      case "SIGN_ITEM_9": {
        // VR-R3-013: Item 9 prerequisites
        const item9prereqs = vrR3013({
          item3Signed: signedItems.includes("3"),
          allFindingsEntered: njpCase.offenses.every((o) => o.finding),
          punishmentEntered: !!njpCase.punishmentRecord,
        });
        if (item9prereqs) {
          return NextResponse.json({ error: item9prereqs.message, ruleId: item9prereqs.ruleId }, { status: 400 });
        }

        const { authorityName, authorityTitle, authorityUnit, authorityRank, authorityGrade, authorityEdipi } = data;

        // VR-CV-001: Validate rank/grade if provided
        if (authorityRank || authorityGrade) {
          const cvCheck = vrCv001(authorityRank, authorityGrade);
          if (cvCheck) {
            return NextResponse.json({ error: cvCheck.message, ruleId: cvCheck.ruleId }, { status: 400 });
          }
        }

        await createSignature("9", authorityName || user.username);

        // Lock punishment record
        if (njpCase.punishmentRecord) {
          await prisma.punishmentRecord.update({
            where: { caseId: id },
            data: { locked: true },
          });
        }

        await prisma.case.update({
          where: { id },
          data: {
            status: "PUNISHMENT_IMPOSED",
            njpAuthorityName: authorityName,
            njpAuthorityTitle: authorityTitle,
            njpAuthorityUnit: authorityUnit,
            njpAuthorityRank: authorityRank,
            njpAuthorityGrade: authorityGrade,
            njpAuthorityEdipi: authorityEdipi,
          },
        });

        await audit("SIGN", "Item 9 signed - punishment imposed");
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

        await createSignature("11", signerName || user.username);

        await prisma.case.update({
          where: { id },
          data: {
            currentPhase: "NOTIFICATION",
            dateNoticeToAccused: item10Date,
          },
        });

        await audit("SIGN", "Item 11 signed");
        return NextResponse.json({ message: "Item 11 signed" });
      }

      case "SIGN_ITEM_12": {
        if (!signedItems.includes("11")) {
          return NextResponse.json({ error: "Item 11 must be signed first" }, { status: 400 });
        }

        const { appealIntent, signerName, refusedToSign } = data;

        await createSignature("12", signerName || user.username, {
          refusalNoted: refusedToSign,
          coSignedInstead: refusedToSign,
        });

        const intendsToAppeal = appealIntent === "INTENDS_TO_APPEAL";
        const newStatus = intendsToAppeal ? "APPEAL_PENDING" : "NOTIFICATION_COMPLETE";

        // Create appeal record
        await prisma.appealRecord.upsert({
          where: { caseId: id },
          update: {
            appealIntent,
            item12SignedDate: new Date().toISOString().split("T")[0],
            item12SignedById: user.userId,
          },
          create: {
            caseId: id,
            appealIntent,
            item12SignedDate: new Date().toISOString().split("T")[0],
            item12SignedById: user.userId,
            jaReviewRequired: njpCase.jaReviewRequired,
          },
        });

        await prisma.case.update({
          where: { id },
          data: {
            status: newStatus,
            currentPhase: intendsToAppeal ? "APPEAL" : "NOTIFICATION",
          },
        });

        await audit("SIGN", intendsToAppeal ? "Item 12 - appeal initiated" : "Item 12 - no appeal");
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

        await prisma.appealRecord.update({
          where: { caseId: id },
          data: {
            appealFiled: true,
            appealFiledDate: data.appealDate,
            fiveDayClockStart: data.appealDate,
          },
        });

        await prisma.case.update({
          where: { id },
          data: { appealFiledDate: data.appealDate, appealDate: data.appealDate },
        });

        await audit("UPDATE", "Appeal date entered", "appealFiledDate", undefined, data.appealDate);
        return NextResponse.json({ message: "Appeal date entered" });
      }

      case "LOG_JA_REVIEW": {
        if (!njpCase.jaReviewRequired) {
          return NextResponse.json({ error: "JA review not required for this case" }, { status: 400 });
        }

        // VR-R5-002: JA review log requirements
        const jaLogCheck = vrR5002(data.reviewerName, data.reviewDate);
        if (jaLogCheck) {
          return NextResponse.json({ error: jaLogCheck.message, ruleId: jaLogCheck.ruleId }, { status: 400 });
        }

        await prisma.case.update({
          where: { id },
          data: {
            jaReviewComplete: true,
            jaReviewerName: data.reviewerName,
            jaReviewDate: data.reviewDate,
            jaReviewNotes: data.summary,
          },
        });

        if (njpCase.appealRecord) {
          await prisma.appealRecord.update({
            where: { caseId: id },
            data: {
              jaReviewComplete: true,
              jaReviewerName: data.reviewerName,
              jaReviewDate: data.reviewDate,
              jaReviewSummary: data.summary,
            },
          });
        }

        await audit("UPDATE", "JA review completed");
        return NextResponse.json({ message: "JA review logged" });
      }

      case "SIGN_ITEM_14": {
        const appeal = njpCase.appealRecord;
        if (njpCase.jaReviewRequired && !njpCase.jaReviewComplete) {
          return NextResponse.json(
            { error: "JA review must be completed before appeal authority action" },
            { status: 400 }
          );
        }

        const { outcome, outcomeDetail, authorityName: appealAuthName, authorityRank: appealAuthRank, item15Date } = data;

        // VR-R5-005: Appeal outcome required
        const outcomeCheck = vrR5005(outcome, outcomeDetail);
        if (outcomeCheck) {
          return NextResponse.json({ error: outcomeCheck.message, ruleId: outcomeCheck.ruleId }, { status: 400 });
        }

        await createSignature("14", appealAuthName || user.username);

        await prisma.appealRecord.update({
          where: { caseId: id },
          data: {
            appealAuthorityName: appealAuthName,
            appealAuthorityRank: appealAuthRank,
            appealAuthoritySignedDate: new Date().toISOString().split("T")[0],
            appealOutcome: outcome,
            appealOutcomeDetail: outcomeDetail || null,
            appealDecisionNoticeDate: item15Date,
            items1314Locked: true,
          },
        });

        await prisma.case.update({
          where: { id },
          data: {
            status: "APPEAL_COMPLETE",
            dateNoticeAppealDecision: item15Date,
          },
        });

        await audit("SIGN", `Item 14 signed - appeal ${outcome}`);
        return NextResponse.json({ message: "Appeal decision entered" });
      }

      // ============================================================
      // Phase 7 - Admin Completion
      // ============================================================
      case "CONFIRM_OMPF": {
        await prisma.case.update({
          where: { id },
          data: {
            ompfScanConfirmed: true,
            ompfConfirmedById: user.userId,
            ompfConfirmedDate: new Date(),
          },
        });

        await audit("UPDATE", "OMPF/ESR confirmation logged");
        return NextResponse.json({ message: "OMPF/ESR confirmation logged" });
      }

      case "SIGN_ITEM_16": {
        const { udNumber, udDate, signerName } = data;
        const appeal16 = njpCase.appealRecord;

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

        await createSignature("16", signerName || user.username);

        const hasSuspension = njpCase.punishmentRecord?.suspensionStatus === "ACTIVE";
        const finalStatus = hasSuspension ? "CLOSED_SUSPENSION_ACTIVE" : "CLOSED";

        await prisma.case.update({
          where: { id },
          data: {
            status: finalStatus,
            currentPhase: "CLOSED",
            item16InitiatedById: user.userId,
            item16SignedDate: new Date().toISOString().split("T")[0],
            item16UdNumber: udNumber,
            item16Dtd: udDate,
            formLocked: true,
            caseFinalDate: new Date().toISOString().split("T")[0],
          },
        });

        // Lock all item 21 entries
        await prisma.item21Entry.updateMany({
          where: { caseId: id },
          data: { locked: true },
        });

        // Create document record for completed UPB
        await prisma.document.create({
          data: {
            caseId: id,
            documentType: "NAVMC_10132",
            generatedById: user.userId,
            generatedAt: new Date(),
          },
        });

        await audit("SIGN", "Item 16 signed - case closed");
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
