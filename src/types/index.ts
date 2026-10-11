/**
 * GED Scout - Core Type Definitions
 * 100% Client-Side GEDCOM File Doctor & Tree Editor
 */

export interface GedcomRawNode {
  level: number;
  tag: string;
  xref?: string;
  value?: string;
  children: GedcomRawNode[];
}

export interface FactEvent {
  id: string;
  tag: string; // BIRT, DEAT, BURI, MARR, DIV, CHR, OCCU, RESI, etc.
  label: string;
  date?: string;
  parsedYear?: number;
  place?: string;
  sources?: string[];
  notes?: string[];
  value?: string;
}

export interface Individual {
  id: string; // e.g. "@I1@"
  name: string; // e.g. "John /Vance/"
  givenName: string; // e.g. "John"
  surname: string; // e.g. "Vance"
  namePrefix?: string;
  nameSuffix?: string;
  sex: 'M' | 'F' | 'U' | '';
  birth?: FactEvent;
  death?: FactEvent;
  burial?: FactEvent;
  events: FactEvent[]; // Other facts: OCCU, RESI, CHR, etc.
  famc: string[]; // Parent family XREFs e.g. ["@F1@"]
  fams: string[]; // Spouse family XREFs e.g. ["@F2@"]
  sources: string[]; // SOUR XREFs
  notes: string[];
  customTags: Array<{ tag: string; value?: string }>;
  rawLines?: string[];
}

export interface Family {
  id: string; // e.g. "@F1@"
  husb?: string; // Individual XREF
  wife?: string; // Individual XREF
  children: string[]; // Individual XREFs
  marriage?: FactEvent;
  divorce?: FactEvent;
  events: FactEvent[];
  sources: string[];
  notes: string[];
  customTags: Array<{ tag: string; value?: string }>;
}

export interface SourceRecord {
  id: string; // e.g. "@S1@"
  title?: string;
  author?: string;
  publication?: string;
  repo?: string;
  notes?: string[];
}

export interface GedcomDocument {
  header: {
    sourceApp?: string;
    version?: string;
    encoding?: string;
    date?: string;
    rawLines: string[];
  };
  individuals: Record<string, Individual>;
  families: Record<string, Family>;
  sources: Record<string, SourceRecord>;
  notes: Record<string, string>;
  otherRawNodes: GedcomRawNode[];
  parserWarnings: Array<{ line?: number; message: string; tag?: string }>;
}

export type Severity = 'error' | 'warning' | 'info';

export type FindingCategory =
  | 'chronology'
  | 'lifespan'
  | 'duplicates'
  | 'structural'
  | 'citation';

export type FixActionType =
  | 'edit-dates'
  | 'merge-duplicates'
  | 'normalize-date'
  | 'delete-person'
  | 'edit-person'
  | 'add-source'
  | 'relink-family'
  | 'inspect-person';

export interface Finding {
  id: string;
  ruleId: string;
  ruleName: string;
  category: FindingCategory;
  severity: Severity;
  personId?: string;
  personName?: string;
  familyId?: string;
  secondaryPersonId?: string;
  secondaryPersonName?: string;
  explanation: string;
  evidence: Record<string, any>;
  suggestedFix: FixActionType;
}

export interface IntegrityReport {
  score: number; // 0.0 to 10.0
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreBreakdown: {
    baseScore: number;
    errorPenalties: number;
    warningPenalties: number;
    infoPenalties: number;
    totalFindings: number;
    explanation: string[];
  };
  stats: {
    individualCount: number;
    familyCount: number;
    sourceCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  findings: Finding[];
}

export interface DuplicatePair {
  idA: string;
  idB: string;
  personA: Individual;
  personB: Individual;
  similarityScore: number; // 0 to 100
  matchReasons: string[];
  suggestedSurvivorId: string;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  actionType: 'delete' | 'merge' | 'normalize-date' | 'normalize-name' | 'edit' | 'batch-clean';
  summary: string;
  details: string[];
  affectedRecordIds: string[];
}

export interface HistoryState {
  past: Array<{ doc: GedcomDocument; logEntry: ChangeLogEntry }>;
  present: GedcomDocument;
  future: Array<{ doc: GedcomDocument; logEntry: ChangeLogEntry }>;
  changeLog: ChangeLogEntry[];
}
