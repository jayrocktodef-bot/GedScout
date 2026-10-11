/**
 * GED Scout - Deletion Contract Engine
 * Graph-authoritative individual deletion with pointer repointing,
 * empty family detection, orphan attachment tracking, and branch-split graph analysis.
 */

import { ChangeLogEntry, Family, GedcomDocument, Individual, SourceRecord } from '../types';

export interface DeletionFamilyPointerImpact {
  familyId: string;
  role: 'HUSB' | 'WIFE' | 'CHIL';
  personId: string;
  personName: string;
  remainingSpouses: number;
  remainingChildren: number;
  description: string;
}

export interface DeletionIndividualLinkImpact {
  personId: string;
  personName: string;
  linkType: 'FAMC' | 'FAMS';
  familyId: string;
  description: string;
}

export interface DeletionEmptyFamilyImpact {
  familyId: string;
  description: string;
}

export interface DeletionMediaRecordImpact {
  id: string;
  tag: string;
  value?: string;
  personId: string;
  description: string;
}

export interface DeletionImpactAnalysis {
  targetPersonIds: string[];
  targetPersons: Individual[];
  affectedFamilyPointers: DeletionFamilyPointerImpact[];
  removedIndividualLinks: DeletionIndividualLinkImpact[];
  emptyFamilyRecords: DeletionEmptyFamilyImpact[];
  emptyFamilyIds: string[];
  orphanedSources: SourceRecord[];
  orphanedNotes: Array<{ id: string; text: string }>;
  orphanedMedia: DeletionMediaRecordImpact[];
  branchSplit: {
    willSplit: boolean;
    beforeComponentCount: number;
    afterComponentCount: number;
    warningMessage?: string;
  };
  totalAffectedRecordsCount: number;
}

export interface DeletionExecutionOptions {
  targetPersonIds: string[];
  cleanupEmptyFamilies: boolean;
  removeOrphanedAttachments?: boolean;
  removeSourceIds?: string[];
  removeNoteIds?: string[];
  removeMediaIds?: string[];
}

/**
 * Computes connected components count across the lineage graph
 */
export function countGraphComponents(
  doc: GedcomDocument,
  excludePersonIds: Set<string>
): number {
  const adj = new Map<string, Set<string>>();

  // Populate nodes for all non-excluded individuals
  for (const id of Object.keys(doc.individuals)) {
    if (!excludePersonIds.has(id)) {
      adj.set(id, new Set());
    }
  }

  // Connect individuals through families
  for (const fam of Object.values(doc.families)) {
    const members: string[] = [];
    if (fam.husb && !excludePersonIds.has(fam.husb)) members.push(fam.husb);
    if (fam.wife && !excludePersonIds.has(fam.wife)) members.push(fam.wife);
    for (const chId of fam.children) {
      if (!excludePersonIds.has(chId)) members.push(chId);
    }

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const u = members[i];
        const v = members[j];
        adj.get(u)?.add(v);
        adj.get(v)?.add(u);
      }
    }
  }

  // Count connected components with BFS
  const visited = new Set<string>();
  let components = 0;

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      components++;
      const queue = [node];
      visited.add(node);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = adj.get(curr);
        if (neighbors) {
          for (const next of neighbors) {
            if (!visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
          }
        }
      }
    }
  }

  return components;
}

/**
 * Pre-analyzes deletion impact according to Deletion Contract rules
 */
export function analyzeDeletionImpact(
  doc: GedcomDocument,
  targetPersonIds: string[]
): DeletionImpactAnalysis {
  const targetSet = new Set(targetPersonIds);
  const targetPersons = targetPersonIds
    .map((id) => doc.individuals[id])
    .filter(Boolean);

  const affectedFamilyPointers: DeletionFamilyPointerImpact[] = [];
  const removedIndividualLinks: DeletionIndividualLinkImpact[] = [];
  const emptyFamilyRecords: DeletionEmptyFamilyImpact[] = [];
  const emptyFamilyIds: string[] = [];

  // 1. Gather all FAMC and FAMS links on the deleted individuals
  for (const ind of targetPersons) {
    for (const famcId of ind.famc) {
      removedIndividualLinks.push({
        personId: ind.id,
        personName: ind.name,
        linkType: 'FAMC',
        familyId: famcId,
        description: `Individual ${ind.id} (${ind.name}): Remove parent link (FAMC ${famcId})`,
      });
    }
    for (const famsId of ind.fams) {
      removedIndividualLinks.push({
        personId: ind.id,
        personName: ind.name,
        linkType: 'FAMS',
        familyId: famsId,
        description: `Individual ${ind.id} (${ind.name}): Remove spouse/family link (FAMS ${famsId})`,
      });
    }
  }

  // 2. Gather all HUSB, WIFE, and CHIL pointers from FAM records
  for (const fam of Object.values(doc.families)) {
    let modified = false;
    const husbRemaining = fam.husb && !targetSet.has(fam.husb);
    const wifeRemaining = fam.wife && !targetSet.has(fam.wife);
    const childrenRemaining = fam.children.filter((ch) => !targetSet.has(ch)).length;
    const remainingSpouses = (husbRemaining ? 1 : 0) + (wifeRemaining ? 1 : 0);

    if (fam.husb && targetSet.has(fam.husb)) {
      modified = true;
      const pName = doc.individuals[fam.husb]?.name || fam.husb;
      affectedFamilyPointers.push({
        familyId: fam.id,
        role: 'HUSB',
        personId: fam.husb,
        personName: pName,
        remainingSpouses: wifeRemaining ? 1 : 0,
        remainingChildren: childrenRemaining,
        description: `Family ${fam.id}: Remove HUSB pointer to ${pName} (${fam.husb})`,
      });
    }
    if (fam.wife && targetSet.has(fam.wife)) {
      modified = true;
      const pName = doc.individuals[fam.wife]?.name || fam.wife;
      affectedFamilyPointers.push({
        familyId: fam.id,
        role: 'WIFE',
        personId: fam.wife,
        personName: pName,
        remainingSpouses: husbRemaining ? 1 : 0,
        remainingChildren: childrenRemaining,
        description: `Family ${fam.id}: Remove WIFE pointer to ${pName} (${fam.wife})`,
      });
    }
    for (const chId of fam.children) {
      if (targetSet.has(chId)) {
        modified = true;
        const pName = doc.individuals[chId]?.name || chId;
        affectedFamilyPointers.push({
          familyId: fam.id,
          role: 'CHIL',
          personId: chId,
          personName: pName,
          remainingSpouses,
          remainingChildren: childrenRemaining,
          description: `Family ${fam.id}: Remove CHIL pointer to ${pName} (${chId})`,
        });
      }
    }

    if (modified) {
      const totalRemaining = remainingSpouses + childrenRemaining;
      if (totalRemaining === 0) {
        emptyFamilyIds.push(fam.id);
        emptyFamilyRecords.push({
          familyId: fam.id,
          description: `Family ${fam.id} will be left with 0 spouses and 0 children (empty family)`,
        });
      }
    }
  }

  // Orphaned attachments: sources, notes, and media referenced ONLY by deleted individuals
  const sourcesReferencedByOthers = new Set<string>();
  const notesReferencedByOthers = new Set<string>();

  for (const ind of Object.values(doc.individuals)) {
    if (targetSet.has(ind.id)) continue;
    ind.sources.forEach((s) => sourcesReferencedByOthers.add(s));
    ind.notes.forEach((n) => notesReferencedByOthers.add(n));
    ind.birth?.sources?.forEach((s) => sourcesReferencedByOthers.add(s));
    ind.death?.sources?.forEach((s) => sourcesReferencedByOthers.add(s));
    ind.burial?.sources?.forEach((s) => sourcesReferencedByOthers.add(s));
    ind.events.forEach((ev) => ev.sources?.forEach((s) => sourcesReferencedByOthers.add(s)));
  }

  for (const fam of Object.values(doc.families)) {
    fam.sources.forEach((s) => sourcesReferencedByOthers.add(s));
    fam.notes.forEach((n) => notesReferencedByOthers.add(n));
    fam.marriage?.sources?.forEach((s) => sourcesReferencedByOthers.add(s));
    fam.divorce?.sources?.forEach((s) => sourcesReferencedByOthers.add(s));
    fam.events.forEach((ev) => ev.sources?.forEach((s) => sourcesReferencedByOthers.add(s)));
  }

  const orphanedSources: SourceRecord[] = [];
  const orphanedNotes: Array<{ id: string; text: string }> = [];
  const orphanedMedia: DeletionMediaRecordImpact[] = [];

  for (const ind of targetPersons) {
    const allIndSources = [
      ...ind.sources,
      ...(ind.birth?.sources || []),
      ...(ind.death?.sources || []),
      ...(ind.burial?.sources || []),
      ...ind.events.flatMap((e) => e.sources || []),
    ];
    for (const sId of allIndSources) {
      if (!sourcesReferencedByOthers.has(sId) && doc.sources[sId]) {
        if (!orphanedSources.find((s) => s.id === sId)) {
          orphanedSources.push(doc.sources[sId]);
        }
      }
    }

    for (const nId of ind.notes) {
      if (!notesReferencedByOthers.has(nId) && doc.notes[nId]) {
        if (!orphanedNotes.find((n) => n.id === nId)) {
          orphanedNotes.push({ id: nId, text: doc.notes[nId] });
        }
      }
    }

    for (const ct of ind.customTags || []) {
      if (['OBJE', '_PHOTO', '_FILE', '_IMAGE', '_MEDIA'].includes(ct.tag.toUpperCase())) {
        orphanedMedia.push({
          id: `${ind.id}_${ct.tag}`,
          tag: ct.tag,
          value: ct.value,
          personId: ind.id,
          description: `Media attachment ${ct.tag}: ${ct.value || 'Media file'} on ${ind.name}`,
        });
      }
    }
  }

  // Branch-split analysis
  const beforeComponentCount = countGraphComponents(doc, new Set());
  const afterComponentCount = countGraphComponents(doc, targetSet);

  const willSplit = afterComponentCount > beforeComponentCount;
  let warningMessage: string | undefined;
  if (willSplit) {
    warningMessage = `This deletion will split the tree into ${afterComponentCount} disconnected pieces (previously ${beforeComponentCount} connected tree).`;
  }

  const totalAffectedRecordsCount =
    targetPersons.length +
    affectedFamilyPointers.length +
    removedIndividualLinks.length +
    emptyFamilyIds.length +
    orphanedSources.length +
    orphanedNotes.length +
    orphanedMedia.length;

  return {
    targetPersonIds,
    targetPersons,
    affectedFamilyPointers,
    removedIndividualLinks,
    emptyFamilyRecords,
    emptyFamilyIds,
    orphanedSources,
    orphanedNotes,
    orphanedMedia,
    branchSplit: {
      willSplit,
      beforeComponentCount,
      afterComponentCount,
      warningMessage,
    },
    totalAffectedRecordsCount,
  };
}

/**
 * Executes graph deletion according to Deletion Contract rules
 */
export function executeDeletion(
  doc: GedcomDocument,
  options: DeletionExecutionOptions
): { newDoc: GedcomDocument; logEntry: ChangeLogEntry } {
  const targetSet = new Set(options.targetPersonIds);
  const analysis = analyzeDeletionImpact(doc, options.targetPersonIds);

  // Deep clone data structures for immutability
  const newIndividuals: Record<string, Individual> = {};
  for (const [id, ind] of Object.entries(doc.individuals)) {
    if (!targetSet.has(id)) {
      newIndividuals[id] = {
        ...ind,
        famc: [...ind.famc],
        fams: [...ind.fams],
        sources: [...ind.sources],
        notes: [...ind.notes],
        events: [...ind.events],
      };
    }
  }

  const newFamilies: Record<string, Family> = {};
  for (const [id, fam] of Object.entries(doc.families)) {
    const updatedHusb = fam.husb && targetSet.has(fam.husb) ? undefined : fam.husb;
    const updatedWife = fam.wife && targetSet.has(fam.wife) ? undefined : fam.wife;
    const updatedChildren = fam.children.filter((ch) => !targetSet.has(ch));

    const isEmpty = !updatedHusb && !updatedWife && updatedChildren.length === 0;

    if (isEmpty && options.cleanupEmptyFamilies) {
      // Remove empty family
      continue;
    }

    newFamilies[id] = {
      ...fam,
      husb: updatedHusb,
      wife: updatedWife,
      children: updatedChildren,
      sources: [...fam.sources],
      notes: [...fam.notes],
      events: [...fam.events],
    };
  }

  // Orphaned attachments
  const newSources: Record<string, SourceRecord> = { ...doc.sources };
  const newNotes: Record<string, string> = { ...doc.notes };

  const sourcesToRemove = options.removeSourceIds
    ? new Set(options.removeSourceIds)
    : options.removeOrphanedAttachments
    ? new Set(analysis.orphanedSources.map((s) => s.id))
    : new Set<string>();

  const notesToRemove = options.removeNoteIds
    ? new Set(options.removeNoteIds)
    : options.removeOrphanedAttachments
    ? new Set(analysis.orphanedNotes.map((n) => n.id))
    : new Set<string>();

  for (const sId of sourcesToRemove) {
    delete newSources[sId];
  }
  for (const nId of notesToRemove) {
    delete newNotes[nId];
  }

  const newDoc: GedcomDocument = {
    ...doc,
    individuals: newIndividuals,
    families: newFamilies,
    sources: newSources,
    notes: newNotes,
  };

  const details: string[] = [
    `Deleted ${options.targetPersonIds.length} individual(s): ${options.targetPersonIds.join(', ')}`,
    `Repointed ${analysis.affectedFamilyPointers.length} family links.`,
  ];
  if (options.cleanupEmptyFamilies && analysis.emptyFamilyIds.length > 0) {
    details.push(`Cleaned up ${analysis.emptyFamilyIds.length} empty family record(s).`);
  }
  if (sourcesToRemove.size > 0) {
    details.push(`Removed ${sourcesToRemove.size} unreferenced source record(s).`);
  }
  if (notesToRemove.size > 0) {
    details.push(`Removed ${notesToRemove.size} unreferenced note(s).`);
  }
  if (analysis.branchSplit.willSplit) {
    details.push(`Warning note: Graph separated into ${analysis.branchSplit.afterComponentCount} disconnected clusters.`);
  }

  const logEntry: ChangeLogEntry = {
    id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actionType: 'delete',
    summary:
      options.targetPersonIds.length === 1
        ? `Deleted ${doc.individuals[options.targetPersonIds[0]]?.name || options.targetPersonIds[0]}`
        : `Batch deleted ${options.targetPersonIds.length} individuals`,
    details,
    affectedRecordIds: options.targetPersonIds,
  };

  return { newDoc, logEntry };
}
