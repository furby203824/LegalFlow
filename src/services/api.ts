"use client";

// =============================================================================
// Client-Side API Service Layer
// Replaces all /api/ routes with direct data store calls
// =============================================================================

import { casesStore, usersStore, auditStore, caseWithIncludes } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { differenceInDays } from "date-fns";
import type { UserRole } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

function user() {
  const s = getSession();
  if (!s) throw new Error("Authentication required");
  return s;
}

// =============================================================================
// Dashboard
// =============================================================================

function getNextAction(phase: string, status: string): { action: string; owner: UserRole } {
  switch (status) {
    case "INITIATED":
      return { action: "Complete Item 2 - Rights advisement", owner: "ACCUSED" };
    case "REFERRED_COURT_MARTIAL":
      return { action: "Route to court-martial jurisdiction", owner: "ADMIN" };
    case "RIGHTS_ADVISED":
      return { action: "Conduct hearing - Enter findings", owner: "NJP_AUTHORITY" };
    case "PUNISHMENT_IMPOSED":
      return { action: "Notify accused of punishment", owner: "NJP_AUTHORITY" };
    case "NOTIFICATION_COMPLETE":
      return { action: "Complete admin actions", owner: "ADMIN" };
    case "APPEAL_PENDING":
      return { action: "Process appeal", owner: "APPEAL_AUTHORITY" };
    case "APPEAL_COMPLETE":
      return { action: "Complete admin actions", owner: "ADMIN" };
    case "REMEDIAL_ACTION_PENDING":
      return { action: "Process remedial action", owner: "NJP_AUTHORITY" };
    default:
      return { action: "No action required", owner: "ADMIN" };
  }
}

export async function getDashboard() {
  const u = user();
  let cases = await casesStore.findMany((c) => c.status !== "DESTROYED");

  if (u.role === "ACCUSED") {
    cases = cases.filter((c) => c.accusedEdipi === u.edipi);
  } else if (u.role === "IPAC_ADMIN") {
    cases = cases.filter((c) => c.item16SignedDate);
  } else if (u.role !== "SUITE_ADMIN") {
    cases = cases.filter((c) => c.unitId === u.unitId);
  }

  const dashboardCases = cases.map((c) => {
    const daysInPhase = differenceInDays(new Date(), new Date(c.updatedAt));
    const { action, owner } = getNextAction(c.currentPhase, c.status);
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      marineName: `${c.accusedLastName}, ${c.accusedFirstName}`,
      marineGrade: c.accusedGrade,
      ucmjArticles: (c.offenses || []).map((o: Rec) => o.ucmjArticle),
      status: c.status,
      currentPhase: c.currentPhase,
      daysInCurrentPhase: daysInPhase,
      nextActionRequired: action,
      nextActionOwner: owner,
      overdue: daysInPhase > 14 && !c.status.startsWith("CLOSED"),
      suspensionActive: c.punishment?.suspensionStatus === "ACTIVE",
      jaReviewRequired: c.jaReviewRequired && !c.jaReviewComplete,
    };
  });

  const stats = {
    total: dashboardCases.length,
    open: dashboardCases.filter((c) => !c.status.startsWith("CLOSED")).length,
    closed: dashboardCases.filter((c) => c.status.startsWith("CLOSED")).length,
    overdue: dashboardCases.filter((c) => c.overdue).length,
    pendingAppeal: dashboardCases.filter((c) => c.status === "APPEAL_PENDING").length,
    jaReviewPending: dashboardCases.filter((c) => c.jaReviewRequired).length,
    activeSuspensions: dashboardCases.filter((c) => c.suspensionActive).length,
  };

  return { cases: dashboardCases, stats };
}

// =============================================================================
// Cases List
// =============================================================================

export async function getCases(filters?: { status?: string; name?: string }) {
  const u = user();
  let cases = await casesStore.findAll();

  if (u.role === "ACCUSED") {
    cases = cases.filter((c) => c.accusedEdipi === u.edipi);
  } else if (u.role === "IPAC_ADMIN") {
    cases = cases.filter(
      (c) => c.status?.startsWith("CLOSED") || c.item16SignedDate
    );
  } else if (u.role !== "SUITE_ADMIN") {
    cases = cases.filter((c) => c.unitId === u.unitId);
  }

  if (filters?.status) cases = cases.filter((c) => c.status === filters.status);
  if (filters?.name) {
    const q = filters.name.toLowerCase();
    cases = cases.filter(
      (c) =>
        (c.accusedLastName || "").toLowerCase().includes(q) ||
        (c.accusedFirstName || "").toLowerCase().includes(q)
    );
  }

  cases.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return { cases: cases.map(caseWithIncludes) };
}

// =============================================================================
// Case Detail
// =============================================================================

export async function getCase(id: string) {
  const c = await casesStore.findById(id);
  if (!c) throw new Error("Case not found");

  // Attach audit logs
  const auditLogs = await auditStore.findByCaseId(id);
  const full = caseWithIncludes(c);
  full.auditLogs = auditLogs.slice(-50).reverse();

  return { case: full };
}

// =============================================================================
// Phase Actions
// =============================================================================

export async function performPhaseAction(caseId: string, action: string, data: Rec = {}) {
  const u = user();

  const njpCaseOrNull = await casesStore.findById(caseId);
  if (!njpCaseOrNull) throw new Error("Case not found");
  const njpCase = njpCaseOrNull;
  if (njpCase.formLocked) throw new Error("Case form is locked");

  const signedItems = (njpCase.signatures || []).map((s: Rec) => s.itemNumber);

  function audit(actionType: string, notes?: string) {
    return auditStore.append({
      caseId,
      caseNumber: njpCase.caseNumber,
      userId: u.userId,
      userRole: u.role,
      userName: u.username,
      action: actionType,
      notes,
    });
  }

  function createSignature(itemNumber: string, signerName: string, opts?: Rec) {
    return casesStore.addSignature(caseId, {
      itemNumber,
      signerRole: u.role,
      signerUserId: u.userId,
      signerName,
      signedDate: new Date().toISOString().split("T")[0],
      signatureMethod: opts?.method || "ELECTRONIC",
      refusalNoted: opts?.refusalNoted || false,
      coSignedInstead: opts?.coSignedInstead || false,
    });
  }

  switch (action) {
    case "SIGN_ITEM_2": {
      const { acceptsNjp, refusedToSign, signerName } = data;
      if ((!acceptsNjp || refusedToSign) && !njpCase.vesselException) {
        await createSignature("2", signerName || u.username, { refusalNoted: refusedToSign, coSignedInstead: refusedToSign });
        await casesStore.update(caseId, { status: "REFERRED_COURT_MARTIAL", currentPhase: "RIGHTS_ADVISEMENT" });
        await audit("SIGN", "Item 2 signed - court-martial demanded or refused");
        return { message: "Case referred to court-martial jurisdiction", status: "REFERRED_COURT_MARTIAL" };
      }
      await createSignature("2", signerName || u.username);
      await casesStore.update(caseId, { currentPhase: "RIGHTS_ADVISEMENT" });
      const updated = await casesStore.findById(caseId);
      const lockedOffenses = (updated!.offenses || []).map((o: Rec) => ({ ...o, locked: true }));
      const lockedVictims = (updated!.victims || []).map((v: Rec) => ({ ...v, locked: true }));
      await casesStore.update(caseId, { offenses: lockedOffenses, victims: lockedVictims });
      await audit("SIGN", "Item 2 signed - NJP accepted");
      return { message: "Item 2 signed successfully" };
    }

    case "SIGN_ITEM_3": {
      if (!signedItems.includes("2")) throw new Error("Item 2 must be signed first");
      await createSignature("3", data.signerName || u.username);
      await casesStore.update(caseId, { status: "RIGHTS_ADVISED", currentPhase: "RIGHTS_ADVISEMENT" });
      await audit("SIGN", "Item 3 signed - rights advisement complete");
      return { message: "Item 3 signed. Rights advisement complete." };
    }

    case "ENTER_FINDINGS": {
      if (njpCase.status !== "RIGHTS_ADVISED") throw new Error("Rights advisement must be completed first");
      const updatedOffenses = [...(njpCase.offenses || [])];
      for (const f of data.findings) {
        const oIdx = updatedOffenses.findIndex((o: Rec) => o.id === f.offenseId);
        if (oIdx >= 0) updatedOffenses[oIdx] = { ...updatedOffenses[oIdx], finding: f.finding };
      }
      await casesStore.update(caseId, { offenses: updatedOffenses, currentPhase: "HEARING" });
      await audit("UPDATE", "Findings entered");
      return { message: "Findings entered" };
    }

    case "ENTER_PUNISHMENT": {
      if (njpCase.currentPhase !== "HEARING") throw new Error("Must be in hearing phase");
      const { punishment, noPunishment } = data;
      if (noPunishment) {
        await casesStore.update(caseId, { status: "DESTROYED", njpDate: punishment?.punishmentDate });
        await audit("UPDATE", "Case destroyed - no punishment imposed");
        return { message: "Case destroyed - no punishment imposed" };
      }
      // Simplified punishment storage (validation happens in UI)
      await casesStore.upsertPunishment(caseId, punishment);
      await casesStore.update(caseId, { njpDate: punishment.punishmentDate });
      await audit("UPDATE", "Punishment entered");
      return { message: "Punishment entered" };
    }

    case "SIGN_ITEM_9": {
      const { authorityName, authorityTitle, authorityUnit, authorityRank, authorityGrade, authorityEdipi } = data;
      await createSignature("9", authorityName || u.username);
      if (njpCase.punishment) await casesStore.upsertPunishment(caseId, { locked: true });
      await casesStore.update(caseId, {
        status: "PUNISHMENT_IMPOSED",
        njpAuthorityName: authorityName,
        njpAuthorityTitle: authorityTitle,
        njpAuthorityUnit: authorityUnit,
        njpAuthorityRank: authorityRank,
        njpAuthorityGrade: authorityGrade,
        njpAuthorityEdipi: authorityEdipi,
      });
      await audit("SIGN", "Item 9 signed - punishment imposed");
      return { message: "Item 9 signed. Punishment imposed." };
    }

    case "SIGN_ITEM_11": {
      if (njpCase.status !== "PUNISHMENT_IMPOSED") throw new Error("Punishment must be imposed first");
      await createSignature("11", data.signerName || u.username);
      await casesStore.update(caseId, { currentPhase: "NOTIFICATION", dateNoticeToAccused: data.item10Date });
      await audit("SIGN", "Item 11 signed");
      return { message: "Item 11 signed" };
    }

    case "SIGN_ITEM_12": {
      if (!signedItems.includes("11")) throw new Error("Item 11 must be signed first");
      const { appealIntent, signerName, refusedToSign } = data;
      await createSignature("12", signerName || u.username, { refusalNoted: refusedToSign, coSignedInstead: refusedToSign });
      const intendsToAppeal = appealIntent === "INTENDS_TO_APPEAL";
      await casesStore.upsertAppeal(caseId, {
        appealIntent,
        item12SignedDate: new Date().toISOString().split("T")[0],
        item12SignedById: u.userId,
        appealFiled: false,
        appealNotFiled: false,
        jaReviewRequired: njpCase.jaReviewRequired || false,
      });
      const newStatus = intendsToAppeal ? "APPEAL_PENDING" : "NOTIFICATION_COMPLETE";
      await casesStore.update(caseId, { status: newStatus, currentPhase: intendsToAppeal ? "APPEAL" : "NOTIFICATION" });
      await audit("SIGN", intendsToAppeal ? "Item 12 - appeal initiated" : "Item 12 - no appeal");
      return { message: intendsToAppeal ? "Appeal initiated" : "No appeal.", status: newStatus };
    }

    case "SIGN_ITEM_14": {
      const { outcome, outcomeDetail, authorityName: authName, authorityRank: authRank, item15Date } = data;
      await createSignature("14", authName || u.username);
      await casesStore.upsertAppeal(caseId, {
        appealAuthorityName: authName,
        appealAuthorityRank: authRank,
        appealAuthoritySignedDate: new Date().toISOString().split("T")[0],
        appealOutcome: outcome,
        appealOutcomeDetail: outcomeDetail || null,
        appealDecisionNoticeDate: item15Date,
        items1314Locked: true,
      });
      await casesStore.update(caseId, { status: "APPEAL_COMPLETE", dateNoticeAppealDecision: item15Date });
      await audit("SIGN", `Item 14 signed - appeal ${outcome}`);
      return { message: "Appeal decision entered" };
    }

    case "CONFIRM_OMPF": {
      await casesStore.update(caseId, {
        ompfScanConfirmed: true,
        ompfConfirmedBy: u.userId,
        ompfConfirmedDate: new Date().toISOString(),
      });
      await audit("UPDATE", "OMPF/ESR confirmation logged");
      return { message: "OMPF/ESR confirmation logged" };
    }

    case "SIGN_ITEM_16": {
      const { udNumber, udDate, signerName } = data;
      await createSignature("16", signerName || u.username);
      const hasSuspension = njpCase.punishment?.suspensionStatus === "ACTIVE";
      const finalStatus = hasSuspension ? "CLOSED_SUSPENSION_ACTIVE" : "CLOSED";
      await casesStore.update(caseId, {
        status: finalStatus,
        currentPhase: "CLOSED",
        item16SignedDate: new Date().toISOString().split("T")[0],
        item16UdNumber: udNumber,
        item16Dtd: udDate,
        formLocked: true,
        caseFinalDate: new Date().toISOString().split("T")[0],
      });
      const currentCase = await casesStore.findById(caseId);
      const lockedEntries = (currentCase!.item21Entries || []).map((e: Rec) => ({ ...e, locked: true }));
      await casesStore.update(caseId, { item21Entries: lockedEntries });
      for (const suffix of ["E-SRB", "OMPF", "FILES", "MEMBER"]) {
        await casesStore.addDocument(caseId, {
          documentType: `NAVMC_10132_${suffix}`,
          generatedById: u.userId,
          generatedAt: new Date().toISOString(),
        });
      }
      await audit("SIGN", "Item 16 signed - case closed");
      return { message: "Case closed", status: finalStatus };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// =============================================================================
// Remarks
// =============================================================================

export async function getRemarks(caseId: string) {
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  const entries = (c.item21Entries || []).sort(
    (a: Rec, b: Rec) => (a.entrySequence || 0) - (b.entrySequence || 0)
  );
  return { remarks: entries };
}

export async function addRemark(caseId: string, date: string, entryType: string, text: string) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  const entries = c.item21Entries || [];
  const maxSeq = entries.reduce((max: number, e: Rec) => Math.max(max, e.entrySequence || 0), 0);
  const entry = await casesStore.addItem21Entry(caseId, {
    entryDate: date,
    entrySequence: maxSeq + 1,
    entryType,
    entryText: text,
    systemGenerated: false,
    confirmed: false,
    locked: false,
  });
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "INSERT",
    notes: `Item 21 entry added: ${entryType}`,
  });
  return { remark: entry };
}

export async function confirmRemark(caseId: string, remarkId: string) {
  const u = user();
  const entry = await casesStore.updateItem21Entry(caseId, remarkId, {
    confirmedById: u.userId,
    confirmedAt: new Date().toISOString(),
    confirmed: true,
  });
  return { remark: entry };
}

// =============================================================================
// Hearing Record (Captain's Mast Guide)
// =============================================================================

export async function updateHearingRecord(caseId: string, data: Rec) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  await casesStore.upsertHearingRecord(caseId, {
    ...data,
    lastUpdatedBy: u.userId,
    lastUpdatedByName: u.username,
    lastUpdatedAt: new Date().toISOString(),
  });
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "UPDATE",
    notes: `Hearing record updated: step ${data.currentStep || "unknown"}`,
  });
  const updated = await casesStore.findById(caseId);
  return { hearingRecord: updated?.hearingRecord };
}

// =============================================================================
// Charge Sheet (DD Form 458)
// =============================================================================

export async function updateChargeSheet(caseId: string, data: Rec) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  await casesStore.upsertChargeSheet(caseId, {
    ...data,
    lastUpdatedBy: u.userId,
    lastUpdatedByName: u.username,
    lastUpdatedAt: new Date().toISOString(),
  });
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "UPDATE",
    notes: `DD 458 Charge Sheet updated: ${data._section || "general"}`,
  });
  const updated = await casesStore.findById(caseId);
  return { chargeSheet: updated?.chargeSheet };
}

// =============================================================================
// Rights Acknowledgement (JAGINST 5800.7G)
// =============================================================================

export async function updateRightsAcknowledgement(caseId: string, data: Rec) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  await casesStore.upsertRightsAcknowledgement(caseId, {
    ...data,
    lastUpdatedBy: u.userId,
    lastUpdatedByName: u.username,
    lastUpdatedAt: new Date().toISOString(),
  });
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "UPDATE",
    notes: "Rights Acknowledgement updated",
  });
  const updated = await casesStore.findById(caseId);
  return { rightsAcknowledgement: updated?.rightsAcknowledgement };
}

// =============================================================================
// Evidence
// =============================================================================

export async function getEvidence(caseId: string) {
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  return { evidence: (c.evidence || []).sort((a: Rec, b: Rec) => (a.createdAt || "").localeCompare(b.createdAt || "")) };
}

export async function addEvidence(caseId: string, evidenceData: Rec) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  const evidence = await casesStore.addEvidence(caseId, {
    ...evidenceData,
    addedBy: u.userId,
    addedByName: u.username,
  });
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "INSERT",
    notes: `Evidence added: ${evidenceData.evidenceType} - ${evidenceData.description}`,
  });
  return { evidence };
}

export async function updateEvidence(caseId: string, evidenceId: string, data: Rec) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  const evidence = await casesStore.updateEvidence(caseId, evidenceId, data);
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "UPDATE",
    notes: `Evidence updated: ${evidenceId}`,
  });
  return { evidence };
}

export async function deleteEvidence(caseId: string, evidenceId: string) {
  const u = user();
  const c = await casesStore.findById(caseId);
  if (!c) throw new Error("Case not found");
  await casesStore.deleteEvidence(caseId, evidenceId);
  await auditStore.append({
    caseId,
    caseNumber: c.caseNumber,
    userId: u.userId,
    userRole: u.role,
    userName: u.username,
    action: "DELETE",
    notes: `Evidence removed: ${evidenceId}`,
  });
  return { success: true };
}

// =============================================================================
// Users Management
// =============================================================================

export async function getUsers() {
  return { users: await usersStore.findAll() };
}

export async function createUser(data: Rec) {
  const existing = await usersStore.findByUsername(data.username);
  if (existing) throw new Error("Username already exists");
  if (data.email) {
    const existingEmail = await usersStore.findByEmail(data.email);
    if (existingEmail) throw new Error("Email already exists");
  }
  const u = await usersStore.create({
    ...data,
    passwordHash: data.password, // Plaintext for client-side demo
  });
  return { user: u };
}
