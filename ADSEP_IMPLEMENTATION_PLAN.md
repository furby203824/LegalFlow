# ADSEP Implementation Plan — LegalFlow / CLA Modernization

## Goal
Extend LegalFlow to support ADSEP (Administrative Separation) packages alongside the existing NJP workflow. The ADSEP module will mirror the existing CLA system's data model and workflow, but with a modernized UI using our existing design system (phase tracker, action panels, card-based layout).

---

## Phase 1: Data Model & Types

### 1A. Add ADSEP types to `src/types/index.ts`

**New enums/constants:**
- `AdsepPackageStatus`: `DRAFT`, `PRE_NOTIFICATION`, `POST_NOTIFICATION`, `ROUTED_TO_LSSS`, `BOARD_PENDING`, `BOARD_COMPLETE`, `SEPARATION_PENDING`, `CLOSED`
- `AdsepPhase`: `PERSONNEL_DATA`, `SEPARATION_BASES`, `NOTIFICATION`, `BOARD`, `POST_BOARD`, `FINAL_ACTION`
- `SeparationBasis` lookup table (MCO 1900 paragraphs 6202–6210.7) with:
  - `paragraphNumber`, `generalBasis`, `specificBasis`, `leastFavorableCharacterization`, `minSeparatingAuthority`, `mandatoryProcessing`, `counselingRequired`
- `ConfinementCustodyType`: `MILITARY_BRIG`, `IHCA`, `IHFA`
- `BoardEligibility`: `BOARD_REQUESTED`, `WAIVED_RIGHTS`
- `DaysToSeparation`: `5_ACTIVE`, `20_RESERVE`, `30_OCONUS`
- `LsssLocation` list (LSSS NAT CAP REG, LSST QUANTICO, LSSS PACIFIC, etc.)

**New type: `AdsepPackage`**
```
id, packageNumber (PKG-YYYY-NNNN)
status: AdsepPackageStatus
currentPhase: AdsepPhase
createdAt, updatedAt, initiatedById

// Respondent (accused Marine)
respondent: {
  lastName, firstName, middleName
  rank, grade, edipi
  serviceBranch, component (ACTIVE/SMCR/IRR)
}

// Assigned Command
assignedCommand: {
  ruc, mcc, name, city, state
  billet, primaryMos, dateOfRank
}

// Initiating Command & Separation Authority (strings)
initiatingCommand, separationAuthority

// Duty Status
dutyStatus: {
  confinement: boolean
  confinementCustodyType?: ConfinementCustodyType
  unauthorizedAbsence: boolean
}

// Home Address
respondentAddress: {
  street, zipCode, homePhone, workPhone
}

// Component Code
componentCode: { active?: string, reserve?: string }

// Contract Expiration
contractExpiration: {
  active?: string, reserve?: string, endOfActiveService?: string
}

// Record Status
recordStatus: {
  active?: number, reserve?: number
  payEntryBaseDate?, dateOfBirth?
  strengthCategory?, citizenship?
  promotionRestriction?, promotionRestrictionTermDate?
  dutyLimitation?, dutyLimitationExpirationDate?
}

// Separation Bases (max 2)
separationBases: Array<{
  isPrimary: boolean
  paragraphNumber: string
  generalBasis, specificBasis
  subCategory?: string
  leastFavorableCharacterization: string
  mco1900Paragraph: string
  minSeparatingAuthority: string
  mandatoryProcessing: boolean
  counselingRequired: boolean
  factualBasis: string (max 2000 chars)
}>

// General Info
dateOfIncident?: string
received6105Counseling: boolean

// Notification / Board
board: {
  submittedStatement: boolean
  boardEligibility?: BoardEligibility
  routeToLsss?: string (LsssLocation)
  adsepPocName?, adsepPocPhone?
  boardComplete: boolean
}

// Retirement / IRR
retirementEligible, retirementRequested: boolean
transferToIrr: {
  resNonObligor, reqTrIrr, irrTransferApproved: boolean
}
daysToSeparation?: DaysToSeparation

// Documents (file upload tracking)
documents: Array<{
  id, documentType: string
  category: 'ALL_PACKAGES' | 'BASIS_SPECIFIC' | 'PRE_BOARD' | 'POST_BOARD'
  required: boolean
  fileName?, uploadedAt?, uploadedBy?
  status: 'NOT_UPLOADED' | 'UPLOADED'
}>

// Comments
comments: Array<{
  id, text, createdAt, createdBy
}>

// Package Routing
packageRouting: Array<{
  id, fromRole, toRole, routedAt, comment?
}>

// EAS/RECC date
easReccDate?: string
reviewed: boolean
```

### 1B. Add ADSEP store to `src/lib/db.ts`
- `adsepStore` with CRUD methods parallel to `casesStore`
- New JSON file: `public/data/adsep-packages.json`

### 1C. Add ADSEP API service to `src/services/adsep-api.ts`
- `getAdsepDashboard()` — stats + pending actions
- `getAdsepPackages(filters)` — list with filtering
- `getAdsepPackage(id)` — single package
- `createAdsepPackage(data)` — initiation
- `updateAdsepPackage(id, data)` — field updates (Personnel Data, Sep Bases, etc.)
- `routePackage(id, destination)` — routing actions
- `uploadDocument(id, docType, file)` — document upload tracking
- `addComment(id, text)` — board comments

---

## Phase 2: Navigation & Routing

### 2A. Update `AppShell.tsx` sidebar
Add an **ADSEP section** to the sidebar navigation (similar to CLA's left menu):
- **ADSEP Menu**
  - ADSEP Preparer → Initiate ADSEP Package (`/adsep/new`)
  - Available Packages (`/adsep`)
- **References** (links)
  - Separation Basis Checklists
  - Separation Manual
  - MCO 5800.16
- **Forms** (download links)
  - Privacy Act Statement for Respondent
  - Appointment of Admin Board
  - Summarized Record of Board Hearing
  - RLS Form (NAVMC-11411)

### 2B. Add new pages
- `/src/app/adsep/page.tsx` — Package list (dashboard table)
- `/src/app/adsep/new/page.tsx` — Initiate ADSEP Package form
- `/src/app/adsep/view/page.tsx` — Package detail with tabbed interface

---

## Phase 3: Package List Page (`/adsep/page.tsx`)

Modernized version of CLA's "Available Packages" table:
- **Columns**: Pkg ID (link), EDIPI, Name, Package Status (filterable), Separation Authority, Unit/Org, Specific Separation Basis, Reviewed, EAS/RECC
- **Features**: Column sorting, per-column filter inputs, pagination, CSV export button
- **Status badges** using our design system colors
- **EAS/RECC** date highlighting (red if overdue, like CLA shows)

---

## Phase 4: Initiate ADSEP Package (`/adsep/new/page.tsx`)

Minimal form to create a new package:
- Respondent: Name, Rank/Grade, EDIPI, Service Branch, Component
- Initiating Command, Separation Authority
- Creates package in `DRAFT` status, `PERSONNEL_DATA` phase

---

## Phase 5: Package Detail View (`/adsep/view/page.tsx`)

### Layout (matches our existing case view pattern)
- **Header**: Package ID, Respondent name, Status badge, Phase tracker
- **Phase Tracker**: Personnel Data → Sep Bases → Notification → Board → Post-Board → Final Action
- **Tabbed content area** with 4 tabs:

### Tab 1: Personnel Data
Fieldset-based form matching CLA:
- **Package Header** (read-only banner): Package ID, Respondent, Package Routing, Status, EDIPI, Initiating Command, Grade, Separation Authority, Component Code
- **Assigned Command** fieldset: RUC, MCC, City, State, Name, Billet, Primary MOS, Rank, Date of Rank, Component
- **Duty Status** fieldset: Confinement (Yes/No) → custody type sub-options if Yes (Brig/IHCA/IHFA with validation), UA (Yes/No)
- **Respondent's Home Address**: Street, Zip, Home Phone, Work Phone
- **Component Code**: Active, Reserve
- **Expiration of Current Contract**: Active, Reserve, End of Active Service
- **Record Status**: Active/Reserve counts, Pay Entry Base Date, DOB, Strength Category, Citizenship, Promotion Restriction/Term Date, Duty Limitation/Expiration Date

### Tab 2: Separation Bases
- **General Information** fieldset: Date of Incident (date picker), Rec'd Req'd 6105 Counseling (checkbox)
- **Separation Bases** section (max 2):
  - "Add Separation Basis" button → opens picker modal
  - Per basis: General, Specific, Sub Category, Least Favorable Characterization, MCO 1900 Paragraph, Min Separating Authority, Mandatory Processing, Counseling Req'd
  - "Remove Separation Basis" button
- **Separation Basis Picker Modal**: Table of MCO 1900 paragraphs (6202–6210.7) with Paragraph Number, General Basis, Specific Basis — clickable rows
- **Factual Basis** textarea (2000 char limit with counter)

### Tab 3: Notification
Split into sections:

**Document Uploads — All Packages:**
- List of universal documents (required marked with \*) with file upload per row
- Documents: Signed Notification, AOR, BCNR/NDRB, Certified Mail, Affidavit of Service, Returned Envelopes, SGLI Notification/Termination, Character Statements, Statement of Marine, SRB Pages, Victim Notified, MCTFS/3270 Pages

**Document Uploads — Basis-Specific:**
- Dynamically shown based on selected separation basis (e.g., Drug Abuse 6210.5 shows: Naval Message, Drug Ledger, Chain of Custody, Page 11, SACC screening, Gun Control Act Counseling)

**Pre-Board Documents:**
- Request for Legal Services (RLS), Supporting Evidence

**Post-Board Documents:**
- Status-only list (no upload): Privacy Act Statement, Gov't Exhibits, Respondent Exhibits, Notice of Board Hearing, Appointing Order, Minority Report, Summarized Record, Findings & Recommendations, LSSS Misc

**Board Section:**
- Date of Incident, Submitted Statement (Y/N)
- Board Eligibility: Board Requested / Waived Rights
- Board Setup: Route to LSSS/LSST dropdown, ADSEP POC Name/Phone
- Comments History + New Comments textarea
- Board Complete (Y/N)

**Retirement Request:** Eligible/Requested checkboxes
**Transfer to IRR:** Res Non-Obligor, Req TR IRR, IRR Transfer Approved
**Days to Separation:** Dropdown (5 Active, 20 Reserve, 30 OCONUS)

### Tab 4: Tracking History
- Timeline/audit log of all package actions
- Each entry: timestamp, user, action description
- Based on `packageRouting` + audit entries

### Action Buttons (bottom bar or right panel)
- Previous / Next (tab navigation)
- Save & Close
- Return for Re-notification
- Route to Legal Services
- Phase-appropriate actions

---

## Phase 6: Separation Basis Reference Data

### New file: `src/lib/separation-bases.ts`
Complete lookup table of MCO 1900 paragraphs:

| Paragraph | General Basis | Specific Basis |
|-----------|--------------|----------------|
| 6202 | Change in Service Obligation | Change in Service Obligation |
| 6203.1 | Convenience of the Government | Parenthood |
| 6203.2 | Convenience of the Government | Condition Not a Disability |
| 6203.4 | Convenience of the Government | Action in Lieu of Approved Punitive Discharge |
| 6203.5 | Convenience of the Government | Disenrolled Involuntarily from OCP |
| 6203.6 | Convenience of the Government | Failure/Disenrollment from Lateral School Seat |
| 6203.8 | Convenience of the Government | Physical Standards |
| 6204.2 | Defective Enlistment and Induction | Erroneous Enlistment/Reenlistment |
| 6204.3 | Defective Enlistment and Induction | Fraudulent Entry into the Marine Corps |
| 6205 | Entry Level Performance and Conduct | Entry Level Performance and Conduct |
| 6206 | Unsatisfactory Performance | Unsatisfactory Performance |
| 6209 | Alcohol Abuse Rehabilitation Failure | Alcohol Abuse Rehabilitation Failure |
| 6210 | Misconduct | Misconduct (Other) |
| 6210.2 | Misconduct | Minor Disciplinary Infractions |
| 6210.3 | Misconduct | Pattern of Misconduct |
| 6210.5 | Misconduct | Drug Abuse |
| 6210.6 | Misconduct | Commission of a Serious Offense |
| 6210.7 | Misconduct | Civilian Conviction |

Each entry also includes: leastFavorableCharacterization, minSeparatingAuthority, mandatoryProcessing, counselingRequired.

### Basis-specific document requirements
Map each paragraph to its required documents (e.g., 6210.5 Drug Abuse requires Naval Message, Drug Ledger, Chain of Custody, SACC screening).

---

## Phase 7: LSSS/LSST Locations Reference Data

### New constant in types or separate file
```
LSSS_LOCATIONS = [
  "LSSS NAT CAP REG",
  "LSST QUANTICO",
  "LSSS PACIFIC",
  "LSST FOSTER",
  "LSST KANEOHE BAY",
  "LSSS EAST",
  "LSST CAMLEJ",
  "LSST CHERRY PT",
  // ... additional locations
]
```

---

## Implementation Order

1. **Types & Data Model** (Phase 1) — Foundation for everything
2. **Separation Basis Reference Data** (Phase 6) — Needed by forms
3. **LSSS Locations** (Phase 7) — Needed by Notification tab
4. **DB Store & API** (Phase 1B, 1C) — Data layer
5. **Navigation & Routes** (Phase 2) — App shell updates
6. **Package List** (Phase 3) — Entry point
7. **Initiate Package** (Phase 4) — Create new packages
8. **Package Detail: Personnel Data** (Phase 5, Tab 1) — First tab
9. **Package Detail: Separation Bases** (Phase 5, Tab 2) — Second tab
10. **Package Detail: Notification** (Phase 5, Tab 3) — Third tab (largest)
11. **Package Detail: Tracking History** (Phase 5, Tab 4) — Audit trail
12. **Action buttons & routing** (Phase 5, Actions) — Workflow actions

---

## Files to Create
- `src/types/adsep.ts` — ADSEP-specific types
- `src/lib/separation-bases.ts` — MCO 1900 reference data
- `src/services/adsep-api.ts` — ADSEP business logic
- `src/app/adsep/page.tsx` — Package list
- `src/app/adsep/new/page.tsx` — Initiate package
- `src/app/adsep/view/page.tsx` — Package detail
- `src/components/adsep/PackageHeader.tsx` — Reusable header banner
- `src/components/adsep/PersonnelDataTab.tsx` — Tab 1
- `src/components/adsep/SeparationBasesTab.tsx` — Tab 2
- `src/components/adsep/SeparationBasisPicker.tsx` — Modal picker
- `src/components/adsep/NotificationTab.tsx` — Tab 3
- `src/components/adsep/DocumentUploadSection.tsx` — Upload rows
- `src/components/adsep/BoardSection.tsx` — Board form
- `src/components/adsep/TrackingHistoryTab.tsx` — Tab 4

## Files to Modify
- `src/types/index.ts` — Export ADSEP types
- `src/lib/db.ts` — Add adsepStore
- `src/components/ui/AppShell.tsx` — Add ADSEP sidebar section
- `src/app/dashboard/page.tsx` — Add ADSEP stats (optional)
