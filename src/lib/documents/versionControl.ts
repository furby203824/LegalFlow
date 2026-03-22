import { casesStore } from "@/lib/db";

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
  const doc = casesStore.addDocument(caseId, {
    documentType,
    generatedById: userId,
    generatedAt: new Date().toISOString(),
    distributionEsrb: distributionFlags?.esrb || false,
    distributionOmpf: distributionFlags?.ompf || false,
    distributionFiles: distributionFlags?.files || false,
    distributionMember: distributionFlags?.member || false,
  });

  return { id: doc.id, version: doc.documentVersion || 1 };
}
