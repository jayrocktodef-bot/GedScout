/**
 * GED Scout - GEDCOM 5.5.1 Serializer
 * Exports cleaned and validated GEDCOM files with machine-readable metadata and audit log.
 */

import { FactEvent, GedcomDocument, Individual } from '../types';

export function serializeGedcomDocument(
  doc: GedcomDocument,
  options?: {
    includeAuditNote?: boolean;
    auditLogSummary?: string;
  }
): string {
  const lines: string[] = [];

  // 1. Header
  lines.push('0 HEAD');
  lines.push('1 SOUR GED_SCOUT');
  lines.push('2 NAME GED Scout');
  lines.push('2 VERS 1.0.0');
  lines.push('2 CORP Written In The Genome / GED Scout');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  const now = new Date();
  const day = now.getDate();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = months[now.getMonth()];
  const yr = now.getFullYear();
  lines.push(`1 DATE ${day} ${mon} ${yr}`);

  if (options?.includeAuditNote && options.auditLogSummary) {
    lines.push('1 NOTE GED Scout Cleaned Export.');
    const logLines = options.auditLogSummary.split('\n');
    for (const l of logLines) {
      if (l.trim()) {
        lines.push(`2 CONT ${l}`);
      }
    }
  }

  // 2. Individuals
  for (const ind of Object.values(doc.individuals)) {
    lines.push(`0 ${ind.id} INDI`);

    // Name
    const rawName = formatGedcomName(ind);
    lines.push(`1 NAME ${rawName}`);
    if (ind.givenName) lines.push(`2 GIVN ${ind.givenName}`);
    if (ind.surname) lines.push(`2 SURN ${ind.surname}`);

    // Sex
    if (ind.sex) {
      lines.push(`1 SEX ${ind.sex}`);
    }

    // Birth
    if (ind.birth) {
      serializeFactEvent('BIRT', ind.birth, lines);
    }

    // Death
    if (ind.death) {
      serializeFactEvent('DEAT', ind.death, lines);
    }

    // Burial
    if (ind.burial) {
      serializeFactEvent('BURI', ind.burial, lines);
    }

    // Other events
    for (const ev of ind.events) {
      serializeFactEvent(ev.tag, ev, lines);
    }

    // Family links
    for (const famcId of ind.famc) {
      if (doc.families[famcId]) {
        lines.push(`1 FAMC ${famcId}`);
      }
    }
    for (const famsId of ind.fams) {
      if (doc.families[famsId]) {
        lines.push(`1 FAMS ${famsId}`);
      }
    }

    // Sources
    for (const sId of ind.sources) {
      lines.push(`1 SOUR ${sId}`);
    }

    // Notes
    for (const note of ind.notes) {
      lines.push(`1 NOTE ${note}`);
    }

    // Custom tags
    for (const ct of ind.customTags) {
      lines.push(`1 ${ct.tag}${ct.value ? ` ${ct.value}` : ''}`);
    }
  }

  // 3. Families
  for (const fam of Object.values(doc.families)) {
    lines.push(`0 ${fam.id} FAM`);
    if (fam.husb && doc.individuals[fam.husb]) {
      lines.push(`1 HUSB ${fam.husb}`);
    }
    if (fam.wife && doc.individuals[fam.wife]) {
      lines.push(`1 WIFE ${fam.wife}`);
    }
    for (const chId of fam.children) {
      if (doc.individuals[chId]) {
        lines.push(`1 CHIL ${chId}`);
      }
    }
    if (fam.marriage) {
      serializeFactEvent('MARR', fam.marriage, lines);
    }
    if (fam.divorce) {
      serializeFactEvent('DIV', fam.divorce, lines);
    }
    for (const ev of fam.events) {
      serializeFactEvent(ev.tag, ev, lines);
    }
    for (const sId of fam.sources) {
      lines.push(`1 SOUR ${sId}`);
    }
    for (const n of fam.notes) {
      lines.push(`1 NOTE ${n}`);
    }
    for (const ct of fam.customTags) {
      lines.push(`1 ${ct.tag}${ct.value ? ` ${ct.value}` : ''}`);
    }
  }

  // 4. Sources
  for (const src of Object.values(doc.sources)) {
    lines.push(`0 ${src.id} SOUR`);
    if (src.title) lines.push(`1 TITL ${src.title}`);
    if (src.author) lines.push(`1 AUTH ${src.author}`);
    if (src.publication) lines.push(`1 PUBL ${src.publication}`);
    if (src.repo) lines.push(`1 REPO ${src.repo}`);
    for (const n of src.notes || []) {
      lines.push(`1 NOTE ${n}`);
    }
  }

  // 5. Notes
  for (const [nId, text] of Object.entries(doc.notes)) {
    lines.push(`0 ${nId} NOTE ${text}`);
  }

  // 6. Trailer
  lines.push('0 TRLR');
  lines.push('');

  return lines.join('\r\n');
}

function formatGedcomName(ind: Individual): string {
  if (ind.name && ind.name.includes('/')) return ind.name;
  if (ind.givenName && ind.surname) return `${ind.givenName} /${ind.surname}/`;
  if (ind.surname) return `/${ind.surname}/`;
  if (ind.givenName) return ind.givenName;
  return ind.name || 'Unknown';
}

function serializeFactEvent(tag: string, fact: FactEvent, lines: string[]): void {
  lines.push(`1 ${tag}`);
  if (fact.date) {
    lines.push(`2 DATE ${fact.date}`);
  }
  if (fact.place) {
    lines.push(`2 PLAC ${fact.place}`);
  }
  for (const s of fact.sources || []) {
    lines.push(`2 SOUR ${s}`);
  }
  for (const n of fact.notes || []) {
    lines.push(`2 NOTE ${n}`);
  }
}
