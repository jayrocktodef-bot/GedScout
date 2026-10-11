/**
 * GED Scout - High-Performance GEDCOM 5.5 / 5.5.1 Parser
 * Resilient to uneven line endings, non-standard date phrases, CONC/CONT lines, and custom tags.
 */

import {
  FactEvent,
  Family,
  GedcomDocument,
  GedcomRawNode,
  Individual,
  SourceRecord,
} from '../types';
import { extractYear } from '../normalization/dateNormalizer';

interface RawLine {
  lineNumber: number;
  level: number;
  xref?: string;
  tag: string;
  value?: string;
}

export function parseGedcomString(gedcomContent: string): GedcomDocument {
  const lines = gedcomContent.split(/\r\n|\r|\n/);
  const parsedLines: RawLine[] = [];
  const warnings: Array<{ line?: number; message: string; tag?: string }> = [];

  // 1. Tokenize lines into level, xref, tag, value
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    // Pattern: Level (XREF)? TAG (VALUE)?
    // e.g., "0 @I1@ INDI" or "1 NAME John /Doe/" or "0 HEAD"
    const match = raw.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) {
      warnings.push({
        line: i + 1,
        message: `Skipped non-standard line: "${raw.slice(0, 50)}"`,
      });
      continue;
    }

    const level = parseInt(match[1], 10);
    const xref = match[2];
    const tag = match[3].toUpperCase();
    const value = match[4];

    parsedLines.push({
      lineNumber: i + 1,
      level,
      xref,
      tag,
      value,
    });
  }

  // 2. Build hierarchical nodes
  const rootNodes: GedcomRawNode[] = [];
  const nodeStack: Array<{ level: number; node: GedcomRawNode }> = [];

  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i];

    // Handle CONC and CONT tags attached to previous line
    if ((line.tag === 'CONC' || line.tag === 'CONT') && nodeStack.length > 0) {
      const top = nodeStack[nodeStack.length - 1].node;
      const appendVal = line.value || '';
      if (line.tag === 'CONT') {
        top.value = (top.value ? top.value + '\n' : '') + appendVal;
      } else {
        top.value = (top.value || '') + appendVal;
      }
      continue;
    }

    const newNode: GedcomRawNode = {
      level: line.level,
      tag: line.tag,
      xref: line.xref,
      value: line.value,
      children: [],
    };

    while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= line.level) {
      nodeStack.pop();
    }

    if (nodeStack.length === 0) {
      rootNodes.push(newNode);
    } else {
      nodeStack[nodeStack.length - 1].node.children.push(newNode);
    }

    nodeStack.push({ level: line.level, node: newNode });
  }

  // 3. Map into strongly-typed domain model
  const individuals: Record<string, Individual> = {};
  const families: Record<string, Family> = {};
  const sources: Record<string, SourceRecord> = {};
  const notes: Record<string, string> = {};
  const otherRawNodes: GedcomRawNode[] = [];
  const header: GedcomDocument['header'] = {
    rawLines: [],
  };

  for (const root of rootNodes) {
    if (root.tag === 'HEAD') {
      for (const child of root.children) {
        if (child.tag === 'SOUR') header.sourceApp = child.value;
        if (child.tag === 'GEDC') {
          const vers = child.children.find((c) => c.tag === 'VERS');
          if (vers) header.version = vers.value;
        }
        if (child.tag === 'CHAR') header.encoding = child.value;
        if (child.tag === 'DATE') header.date = child.value;
      }
      otherRawNodes.push(root);
      continue;
    }

    if (root.tag === 'TRLR') {
      continue; // End of file
    }

    if (root.tag === 'INDI') {
      const id = root.xref || `@I${Object.keys(individuals).length + 1}@`;
      const ind = parseIndividualNode(id, root);
      individuals[id] = ind;
      continue;
    }

    if (root.tag === 'FAM') {
      const id = root.xref || `@F${Object.keys(families).length + 1}@`;
      const fam = parseFamilyNode(id, root);
      families[id] = fam;
      continue;
    }

    if (root.tag === 'SOUR') {
      const id = root.xref || `@S${Object.keys(sources).length + 1}@`;
      const src = parseSourceNode(id, root);
      sources[id] = src;
      continue;
    }

    if (root.tag === 'NOTE') {
      const id = root.xref || `@N${Object.keys(notes).length + 1}@`;
      notes[id] = root.value || '';
      continue;
    }

    // Keep other top-level records (SUBM, REPO, etc.)
    otherRawNodes.push(root);
  }

  return {
    header,
    individuals,
    families,
    sources,
    notes,
    otherRawNodes,
    parserWarnings: warnings,
  };
}

function parseIndividualNode(id: string, root: GedcomRawNode): Individual {
  let name = '';
  let givenName = '';
  let surname = '';
  let sex: Individual['sex'] = '';
  let birth: FactEvent | undefined;
  let death: FactEvent | undefined;
  let burial: FactEvent | undefined;
  const events: FactEvent[] = [];
  const famc: string[] = [];
  const fams: string[] = [];
  const indSources: string[] = [];
  const indNotes: string[] = [];
  const customTags: Array<{ tag: string; value?: string }> = [];

  for (const child of root.children) {
    const tag = child.tag;

    if (tag === 'NAME') {
      name = child.value || '';
      for (const sub of child.children) {
        if (sub.tag === 'GIVN') givenName = sub.value || '';
        if (sub.tag === 'SURN') surname = sub.value || '';
      }
      if (!givenName && !surname && name) {
        const slashMatch = name.match(/^(.*?)(?:\/([^\/]*)\/)?(.*)$/);
        if (slashMatch) {
          givenName = slashMatch[1].trim();
          surname = slashMatch[2]?.trim() || '';
        }
      }
    } else if (tag === 'SEX') {
      const s = (child.value || '').trim().toUpperCase();
      if (s === 'M' || s === 'F' || s === 'U') {
        sex = s;
      }
    } else if (tag === 'BIRT') {
      birth = parseFactEvent('BIRT', 'Birth', child);
    } else if (tag === 'DEAT') {
      death = parseFactEvent('DEAT', 'Death', child);
    } else if (tag === 'BURI') {
      burial = parseFactEvent('BURI', 'Burial', child);
    } else if (tag === 'FAMC') {
      if (child.value) famc.push(child.value.trim());
    } else if (tag === 'FAMS') {
      if (child.value) fams.push(child.value.trim());
    } else if (tag === 'SOUR') {
      if (child.value) indSources.push(child.value.trim());
    } else if (tag === 'NOTE') {
      if (child.value) indNotes.push(child.value.trim());
    } else if (['CHR', 'BAPM', 'OCCU', 'RESI', 'GRAD', 'EMIG', 'IMMI', 'NATU', 'CENS'].includes(tag)) {
      events.push(parseFactEvent(tag, tag, child));
    } else if (tag.startsWith('_')) {
      customTags.push({ tag, value: child.value });
    }
  }

  return {
    id,
    name: name || `${givenName} /${surname}/`.trim() || 'Unknown',
    givenName,
    surname,
    sex,
    birth,
    death,
    burial,
    events,
    famc,
    fams,
    sources: indSources,
    notes: indNotes,
    customTags,
  };
}

function parseFamilyNode(id: string, root: GedcomRawNode): Family {
  let husb: string | undefined;
  let wife: string | undefined;
  const children: string[] = [];
  let marriage: FactEvent | undefined;
  let divorce: FactEvent | undefined;
  const events: FactEvent[] = [];
  const famSources: string[] = [];
  const famNotes: string[] = [];
  const customTags: Array<{ tag: string; value?: string }> = [];

  for (const child of root.children) {
    const tag = child.tag;
    if (tag === 'HUSB') husb = child.value?.trim();
    else if (tag === 'WIFE') wife = child.value?.trim();
    else if (tag === 'CHIL') {
      if (child.value) children.push(child.value.trim());
    } else if (tag === 'MARR') {
      marriage = parseFactEvent('MARR', 'Marriage', child);
    } else if (tag === 'DIV') {
      divorce = parseFactEvent('DIV', 'Divorce', child);
    } else if (tag === 'SOUR') {
      if (child.value) famSources.push(child.value.trim());
    } else if (tag === 'NOTE') {
      if (child.value) famNotes.push(child.value.trim());
    } else if (['ANUL', 'ENGA', 'MARB', 'MARC', 'MARL', 'MARS'].includes(tag)) {
      events.push(parseFactEvent(tag, tag, child));
    } else if (tag.startsWith('_')) {
      customTags.push({ tag, value: child.value });
    }
  }

  return {
    id,
    husb,
    wife,
    children,
    marriage,
    divorce,
    events,
    sources: famSources,
    notes: famNotes,
    customTags,
  };
}

function parseSourceNode(id: string, root: GedcomRawNode): SourceRecord {
  let title: string | undefined;
  let author: string | undefined;
  let publication: string | undefined;
  let repo: string | undefined;
  const notes: string[] = [];

  for (const child of root.children) {
    if (child.tag === 'TITL') title = child.value;
    else if (child.tag === 'AUTH') author = child.value;
    else if (child.tag === 'PUBL') publication = child.value;
    else if (child.tag === 'REPO') repo = child.value;
    else if (child.tag === 'NOTE') {
      if (child.value) notes.push(child.value);
    }
  }

  return { id, title, author, publication, repo, notes };
}

function parseFactEvent(tag: string, label: string, node: GedcomRawNode): FactEvent {
  let date: string | undefined;
  let place: string | undefined;
  const sources: string[] = [];
  const notes: string[] = [];

  for (const child of node.children) {
    if (child.tag === 'DATE') {
      date = child.value;
    } else if (child.tag === 'PLAC') {
      place = child.value;
    } else if (child.tag === 'SOUR') {
      if (child.value) sources.push(child.value);
    } else if (child.tag === 'NOTE') {
      if (child.value) notes.push(child.value);
    }
  }

  return {
    id: `${tag}_${Math.random().toString(36).substring(2, 9)}`,
    tag,
    label,
    date,
    parsedYear: extractYear(date),
    place,
    sources,
    notes,
    value: node.value,
  };
}
