/**
 * GED Scout - Validation Engine (Isolated Module)
 * Stand-in for future Rust/WASM core.
 *
 * INPUT/OUTPUT INTERFACE SPECIFICATION:
 * - Pure functions with zero external runtime dependencies.
 * - Input: GedcomDocument (parsed lineage-linked tree)
 * - Output: Finding[] (flat list of structured integrity findings)
 *
 * Each finding item adheres to the contract:
 * {
 *   id: string;
 *   ruleId: string;
 *   ruleName: string;
 *   category: 'chronology' | 'lifespan' | 'duplicates' | 'structural' | 'citation';
 *   severity: 'error' | 'warning' | 'info';
 *   personId?: string;
 *   personName?: string;
 *   familyId?: string;
 *   secondaryPersonId?: string;
 *   secondaryPersonName?: string;
 *   explanation: string;
 *   evidence: Record<string, any>;
 *   suggestedFix: FixActionType;
 * }
 */

import { Finding, GedcomDocument, IntegrityReport } from '../types';
import {
  checkChronology,
  checkLifespans,
  checkDuplicates,
  checkStructural,
  checkCitationHygiene,
} from './rules';
import { calculateIntegrityScore } from './scoring';

export function runValidationEngine(doc: GedcomDocument): Finding[] {
  const chronologyFindings = checkChronology(doc);
  const lifespanFindings = checkLifespans(doc);
  const duplicateFindings = checkDuplicates(doc);
  const structuralFindings = checkStructural(doc);
  const citationFindings = checkCitationHygiene(doc);

  return [
    ...chronologyFindings,
    ...lifespanFindings,
    ...duplicateFindings,
    ...structuralFindings,
    ...citationFindings,
  ];
}

export function auditGedcomDocument(doc: GedcomDocument): IntegrityReport {
  const findings = runValidationEngine(doc);
  return calculateIntegrityScore(doc, findings);
}

export * from './rules';
export * from './scoring';
export * from './fuzzy';
