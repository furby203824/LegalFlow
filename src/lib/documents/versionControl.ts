import { prisma } from "@/lib/db";
import crypto from "crypto";

interface DistributionFlags {
  esrb?: boolean;
  ompf?: boolean;
  files?: boolean;
  member?: boolean;
}

export async function createVersionedDocument(
  caseId: string,
  documentType: string,
  userId: string,
  distributionFlags?: DistributionFlags
): Promise<{ id: string; version: number }> {
  return prisma.$transaction(async (tx) => {
    // Find existing current document of same type
    const existing = await tx.document.findFirst({
      where: { caseId, documentType, isCurrent: true },
      orderBy: { documentVersion: "desc" },
    });

    const newVersion = existing ? existing.documentVersion + 1 : 1;
    const newId = crypto.randomUUID();

    // Mark existing as superseded
    if (existing) {
      await tx.document.update({
        where: { id: existing.id },
        data: { isCurrent: false, supersededById: newId },
      });
    }

    // Create new current document
    await tx.document.create({
      data: {
        id: newId,
        caseId,
        documentType,
        documentVersion: newVersion,
        generatedById: userId,
        generatedAt: new Date(),
        isCurrent: true,
        ...(distributionFlags && {
          distributionEsrb: distributionFlags.esrb || false,
          distributionOmpf: distributionFlags.ompf || false,
          distributionFiles: distributionFlags.files || false,
          distributionMember: distributionFlags.member || false,
        }),
      },
    });

    return { id: newId, version: newVersion };
  });
}
