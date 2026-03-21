import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  validateItem3Date,
  validateItem11Date,
  validatePunishment,
  checkJaReviewRequired,
  getLockedItems,
} from "@/lib/validation";
import type { Grade, CommanderGradeCategory, PunishmentEntry } from "@/types";

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

    const njpCase = await prisma.njpCase.findUnique({
      where: { id },
      include: {
        offenses: true,
        punishments: true,
        suspensions: true,
      },
    });

    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check locked items
    const lockedItems: number[] = JSON.parse(njpCase.lockedItems);

    switch (action) {
      // Phase 2 - Rights Advisement
      case "SIGN_ITEM_2": {
        if (njpCase.currentPhase !== "INITIATION" && njpCase.currentPhase !== "RIGHTS_ADVISEMENT") {
          return NextResponse.json({ error: "Invalid phase for Item 2" }, { status: 400 });
        }

        const { acceptsNjp, counselProvided, refusedToSign } = data;

        // If demands court-martial and no vessel exception
        if (!acceptsNjp && !njpCase.vesselException) {
          await prisma.njpCase.update({
            where: { id },
            data: {
              status: "REFERRED_COURT_MARTIAL",
              item2AcceptsNjp: false,
              item2CounselProvided: counselProvided,
              item2AccusedRefusedToSign: refusedToSign || false,
              item2SignedBy: user.userId,
              item2SignedAt: new Date(),
              lockedItems: JSON.stringify(
                getLockedItems(["item2"])
              ),
            },
          });

          await prisma.auditLog.create({
            data: {
              caseId: id,
              userId: user.userId,
              action: "ITEM_2_SIGNED_COURT_MARTIAL_DEMANDED",
            },
          });

          return NextResponse.json({
            message: "Case referred to court-martial jurisdiction",
            status: "REFERRED_COURT_MARTIAL",
          });
        }

        // If refused to sign and no vessel exception
        if (refusedToSign && !njpCase.vesselException) {
          await prisma.njpCase.update({
            where: { id },
            data: {
              status: "REFERRED_COURT_MARTIAL",
              item2AcceptsNjp: false,
              item2CounselProvided: counselProvided,
              item2AccusedRefusedToSign: true,
              item2SignedBy: user.userId,
              item2SignedAt: new Date(),
              lockedItems: JSON.stringify(getLockedItems(["item2"])),
            },
          });

          return NextResponse.json({
            message: "Accused refused to sign. Case routing required.",
            status: "REFERRED_COURT_MARTIAL",
          });
        }

        await prisma.njpCase.update({
          where: { id },
          data: {
            currentPhase: "RIGHTS_ADVISEMENT",
            item2AcceptsNjp: acceptsNjp,
            item2CounselProvided: counselProvided,
            item2AccusedRefusedToSign: refusedToSign || false,
            item2SignedBy: user.userId,
            item2SignedAt: new Date(),
            lockedItems: JSON.stringify(getLockedItems(["item2"])),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "ITEM_2_SIGNED",
          },
        });

        return NextResponse.json({ message: "Item 2 signed successfully" });
      }

      case "SIGN_ITEM_3": {
        if (!njpCase.item2SignedAt) {
          return NextResponse.json({ error: "Item 2 must be signed first" }, { status: 400 });
        }

        await prisma.njpCase.update({
          where: { id },
          data: {
            status: "RIGHTS_ADVISED",
            currentPhase: "RIGHTS_ADVISEMENT",
            item3SignedBy: user.userId,
            item3SignedAt: new Date(),
            lockedItems: JSON.stringify(getLockedItems(["item2", "item3"])),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "ITEM_3_SIGNED",
          },
        });

        return NextResponse.json({ message: "Item 3 signed. Rights advisement complete." });
      }

      // Phase 3 - Hearing
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

        await prisma.njpCase.update({
          where: { id },
          data: { currentPhase: "HEARING" },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "FINDINGS_ENTERED",
          },
        });

        return NextResponse.json({ message: "Findings entered" });
      }

      case "ENTER_PUNISHMENT": {
        if (njpCase.currentPhase !== "HEARING") {
          return NextResponse.json({ error: "Must be in hearing phase" }, { status: 400 });
        }

        const { punishments, item6Date, noPunishment } = data;

        // No punishment - destroy case
        if (noPunishment) {
          await prisma.njpCase.update({
            where: { id },
            data: {
              status: "DESTROYED",
              item6NoPunishment: true,
              item6Date,
            },
          });

          await prisma.auditLog.create({
            data: {
              caseId: id,
              userId: user.userId,
              action: "CASE_DESTROYED_NO_PUNISHMENT",
            },
          });

          return NextResponse.json({ message: "Case destroyed - no punishment imposed" });
        }

        // Validate Item 3 date
        const item3Date = njpCase.item3SignedAt?.toISOString().split("T")[0];
        const item3Error = validateItem3Date(item3Date, item6Date);
        if (item3Error) {
          return NextResponse.json({ error: item3Error.message }, { status: 400 });
        }

        // Validate each punishment
        const errors: string[] = [];
        for (const p of punishments) {
          const pErrors = validatePunishment(
            p as PunishmentEntry,
            njpCase.commanderGradeCategory as CommanderGradeCategory,
            njpCase.accusedGrade as Grade
          );
          errors.push(...pErrors.map((e) => e.message));
        }

        if (errors.length > 0) {
          return NextResponse.json({ errors }, { status: 400 });
        }

        // Check JA review requirement
        const jaRequired = checkJaReviewRequired(
          punishments as PunishmentEntry[],
          njpCase.accusedGrade as Grade
        );

        // Delete existing punishments and create new
        await prisma.punishment.deleteMany({ where: { caseId: id } });
        for (const p of punishments) {
          await prisma.punishment.create({
            data: {
              caseId: id,
              type: p.type,
              duration: p.duration || null,
              amount: p.amount || null,
              reducedToGrade: p.reducedToGrade || null,
              suspended: p.suspended || false,
              suspensionMonths: p.suspensionMonths || null,
            },
          });

          // Create suspension records
          if (p.suspended && p.suspensionMonths && item6Date) {
            const endDate = new Date(item6Date);
            endDate.setMonth(endDate.getMonth() + p.suspensionMonths);
            await prisma.suspension.create({
              data: {
                caseId: id,
                punishment: p.type,
                suspensionMonths: p.suspensionMonths,
                startDate: item6Date,
                endDate: endDate.toISOString().split("T")[0],
                status: "ACTIVE",
              },
            });
          }
        }

        await prisma.njpCase.update({
          where: { id },
          data: {
            item6Date,
            jaReviewRequired: jaRequired,
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "PUNISHMENT_ENTERED",
            newValue: JSON.stringify(punishments),
          },
        });

        return NextResponse.json({
          message: "Punishment entered",
          jaReviewRequired: jaRequired,
        });
      }

      case "SIGN_ITEM_9": {
        if (!njpCase.item6Date) {
          return NextResponse.json({ error: "Punishment must be entered first" }, { status: 400 });
        }

        const { authorityName, authorityTitle, authorityUnit, authorityRank, authorityGrade, authorityEdipi } = data;

        await prisma.njpCase.update({
          where: { id },
          data: {
            status: "PUNISHMENT_IMPOSED",
            currentPhase: "HEARING",
            item8AuthorityName: authorityName,
            item8AuthorityTitle: authorityTitle,
            item8AuthorityUnit: authorityUnit,
            item8AuthorityRank: authorityRank,
            item8AuthorityGrade: authorityGrade,
            item8AuthorityEdipi: authorityEdipi,
            item9SignedBy: user.userId,
            item9SignedAt: new Date(),
            lockedItems: JSON.stringify(
              getLockedItems(["item2", "item3", "item9"])
            ),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "ITEM_9_SIGNED",
          },
        });

        return NextResponse.json({ message: "Item 9 signed. Punishment imposed." });
      }

      // Phase 4 - Notification
      case "SIGN_ITEM_11": {
        if (njpCase.status !== "PUNISHMENT_IMPOSED") {
          return NextResponse.json({ error: "Punishment must be imposed first" }, { status: 400 });
        }

        const { item10Date } = data;
        const item11Date = new Date().toISOString().split("T")[0];

        const item11Error = validateItem11Date(item11Date, njpCase.item6Date || undefined);
        if (item11Error) {
          return NextResponse.json({ error: item11Error.message }, { status: 400 });
        }

        await prisma.njpCase.update({
          where: { id },
          data: {
            currentPhase: "NOTIFICATION",
            item10Date,
            item11SignedBy: user.userId,
            item11SignedAt: new Date(),
            lockedItems: JSON.stringify(
              getLockedItems(["item2", "item3", "item9", "item11"])
            ),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "ITEM_11_SIGNED",
          },
        });

        return NextResponse.json({ message: "Item 11 signed" });
      }

      case "SIGN_ITEM_12": {
        if (!njpCase.item11SignedAt) {
          return NextResponse.json({ error: "Item 11 must be signed first" }, { status: 400 });
        }

        const { intendsToAppeal, refusedToSign } = data;

        const newStatus = intendsToAppeal ? "APPEAL_PENDING" : "NOTIFICATION_COMPLETE";
        const newPhase = intendsToAppeal ? "APPEAL" : "NOTIFICATION";

        await prisma.njpCase.update({
          where: { id },
          data: {
            status: newStatus,
            currentPhase: newPhase,
            item12IntendsToAppeal: intendsToAppeal,
            item12AccusedRefusedToSign: refusedToSign || false,
            item12SignedBy: user.userId,
            item12SignedAt: new Date(),
            lockedItems: JSON.stringify(
              getLockedItems(["item2", "item3", "item9", "item11", "item12"])
            ),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: intendsToAppeal ? "APPEAL_INITIATED" : "NO_APPEAL",
          },
        });

        return NextResponse.json({
          message: intendsToAppeal ? "Appeal initiated" : "No appeal. Proceeding to admin completion.",
          status: newStatus,
        });
      }

      // Phase 5 - Appeal
      case "ENTER_APPEAL_DATE": {
        if (njpCase.status !== "APPEAL_PENDING") {
          return NextResponse.json({ error: "Case must be in appeal status" }, { status: 400 });
        }

        await prisma.njpCase.update({
          where: { id },
          data: {
            currentPhase: "APPEAL",
            item13AppealDate: data.appealDate,
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "APPEAL_DATE_ENTERED",
            newValue: data.appealDate,
          },
        });

        return NextResponse.json({ message: "Appeal date entered" });
      }

      case "LOG_JA_REVIEW": {
        if (!njpCase.jaReviewRequired) {
          return NextResponse.json({ error: "JA review not required for this case" }, { status: 400 });
        }

        await prisma.njpCase.update({
          where: { id },
          data: {
            jaReviewCompleted: true,
            jaReviewerName: data.reviewerName,
            jaReviewDate: data.reviewDate,
            jaReviewSummary: data.summary,
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "JA_REVIEW_COMPLETED",
          },
        });

        return NextResponse.json({ message: "JA review logged" });
      }

      case "SIGN_ITEM_14": {
        if (njpCase.jaReviewRequired && !njpCase.jaReviewCompleted) {
          return NextResponse.json(
            { error: "JA review must be completed before appeal authority action" },
            { status: 400 }
          );
        }

        const { outcome, partialReliefDetails } = data;

        await prisma.njpCase.update({
          where: { id },
          data: {
            status: "APPEAL_COMPLETE",
            item14Outcome: outcome,
            item14PartialReliefDetails: partialReliefDetails || null,
            item14SignedBy: user.userId,
            item14SignedAt: new Date(),
            item15Date: data.item15Date,
            lockedItems: JSON.stringify(
              getLockedItems(["item2", "item3", "item9", "item11", "item12", "item14"])
            ),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "ITEM_14_SIGNED",
            newValue: outcome,
          },
        });

        return NextResponse.json({ message: "Appeal decision entered" });
      }

      // Phase 7 - Admin Completion
      case "CONFIRM_OMPF": {
        await prisma.njpCase.update({
          where: { id },
          data: {
            ompfConfirmed: true,
            ompfConfirmedBy: user.userId,
            ompfConfirmedAt: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "OMPF_CONFIRMED",
          },
        });

        return NextResponse.json({ message: "OMPF/ESR confirmation logged" });
      }

      case "SIGN_ITEM_16": {
        // Check all prior phases complete
        if (!njpCase.item9SignedAt) {
          return NextResponse.json({ error: "Prior phases must be complete" }, { status: 400 });
        }
        if (njpCase.item12IntendsToAppeal && !njpCase.item14SignedAt) {
          return NextResponse.json({ error: "Appeal must be resolved before closing" }, { status: 400 });
        }

        const { udNumber, udDate } = data;

        const hasSuspension = await prisma.suspension.findFirst({
          where: { caseId: id, status: "ACTIVE" },
        });

        const finalStatus = hasSuspension ? "CLOSED_SUSPENSION_ACTIVE" : "CLOSED";

        await prisma.njpCase.update({
          where: { id },
          data: {
            status: finalStatus,
            currentPhase: "ADMIN_COMPLETION",
            item16SignedBy: user.userId,
            item16SignedAt: new Date(),
            item16UdNumber: udNumber,
            item16UdDate: udDate,
            lockedItems: JSON.stringify(
              getLockedItems(["item2", "item3", "item9", "item11", "item12", "item14", "item16"])
            ),
          },
        });

        await prisma.auditLog.create({
          data: {
            caseId: id,
            userId: user.userId,
            action: "ITEM_16_SIGNED_CASE_CLOSED",
          },
        });

        return NextResponse.json({
          message: "Case closed",
          status: finalStatus,
        });
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
