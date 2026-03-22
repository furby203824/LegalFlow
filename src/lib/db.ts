import fs from "fs";
import path from "path";

// =============================================================================
// JSON File Data Layer
// Replaces Prisma/SQLite with JSON files per LegalFlow JSON Data Structure v1.0
// Files: public/data/cases.json, users.json, audit.json
// =============================================================================

const DATA_DIR = path.join(process.cwd(), "public", "data");

function readJson<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJson<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// =============================================================================
// Cases Store
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseRecord = Record<string, any>;

export const casesStore = {
  findAll(): CaseRecord[] {
    return readJson<CaseRecord>("cases.json");
  },

  findById(id: string): CaseRecord | null {
    const cases = this.findAll();
    return cases.find((c) => c.id === id) || null;
  },

  findByNumber(caseNumber: string): CaseRecord | null {
    const cases = this.findAll();
    return cases.find((c) => c.caseNumber === caseNumber) || null;
  },

  findMany(filter?: (c: CaseRecord) => boolean): CaseRecord[] {
    const cases = this.findAll();
    if (!filter) return cases;
    return cases.filter(filter);
  },

  count(filter?: (c: CaseRecord) => boolean): number {
    return this.findMany(filter).length;
  },

  create(data: Partial<CaseRecord>): CaseRecord {
    const cases = this.findAll();
    const now = new Date().toISOString();
    const record: CaseRecord = {
      id: data.id || generateId("case"),
      createdAt: now.split("T")[0],
      updatedAt: now.split("T")[0],
      offenses: [],
      victims: [],
      punishment: null,
      appeal: null,
      item21Entries: [],
      signatures: [],
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
    writeJson("cases.json", cases);
    return record;
  },

  update(id: string, data: Partial<CaseRecord>): CaseRecord | null {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    cases[idx] = {
      ...cases[idx],
      ...data,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    writeJson("cases.json", cases);
    return cases[idx];
  },

  /**
   * Add or update a nested offense within a case
   */
  upsertOffense(caseId: string, offense: CaseRecord): void {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    const offenses = cases[idx].offenses || [];
    const oIdx = offenses.findIndex((o: CaseRecord) => o.id === offense.id);
    if (oIdx >= 0) {
      offenses[oIdx] = { ...offenses[oIdx], ...offense };
    } else {
      offenses.push(offense);
    }
    cases[idx].offenses = offenses;
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
  },

  /**
   * Add a victim to a case
   */
  addVictim(caseId: string, victim: CaseRecord): void {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (!cases[idx].victims) cases[idx].victims = [];
    cases[idx].victims.push(victim);
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
  },

  /**
   * Update punishment sub-object
   */
  upsertPunishment(caseId: string, punishment: CaseRecord): void {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].punishment) {
      cases[idx].punishment = { ...cases[idx].punishment, ...punishment };
    } else {
      cases[idx].punishment = { id: generateId("pun"), ...punishment };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
  },

  /**
   * Update appeal sub-object
   */
  upsertAppeal(caseId: string, appeal: CaseRecord): void {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (cases[idx].appeal) {
      cases[idx].appeal = { ...cases[idx].appeal, ...appeal };
    } else {
      cases[idx].appeal = { id: generateId("app"), ...appeal };
    }
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
  },

  /**
   * Add a signature record
   */
  addSignature(caseId: string, signature: CaseRecord): void {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;
    if (!cases[idx].signatures) cases[idx].signatures = [];
    cases[idx].signatures.push({ id: generateId("sig"), createdAt: new Date().toISOString(), ...signature });
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
  },

  /**
   * Add an Item 21 entry
   */
  addItem21Entry(caseId: string, entry: CaseRecord): CaseRecord {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error("Case not found");
    if (!cases[idx].item21Entries) cases[idx].item21Entries = [];
    const newEntry = { id: generateId("e21"), createdAt: new Date().toISOString(), ...entry };
    cases[idx].item21Entries.push(newEntry);
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
    return newEntry;
  },

  /**
   * Update an Item 21 entry
   */
  updateItem21Entry(caseId: string, entryId: string, data: Partial<CaseRecord>): CaseRecord | null {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return null;
    const entries = cases[idx].item21Entries || [];
    const eIdx = entries.findIndex((e: CaseRecord) => e.id === entryId);
    if (eIdx === -1) return null;
    entries[eIdx] = { ...entries[eIdx], ...data };
    cases[idx].item21Entries = entries;
    cases[idx].updatedAt = new Date().toISOString().split("T")[0];
    writeJson("cases.json", cases);
    return entries[eIdx];
  },

  /**
   * Add a document record
   */
  addDocument(caseId: string, doc: CaseRecord): CaseRecord {
    const cases = this.findAll();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) throw new Error("Case not found");
    if (!cases[idx].documents) cases[idx].documents = [];

    // Mark existing current docs of same type as superseded
    const docs = cases[idx].documents;
    const existingIdx = docs.findIndex(
      (d: CaseRecord) => d.documentType === doc.documentType && d.isCurrent
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
    writeJson("cases.json", cases);
    return newDoc;
  },
};

// =============================================================================
// Users Store
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserRecord = Record<string, any>;

export const usersStore = {
  findAll(): UserRecord[] {
    return readJson<UserRecord>("users.json");
  },

  findById(id: string): UserRecord | null {
    return this.findAll().find((u) => u.id === id) || null;
  },

  findByUsername(username: string): UserRecord | null {
    return this.findAll().find((u) => u.username === username) || null;
  },

  findByEmail(email: string): UserRecord | null {
    return this.findAll().find((u) => u.email === email) || null;
  },

  findByEdipi(edipi: string): UserRecord | null {
    return this.findAll().find((u) => u.edipi === edipi) || null;
  },

  findFirst(filter: (u: UserRecord) => boolean): UserRecord | null {
    return this.findAll().find(filter) || null;
  },

  findMany(filter?: (u: UserRecord) => boolean): UserRecord[] {
    const users = this.findAll();
    return filter ? users.filter(filter) : users;
  },

  create(data: Partial<UserRecord>): UserRecord {
    const users = this.findAll();
    const now = new Date().toISOString();
    const record: UserRecord = {
      id: data.id || generateId("user"),
      createdAt: now,
      updatedAt: now,
      isActive: true,
      lastLogin: null,
      ...data,
    };
    users.push(record);
    writeJson("users.json", users);
    return record;
  },

  update(id: string, data: Partial<UserRecord>): UserRecord | null {
    const users = this.findAll();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data, updatedAt: new Date().toISOString() };
    writeJson("users.json", users);
    return users[idx];
  },
};

// =============================================================================
// Audit Store
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditRecord = Record<string, any>;

const MAX_AUDIT_ENTRIES = 500;

export const auditStore = {
  findAll(): AuditRecord[] {
    return readJson<AuditRecord>("audit.json");
  },

  findByCaseId(caseId: string): AuditRecord[] {
    return this.findAll().filter((a) => a.caseId === caseId);
  },

  append(entry: Partial<AuditRecord>): AuditRecord {
    const logs = this.findAll();
    const record: AuditRecord = {
      id: generateId("audit"),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.push(record);
    // Trim to max entries
    const trimmed = logs.length > MAX_AUDIT_ENTRIES
      ? logs.slice(logs.length - MAX_AUDIT_ENTRIES)
      : logs;
    writeJson("audit.json", trimmed);
    return record;
  },
};

// =============================================================================
// Helper: generate case-compatible view with Prisma-like nested structures
// Used by routes that expect Prisma-style includes
// =============================================================================

export function caseWithIncludes(c: CaseRecord): CaseRecord {
  if (!c) return c;

  // Build an "accused" sub-object from flat case fields
  const accused = {
    id: c.accusedEdipi || c.id,
    lastName: c.accusedLastName,
    firstName: c.accusedFirstName,
    middleName: c.accusedMiddleName || null,
    rank: c.accusedRank,
    grade: c.accusedGrade,
    edipi: c.accusedEdipi,
    unitFullString: c.unitFullString || c.accusedUnit || "",
    component: c.component,
  };

  // Build unit sub-object
  const unit = {
    unitName: c.unitName || c.unitFullString || "",
    unitAbbreviation: c.unitAbbreviation || "",
    unitFullString: c.unitFullString || "",
  };

  // Map JSON-spec nested fields to Prisma-compatible names
  return {
    ...c,
    accused,
    unit,
    punishmentRecord: c.punishment || null,
    appealRecord: c.appeal || null,
    signatures: c.signatures || [],
    offenses: (c.offenses || []).map((o: CaseRecord) => ({
      ...o,
      victims: (c.victims || []).filter((v: CaseRecord) => v.victimLetter === o.offenseLetter || v.offenseId === o.id),
    })),
    item21Entries: (c.item21Entries || []).sort(
      (a: CaseRecord, b: CaseRecord) => (a.entrySequence || 0) - (b.entrySequence || 0)
    ),
    documents: (c.documents || []).filter((d: CaseRecord) => d.isCurrent),
    auditLogs: auditStore.findByCaseId(c.id).slice(-50).reverse(),
    suspensionMonitor: c.punishment?.suspensionStatus === "ACTIVE"
      ? {
          suspensionStart: c.punishment.suspensionStartDate,
          suspensionEnd: c.punishment.suspensionEndDate,
          suspendedPunishment: c.punishment.suspensionPunishment,
          monitorStatus: "ACTIVE",
        }
      : null,
    vacationRecordsAsParent: c.vacationRecordsAsParent || [],
    remedialActions: c.remedialActions || [],
  };
}
