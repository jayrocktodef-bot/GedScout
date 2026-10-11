/**
 * GED Scout - Deletion Contract Confirmation Modal
 * Strict compliance with the 6-point Deletion Contract:
 * (1) "Clean up empty families" defaults to UNCHECKED (opt-in only).
 * (2) Lists EVERY affected record and pointer explicitly:
 *     - The INDI record(s) being removed
 *     - Each HUSB/WIFE/CHIL pointer from FAM records
 *     - Each FAMC/FAMS link from INDI records
 *     - Each family record left empty
 *     - Each orphaned source, note, and media record with explicit keep-or-remove choice
 * (3) Prominent branch-split warning whenever a deletion splits the tree into disconnected components.
 * Safety rails: Never cascade. Single undo unit.
 */

import React, { useState } from 'react';
import {
  Trash2,
  X,
  ShieldAlert,
  GitBranch,
  Layers,
  FileQuestion,
  UserX,
  Link2Off,
  BookOpen,
  FileText,
  Image,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { DeletionImpactAnalysis, DeletionExecutionOptions } from '../editor/deletion';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DeletionImpactAnalysis | null;
  onConfirm: (options: DeletionExecutionOptions) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onConfirm,
}) => {
  if (!isOpen || !analysis) return null;

  // Change 1: "Clean up empty families" MUST default to UNCHECKED (false)
  const [cleanupEmptyFamilies, setCleanupEmptyFamilies] = useState(false);

  // Attachment keep/remove choices (default to keep, never silently dropped)
  const [selectedRemoveSourceIds, setSelectedRemoveSourceIds] = useState<Set<string>>(new Set());
  const [selectedRemoveNoteIds, setSelectedRemoveNoteIds] = useState<Set<string>>(new Set());
  const [selectedRemoveMediaIds, setSelectedRemoveMediaIds] = useState<Set<string>>(new Set());

  // Branch split acknowledgment
  const [branchSplitAcknowledged, setBranchSplitAcknowledged] = useState(false);

  const isBatch = analysis.targetPersonIds.length > 1;
  const requiresAcknowledgment = analysis.branchSplit.willSplit || isBatch;
  const canProceed = !requiresAcknowledgment || branchSplitAcknowledged;

  const toggleSourceRemoval = (id: string) => {
    setSelectedRemoveSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNoteRemoval = (id: string) => {
    setSelectedRemoveNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMediaRemoval = (id: string) => {
    setSelectedRemoveMediaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProceed = () => {
    onConfirm({
      targetPersonIds: analysis.targetPersonIds,
      cleanupEmptyFamilies,
      removeSourceIds: Array.from(selectedRemoveSourceIds),
      removeNoteIds: Array.from(selectedRemoveNoteIds),
      removeMediaIds: Array.from(selectedRemoveMediaIds),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0f1420] border border-white/20 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0d14]">
          <div className="flex items-center gap-2.5 text-rose-400">
            <Trash2 className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isBatch
                  ? `Confirm Batch Deletion (${analysis.targetPersonIds.length} Individuals)`
                  : 'Confirm Individual Deletion'}
              </h3>
              <p className="text-xs text-slate-400">
                Deletion Contract: Graph operation audit before committing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Change 3: Prominent Branch-Split Warning Banner */}
          {analysis.branchSplit.willSplit && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/60 text-rose-200 space-y-3 shadow-lg shadow-rose-950/30 animate-pulse-none">
              <div className="flex items-center gap-2.5 font-bold text-rose-400 text-sm">
                <GitBranch className="w-5 h-5 shrink-0" />
                <span>BRANCH-SPLIT WARNING: LINEAGE GRAPH DISCONNECTION</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-100 font-medium">
                {analysis.branchSplit.warningMessage ||
                  `This deletion will split the tree into ${analysis.branchSplit.afterComponentCount} disconnected pieces (previously ${analysis.branchSplit.beforeComponentCount} connected tree).`}
              </p>
              <div className="p-3 rounded-lg bg-black/40 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
                <p>
                  <strong>Structural Impact:</strong> Removing this record will sever ancestral and collateral connections between separate branches.
                </p>
                <p>
                  Relatives and in-laws will remain safely in the file, but will no longer connect into a single unified tree graph.
                </p>
              </div>
            </div>
          )}

          {/* Safety Contract Affirmation */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1 text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-cyan-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Deletion Contract Guarantee: Zero Cascading</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Never cascade. Children, spouses, and parents of the deleted person are never deleted.
              Only the selected records are removed, and all references to them are safely unlinked.
            </p>
          </div>

          {/* Change 2 - Item 1: Explicit INDI Records Being Removed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                <span>1. Individual Records Being Removed ({analysis.targetPersons.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">INDI Records</span>
            </div>
            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5 max-h-36 overflow-y-auto">
              {analysis.targetPersons.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-slate-200 font-mono py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-semibold">{p.id}</span>
                    <span className="text-white font-sans font-medium">{p.name}</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {p.birth?.parsedYear ? `b. ${p.birth.parsedYear}` : ''}{' '}
                    {p.death?.parsedYear ? `d. ${p.death.parsedYear}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Change 2 - Item 2: Explicit HUSB/WIFE/CHIL Pointers Removed From FAM Records */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Link2Off className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Family Pointers Being Removed ({analysis.affectedFamilyPointers.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">FAM: HUSB / WIFE / CHIL</span>
            </div>
            {analysis.affectedFamilyPointers.length === 0 ? (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-slate-500 italic">
                No family records point to this individual.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
                {analysis.affectedFamilyPointers.map((ptr, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {ptr.role}
                      </span>
                      <span>
                        Family <strong className="text-white">{ptr.familyId}</strong>: remove pointer to{' '}
                        <span className="text-cyan-300">{ptr.personName}</span> ({ptr.personId})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change 2 - Item 3: Explicit FAMC/FAMS Links Removed From INDI Records */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Link2Off className="w-3.5 h-3.5 text-sky-400" />
                <span>3. Individual Relationship Links Being Removed ({analysis.removedIndividualLinks.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">INDI: FAMC / FAMS</span>
            </div>
            {analysis.removedIndividualLinks.length === 0 ? (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-slate-500 italic">
                No parent or spouse links attached to this individual record.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
                {analysis.removedIndividualLinks.map((link, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                        {link.linkType}
                      </span>
                      <span>{link.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change 2 - Item 4: Explicit Families Left Empty & Change 1: Default UNCHECKED */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Families Left Empty ({analysis.emptyFamilyRecords.length})</span>
              </span>
              <span className="text-[10px] text-slate-500">Opt-in Cleanup Required</span>
            </div>

            {analysis.emptyFamilyRecords.length === 0 ? (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-slate-500 italic">
                No empty family records will be created by this deletion.
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-black/30 border border-amber-500/30 space-y-3">
                <div className="space-y-1 font-mono text-[11px] text-amber-200">
                  {analysis.emptyFamilyRecords.map((fam, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-amber-400">·</span>
                      <span>{fam.description}</span>
                    </div>
                  ))}
                </div>

                {/* Change 1: Default to UNCHECKED */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cleanupEmptyFamilies}
                      onChange={(e) => setCleanupEmptyFamilies(e.target.checked)}
                      className="rounded border-slate-600 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-slate-200 font-semibold">
                      Clean up empty families (delete empty FAM records)
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-500 italic">
                    {cleanupEmptyFamilies ? 'Will be deleted' : 'Kept as empty records (default)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Change 2 - Item 5: Orphaned Attachments with Granular Keep-or-Remove Choice */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileQuestion className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  5. Orphaned Attachments (
                  {analysis.orphanedSources.length} sources, {analysis.orphanedNotes.length} notes,{' '}
                  {analysis.orphanedMedia.length} media)
                </span>
              </span>
              <span className="text-[10px] text-slate-500">Never Silently Dropped</span>
            </div>

            {analysis.orphanedSources.length === 0 &&
            analysis.orphanedNotes.length === 0 &&
            analysis.orphanedMedia.length === 0 ? (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-slate-500 italic">
                No unreferenced citations, notes, or media attachments were orphaned by this deletion.
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-4">
                <p className="text-[11px] text-slate-400">
                  These records are only referenced by the individual(s) being removed. Choose whether to keep each record in the repository or remove it:
                </p>

                {/* Orphaned Sources */}
                {analysis.orphanedSources.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Orphaned Sources ({analysis.orphanedSources.length}):</span>
                    </span>
                    <div className="space-y-1.5 pl-2">
                      {analysis.orphanedSources.map((src) => {
                        const isRemoving = selectedRemoveSourceIds.has(src.id);
                        return (
                          <div
                            key={src.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-[11px]"
                          >
                            <div className="font-mono text-slate-300">
                              <span className="text-cyan-400 mr-2">{src.id}</span>
                              <span className="text-white">{src.title || 'Untitled Source'}</span>
                              {src.author && <span className="text-slate-500 ml-2 font-sans">by {src.author}</span>}
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={isRemoving}
                                onChange={() => toggleSourceRemoval(src.id)}
                                className="rounded border-slate-600 text-rose-500 focus:ring-0"
                              />
                              <span className={isRemoving ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                                {isRemoving ? 'Remove' : 'Keep'}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Orphaned Notes */}
                {analysis.orphanedNotes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Orphaned Notes ({analysis.orphanedNotes.length}):</span>
                    </span>
                    <div className="space-y-1.5 pl-2">
                      {analysis.orphanedNotes.map((n) => {
                        const isRemoving = selectedRemoveNoteIds.has(n.id);
                        return (
                          <div
                            key={n.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-[11px]"
                          >
                            <div className="font-mono text-slate-300 truncate max-w-md">
                              <span className="text-amber-400 mr-2">{n.id}</span>
                              <span className="text-slate-300 font-sans">"{n.text.slice(0, 70)}..."</span>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs shrink-0">
                              <input
                                type="checkbox"
                                checked={isRemoving}
                                onChange={() => toggleNoteRemoval(n.id)}
                                className="rounded border-slate-600 text-rose-500 focus:ring-0"
                              />
                              <span className={isRemoving ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                                {isRemoving ? 'Remove' : 'Keep'}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Orphaned Media */}
                {analysis.orphanedMedia.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-purple-400" />
                      <span>Orphaned Media Attachments ({analysis.orphanedMedia.length}):</span>
                    </span>
                    <div className="space-y-1.5 pl-2">
                      {analysis.orphanedMedia.map((m) => {
                        const isRemoving = selectedRemoveMediaIds.has(m.id);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-[11px]"
                          >
                            <div className="font-mono text-slate-300 truncate max-w-md">
                              <span className="text-purple-400 mr-2">{m.tag}</span>
                              <span className="text-slate-300 font-sans">{m.description}</span>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs shrink-0">
                              <input
                                type="checkbox"
                                checked={isRemoving}
                                onChange={() => toggleMediaRemoval(m.id)}
                                className="rounded border-slate-600 text-rose-500 focus:ring-0"
                              />
                              <span className={isRemoving ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                                {isRemoving ? 'Remove' : 'Keep'}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mandatory Acknowledgment Checkbox for branch splits and batch deletes */}
          {requiresAcknowledgment && (
            <div className="p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branchSplitAcknowledged}
                  onChange={(e) => setBranchSplitAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-amber-500 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <span className="font-bold text-amber-300 text-xs leading-relaxed">
                  {analysis.branchSplit.willSplit
                    ? `I explicitly acknowledge that this deletion will split the family tree graph into ${analysis.branchSplit.afterComponentCount} disconnected pieces.`
                    : `I explicitly acknowledge and confirm this batch deletion of ${analysis.targetPersonIds.length} individual records.`}
                </span>
              </label>
            </div>
          )}

          {/* Single Undo Unit Reminder */}
          <div className="text-[11px] text-slate-500 italic p-2 rounded bg-black/20 border border-white/5">
            Single Undo Unit: The entire delete operation, touching {analysis.totalAffectedRecordsCount} total records and pointers, is registered as a single undo unit on your history stack.
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-[#0a0d14]">
          <span className="text-[11px] text-slate-500 font-mono">
            {analysis.totalAffectedRecordsCount} records & pointers affected
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProceed}
              disabled={!canProceed}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-rose-950/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm Deletion</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
