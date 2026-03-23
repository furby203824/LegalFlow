import type { UnitDef } from "@/types";

// =============================================================================
// Unit Hierarchy
// Company → Battalion → Regiment → (higher HQ / Installation)
//
// - Company: Capt and below. Has own certifier + reviewer. Appeals to Battalion.
// - Battalion/Squadron: Maj and above. Has own certifier + reviewer. Appeals to Regiment.
// - Regiment/Group: Maj and above. Has own certifier + reviewer. Appeals to higher.
//   Does NOT initiate NJP at this level; only receives appeals from subordinate units.
// - Installation: Does NOT initiate NJP. Only receives appeals if it is the
//   next higher HQ for a subordinate unit.
// =============================================================================

export const UNITS: UnitDef[] = [
  // --- Company level ---
  {
    id: "unit-aco1bn5mar",
    name: "Alpha Co, 1st Bn, 5th Marines",
    echelon: "COMPANY",
    parentUnitId: "unit-1bn5mar",
    canInitiateNjp: true,
  },
  // --- Battalion level ---
  {
    id: "unit-1bn5mar",
    name: "1st Bn, 5th Marines",
    echelon: "BATTALION",
    parentUnitId: "unit-5mar",
    canInitiateNjp: true,
  },
  // --- Regiment level ---
  {
    id: "unit-5mar",
    name: "5th Marine Regiment",
    echelon: "REGIMENT",
    parentUnitId: null,
    canInitiateNjp: false,
  },
];

/** Look up a unit by ID */
export function getUnit(unitId: string): UnitDef | undefined {
  return UNITS.find((u) => u.id === unitId);
}

/** Get the parent (appeal-to) unit for a given unit */
export function getParentUnit(unitId: string): UnitDef | undefined {
  const unit = getUnit(unitId);
  if (!unit?.parentUnitId) return undefined;
  return getUnit(unit.parentUnitId);
}

/** Get all ancestor unit IDs (parent, grandparent, etc.) */
export function getAncestorUnitIds(unitId: string): string[] {
  const ids: string[] = [];
  let current = getUnit(unitId);
  while (current?.parentUnitId) {
    ids.push(current.parentUnitId);
    current = getUnit(current.parentUnitId);
  }
  return ids;
}

/** Get all descendant unit IDs (children, grandchildren, etc.) */
export function getDescendantUnitIds(unitId: string): string[] {
  const ids: string[] = [];
  const children = UNITS.filter((u) => u.parentUnitId === unitId);
  for (const child of children) {
    ids.push(child.id);
    ids.push(...getDescendantUnitIds(child.id));
  }
  return ids;
}

/** Check if unitA is a direct parent (appeal authority) for unitB */
export function isDirectParent(parentUnitId: string, childUnitId: string): boolean {
  const child = getUnit(childUnitId);
  return child?.parentUnitId === parentUnitId;
}

/** Check if unitA is an ancestor of unitB */
export function isAncestor(ancestorUnitId: string, descendantUnitId: string): boolean {
  return getAncestorUnitIds(descendantUnitId).includes(ancestorUnitId);
}
