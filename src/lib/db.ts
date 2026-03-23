"use client";

// =============================================================================
// Client-Side Data Store backed by GitHub Contents API
// Per LegalFlow JSON Data Structure v1.0
// =============================================================================

import { readJsonFile, writeJsonFile } from "./github";
import { computeYearsOfService } from "@/types";

const DATA_PATH = "public/data";

// In-memory caches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let casesCache: Record<string, any>[] | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let usersCache: Record<string, any>[] | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let auditCache: Record<string, any>[] | null = null;

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export function clearCaches() {
  casesCache = null;
  usersCache = null;
  auditCache = null;
}

// =============================================================================
// Cases Store
// =============================================================================

export const casesStore = {
  async load(): Promise<Rec[]> {
    if (casesCache) return casesCache;
    casesCache = await readJsonFile<Rec[]>(`${DATA_PATH}/cases.json`);
    return casesCache;
  },

  async save(): Promise<void> {
    if (!casesCache) return;
    await writeJsonFile(`${DATA_PATH}/cases.json`, casesCache);
  },

  async findAll(): Promise<Rec[]> {
    return this.load();
  },

  async findById(id: string): Promise<Rec | null> {
    const cases = await this.load();
    return cases.find((c) => c.id === id) || null;
  },

  async findByNumber(caseNumber: string): Promise<Rec | null> {
    const cases = await this.load();
    return cases.find((c) => c.caseNumber === caseNumber) || null;
  },

  async findMany(filter?: (c: Rec) => boolean): Promise<Rec[]> {
    const cases = await this.load();
    return filter ? cases.filter(filter) : cases;
  },

  async count(filter?: (c: Rec) => boolean): Promise<number> {
    return (await this.findMany(filter)).length;
  },

  async create(data: Partial<Rec>): Promise<Rec> {
    const cases = await this.load();
    const now = new Date().toISOString();
    const record: Rec = {
      id: data.id || generateId("case"),
      createdAt: now.split("T")[0],
      updatedAt: now.split("T")[0],
      offenses: [],
      victims: [],
      punishment: null,
      appeal: null,
      chargeSheet: null,
      hearingRecord: null,
      item21Entries: [],
      signatures: [],
      evidence: [],
      documents: [],
      remedialActions: [],
      vacationRecordsAsParent: [],
      flags: [],
      daysOpen: 0,
      nextAction: "Complete Item 2 - Rights advisement",
      nextActionOwner: "ACCUSED",
      isOverdue: false,
      ...data,
    };
    cases.push(record);
    casesCache = cases;
    await this.save();
    return record;
  },

  async update(id: string, data: Partial<Rec>): Promise<Rec | null> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    cases[idx] = {
      ...cases[idx],
      ...data,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    casesCache = cases;
    await this.save();
    return cases[idx];
  },

  async upsertPunishment(caseId: string, punishment: Rec): Promise<void> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].punishment) {
      cases[idx].punishment = { ...cases[idx].punishment, ...punishment };
    } else {
      cases[idx].punishment = { id: generateId("pun"), ...punishment };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
  },

  async upsertAppeal(caseId: string, appeal: Rec): Promise<void> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].appeal) {
      cases[idx].appeal = { ...cases[idx].appeal, ...appeal };
    } else {
      cases[idx].appeal = { id: generateId("app"), ...appeal };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
  },

  async upsertChargeSheet(caseId: string, chargeSheet: Rec): Promise<void> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].chargeSheet) {
      cases[idx].chargeSheet = { ...cases[idx].chargeSheet, ...chargeSheet };
    } else {
      cases[idx].chargeSheet = { id: generateId("cs"), ...chargeSheet };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
  },

  async upsertRightsAcknowledgement(caseId: string, rightsAcknowledgement: Rec): Promise<void> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].rightsAcknowledgement) {
      cases[idx].rightsAcknowledgement = { ...cases[idx].rightsAcknowledgement, ...rightsAcknowledgement };
    } else {
      cases[idx].rightsAcknowledgement = { id: generateId("ra"), ...rightsAcknowledgement };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
  },

  async upsertHearingRecord(caseId: string, hearingRecord: Rec): Promise<void> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].hearingRecord) {
      cases[idx].hearingRecord = { ...cases[idx].hearingRecord, ...hearingRecord };
    } else {
      cases[idx].hearingRecord = { id: generateId("hr"), ...hearingRecord };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
  },

  async addSignature(caseId: string, signature: Rec): Promise<void> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (!cases[idx].signatures) cases[idx].signatures = [];
    cases[idx].signatures.push({
      id: generateId("sig"),
      createdAt: new Date().toISOString(),
      ...signature,
    });
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
  },

  async addItem21Entry(caseId: string, entry: Rec): Promise<Rec> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error("Case not found");
    if (!cases[idx].item21Entries) cases[idx].item21Entries = [];
    const newEntry = { id: generateId("e21"), createdAt: new Date().toISOString(), ...entry };
    cases[idx].item21Entries.push(newEntry);
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
    return newEntry;
  },

  async updateItem21Entry(caseId: string, entryId: string, data: Partial<Rec>): Promise<Rec | null> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return null;
    const entries = cases[idx].item21Entries || [];
    const eIdx = entries.findIndex((e: Rec) => e.id === entryId);
    if (eIdx === -1) return null;
    entries[eIdx] = { ...entries[eIdx], ...data };
    cases[idx].item21Entries = entries;
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
    return entries[eIdx];
  },

  async addEvidence(caseId: string, evidence: Rec): Promise<Rec> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error("Case not found");
    if (!cases[idx].evidence) cases[idx].evidence = [];
    const newEvidence = { id: generateId("ev"), createdAt: new Date().toISOString(), ...evidence };
    cases[idx].evidence.push(newEvidence);
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
    return newEvidence;
  },

  async updateEvidence(caseId: string, evidenceId: string, data: Partial<Rec>): Promise<Rec | null> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return null;
    const evidence = cases[idx].evidence || [];
    const eIdx = evidence.findIndex((e: Rec) => e.id === evidenceId);
    if (eIdx === -1) return null;
    evidence[eIdx] = { ...evidence[eIdx], ...data, updatedAt: new Date().toISOString() };
    cases[idx].evidence = evidence;
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
    return evidence[eIdx];
  },

  async deleteEvidence(caseId: string, evidenceId: string): Promise<boolean> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return false;
    const evidence = cases[idx].evidence || [];
    const eIdx = evidence.findIndex((e: Rec) => e.id === evidenceId);
    if (eIdx === -1) return false;
    evidence.splice(eIdx, 1);
    cases[idx].evidence = evidence;
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
    return true;
  },

  async addDocument(caseId: string, doc: Rec): Promise<Rec> {
    const cases = await this.load();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error("Case not found");
    if (!cases[idx].documents) cases[idx].documents = [];
    const docs = cases[idx].documents;
    const existingIdx = docs.findIndex(
      (d: Rec) => d.documentType === doc.documentType && d.isCurrent
    );
    const newVersion = existingIdx >= 0 ? (docs[existingIdx].documentVersion || 1) + 1 : 1;
    const newId = generateId("doc");
    if (existingIdx >= 0) {
      docs[existingIdx].isCurrent = false;
      docs[existingIdx].supersededById = newId;
    }
    const newDoc = {
      id: newId,
      documentVersion: newVersion,
      isCurrent: true,
      createdAt: new Date().toISOString(),
      ...doc,
    };
    docs.push(newDoc);
    cases[idx].documents = docs;
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    casesCache = cases;
    await this.save();
    return newDoc;
  },
};

// =============================================================================
// Users Store
// =============================================================================

export const usersStore = {
  async load(): Promise<Rec[]> {
    if (usersCache) return usersCache;
    usersCache = await readJsonFile<Rec[]>(`${DATA_PATH}/users.json`);
    return usersCache;
  },

  async save(): Promise<void> {
    if (!usersCache) return;
    await writeJsonFile(`${DATA_PATH}/users.json`, usersCache);
  },

  async findAll(): Promise<Rec[]> {
    return this.load();
  },

  async findById(id: string): Promise<Rec | null> {
    return (await this.load()).find((u) => u.id === id) || null;
  },

  async findByUsername(username: string): Promise<Rec | null> {
    return (await this.load()).find((u) => u.username === username) || null;
  },

  async findByEmail(email: string): Promise<Rec | null> {
    return (await this.load()).find((u) => u.email === email) || null;
  },

  async findFirst(filter: (u: Rec) => boolean): Promise<Rec | null> {
    return (await this.load()).find(filter) || null;
  },

  async create(data: Partial<Rec>): Promise<Rec> {
    const users = await this.load();
    const now = new Date().toISOString();
    const record: Rec = {
      id: data.id || generateId("user"),
      createdAt: now,
      updatedAt: now,
      isActive: true,
      lastLogin: null,
      ...data,
    };
    users.push(record);
    usersCache = users;
    await this.save();
    return record;
  },

  async update(id: string, data: Partial<Rec>): Promise<Rec | null> {
    const users = await this.load();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data, updatedAt: new Date().toISOString() };
    usersCache = users;
    await this.save();
    return users[idx];
  },
};

// =============================================================================
// Audit Store
// =============================================================================

const MAX_AUDIT_ENTRIES = 500;

export const auditStore = {
  async load(): Promise<Rec[]> {
    if (auditCache) return auditCache;
    auditCache = await readJsonFile<Rec[]>(`${DATA_PATH}/audit.json`);
    return auditCache;
  },

  async save(): Promise<void> {
    if (!auditCache) return;
    await writeJsonFile(`${DATA_PATH}/audit.json`, auditCache);
  },

  async findByCaseId(caseId: string): Promise<Rec[]> {
    return (await this.load()).filter((a) => a.caseId === caseId);
  },

  async append(entry: Partial<Rec>): Promise<Rec> {
    const logs = await this.load();
    const record: Rec = {
      id: generateId("audit"),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.push(record);
    const trimmed = logs.length > MAX_AUDIT_ENTRIES
      ? logs.slice(logs.length - MAX_AUDIT_ENTRIES)
      : logs;
    auditCache = trimmed;
    await this.save();
    return record;
  },
};

// =============================================================================
// Case view helper - builds Prisma-compatible nested structure for UI
// =============================================================================

export function caseWithIncludes(c: Rec): Rec {
  if (!c) return c;

  const accused = {
    id: c.accusedEdipi || c.id,
    lastName: c.accusedLastName,
    firstName: c.accusedFirstName,
    middleName: c.accusedMiddleName || null,
    rank: c.accusedRank,
    grade: c.accusedGrade,
    edipi: c.accusedEdipi,
    dateOfBirth: c.accusedDateOfBirth || null,
    afadbd: c.accusedAfadbd || null,
    yearsOfService: c.accusedAfadbd
      ? computeYearsOfService(c.accusedAfadbd, c.njpDate || undefined)
      : null,
    serviceBranch: c.accusedServiceBranch || "USMC",
    unitFullString: c.unitFullString || c.accusedUnit || "",
    component: c.component,
  };

  const unit = {
    unitName: c.unitName || c.unitFullString || "",
    unitAbbreviation: c.unitAbbreviation || "",
    unitFullString: c.unitFullString || "",
  };

  return {
    ...c,
    accused,
    unit,
    punishmentRecord: c.punishment || null,
    appealRecord: c.appeal || null,
    chargeSheet: c.chargeSheet || null,
    hearingRecord: c.hearingRecord || null,
    signatures: c.signatures || [],
    offenses: (c.offenses || []).map((o: Rec) => ({
      ...o,
      victims: (c.victims || []).filter(
        (v: Rec) => v.victimLetter === o.offenseLetter || v.offenseId === o.id
      ),
    })),
    item21Entries: (c.item21Entries || []).sort(
      (a: Rec, b: Rec) => (a.entrySequence || 0) - (b.entrySequence || 0)
    ),
    evidence: (c.evidence || []).sort((a: Rec, b: Rec) => (a.createdAt || "").localeCompare(b.createdAt || "")),
    documents: (c.documents || []).filter((d: Rec) => d.isCurrent),
    vacationRecordsAsParent: c.vacationRecordsAsParent || [],
    remedialActions: c.remedialActions || [],
  };
}
