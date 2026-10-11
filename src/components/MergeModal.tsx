/**
 * GED Scout - Ancestry-Style Duplicate Merge Modal
 * 1. Side-by-side row-by-row comparison
 * 2. Keep A / Keep B / Custom Write-In on EVERY row
 * 3. Automatic non-conflicting carry-over section
 * 4. Family link survival reconciliation
 * 5. Surviving identity selection
 * 6. Full merged preview before commit & single undo unit
 */

import React, { useState } from 'react';
import {
  GitMerge,
  X,
  Check,
  Edit2,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { GedcomDocument, Individual } from '../types';
import {
  initializeMergePlan,
  MergeChoice,
  MergePlan,
  previewMergedIndividual,
} from '../editor/merge';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: GedcomDocument;
  idA: string;
  idB: string;
  onCommitMerge: (plan: MergePlan) => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  doc,
  idA,
  idB,
  onCommitMerge,
}) => {
  if (!isOpen || !idA || !idB || !doc.individuals[idA] || !doc.individuals[idB]) {
    return null;
  }

  const [plan, setPlan] = useState<MergePlan>(() => initializeMergePlan(doc, idA, idB));
  const [activeTab, setActiveTab] = useState<'compare' | 'preview'>('compare');

  const pA = doc.individuals[idA];
  const pB = doc.individuals[idB];

  // Update choice for a specific field row
  const handleChoiceChange = (key: string, choice: MergeChoice) => {
    setPlan((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.key === key ? { ...row, choice } : row)),
    }));
  };

  // Update custom value for a field row
  const handleCustomValChange = (key: string, customVal: string) => {
    setPlan((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.key === key ? { ...row, customVal, choice: 'custom' } : row
      ),
    }));
  };

  // Toggle family link survival
  const handleToggleFamilyLink = (familyId: string) => {
    setPlan((prev) => ({
      ...prev,
      familyLinks: prev.familyLinks.map((link) =>
        link.familyId === familyId ? { ...link, survives: !link.survives } : link
      ),
    }));
  };

  // Switch surviving record ID
  const handleSetSurvivingId = (newSurvivingId: string) => {
    setPlan((prev) => ({
      ...prev,
      survivingId: newSurvivingId,
      retiredId: newSurvivingId === prev.idA ? prev.idB : prev.idA,
    }));
  };

  const mergedPreview: Individual = previewMergedIndividual(plan, doc);

  const handleCommit = () => {
    onCommitMerge(plan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0f1420] border border-white/20 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0d14]">
          <div className="flex items-center gap-2.5 text-amber-400">
            <GitMerge className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Ancestry-Style Duplicate Merge Workbench
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Reconciling {pA.name} ({idA}) and {pB.name} ({idB})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'compare'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Compare & Select
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Surviving ID Selector Bar (Contract Rule 5) */}
        <div className="px-6 py-3 bg-[#0a0d14]/70 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Select Surviving Record ID:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetSurvivingId(idA)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                plan.survivingId === idA
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-semibold'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Survive: {idA} ({pA.name})
            </button>
            <button
              onClick={() => handleSetSurvivingId(idB)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                plan.survivingId === idB
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-semibold'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Survive: {idB} ({pB.name})
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'compare' ? (
            <div className="space-y-6">
              {/* Row-by-row Table (Contract Rule 1 & 2) */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Field-by-Field Reconciliation</span>
                  <span className="text-slate-500 font-normal">
                    Pick Keep A, Keep B, or Write Custom on any row
                  </span>
                </div>

                <div className="space-y-2">
                  {plan.rows.map((row) => (
                    <div
                      key={row.key}
                      className={`p-3 rounded-xl border transition-colors ${
                        row.isConflicting
                          ? 'border-amber-500/30 bg-amber-950/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Field Label */}
                        <div className="w-32 shrink-0">
                          <span className="text-xs font-bold text-slate-200">{row.label}</span>
                          {row.isConflicting && (
                            <span className="block text-[10px] text-amber-400">Values differ</span>
                          )}
                        </div>

                        {/* Three Choice Columns */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {/* Option A */}
                          <button
                            type="button"
                            onClick={() => handleChoiceChange(row.key, 'keepA')}
                            className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                              row.choice === 'keepA'
                                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                                : 'border-white/10 bg-black/20 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span>Record A ({idA})</span>
                              {row.choice === 'keepA' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                            <span className="font-mono text-slate-200 break-words">
                              {row.valA || <span className="text-slate-600 italic">Empty</span>}
                            </span>
                          </button>

                          {/* Option B */}
                          <button
                            type="button"
                            onClick={() => handleChoiceChange(row.key, 'keepB')}
                            className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                              row.choice === 'keepB'
                                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                                : 'border-white/10 bg-black/20 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span>Record B ({idB})</span>
                              {row.choice === 'keepB' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                            <span className="font-mono text-slate-200 break-words">
                              {row.valB || <span className="text-slate-600 italic">Empty</span>}
                            </span>
                          </button>

                          {/* Option Custom Write-in (Contract Rule 2) */}
                          <div
                            className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                              row.choice === 'custom'
                                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                                : 'border-white/10 bg-black/20 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="flex items-center gap-1">
                                <Edit2 className="w-3 h-3 text-cyan-400" />
                                <span>Write-in Custom</span>
                              </span>
                              {row.choice === 'custom' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                            <input
                              type="text"
                              value={row.customVal}
                              onChange={(e) => handleCustomValChange(row.key, e.target.value)}
                              onFocus={() => handleChoiceChange(row.key, 'custom')}
                              placeholder="Type custom value..."
                              className="w-full bg-black/40 border border-white/15 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Family Links Reconciliation (Contract Rule 4) */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Reconcile Family Relationships & Links</span>
                  <span className="text-slate-500 font-normal">Choose surviving links</span>
                </div>

                <div className="space-y-2">
                  {plan.familyLinks.length === 0 ? (
                    <div className="p-3 rounded-lg bg-black/20 text-xs text-slate-500 italic">
                      No family links attached to either individual.
                    </div>
                  ) : (
                    plan.familyLinks.map((link) => (
                      <div
                        key={link.familyId}
                        className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-200">{link.description}</span>
                            <span className="block text-[11px] text-slate-500">
                              Linked from: Record {link.fromPersonId}
                            </span>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={link.survives}
                            onChange={() => handleToggleFamilyLink(link.familyId)}
                            className="rounded border-slate-600 text-cyan-500 focus:ring-0"
                          />
                          <span
                            className={`font-medium ${
                              link.survives ? 'text-cyan-400' : 'text-slate-500 line-through'
                            }`}
                          >
                            {link.survives ? 'Survives in Merged Record' : 'Dropped'}
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Non-Conflicting Carried-Over Data (Contract Rule 3) */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Automatic Non-Conflicting Carry-Over</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {plan.carriedOverSummaries.map((summary, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Full Preview Mode (Contract Rule 6) */
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">
                      Merged Record Preview
                    </span>
                    <h2 className="text-xl font-bold text-white">{mergedPreview.name}</h2>
                  </div>
                  <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold">
                    ID: {mergedPreview.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Given Name:</strong>{' '}
                      {mergedPreview.givenName || 'None'}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Surname:</strong>{' '}
                      {mergedPreview.surname || 'None'}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Sex:</strong>{' '}
                      {mergedPreview.sex || 'Not specified'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Birth:</strong>{' '}
                      {mergedPreview.birth?.date || 'Unknown'}{' '}
                      {mergedPreview.birth?.place ? `in ${mergedPreview.birth.place}` : ''}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Death:</strong>{' '}
                      {mergedPreview.death?.date || 'Unknown'}{' '}
                      {mergedPreview.death?.place ? `in ${mergedPreview.death.place}` : ''}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Burial:</strong>{' '}
                      {mergedPreview.burial?.date || 'Unknown'}{' '}
                      {mergedPreview.burial?.place ? `in ${mergedPreview.burial.place}` : ''}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-cyan-500/20 text-xs text-slate-300 space-y-1">
                  <p>
                    <strong>Surviving Families:</strong> {mergedPreview.famc.length} parent families,{' '}
                    {mergedPreview.fams.length} spouse families.
                  </p>
                  <p>
                    <strong>Attached Sources:</strong> {mergedPreview.sources.length} citations.
                  </p>
                  <p>
                    <strong>Retired Record:</strong> {plan.retiredId} will be permanently retired and all
                    pointers repointed to {plan.survivingId}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#0a0d14]">
          <span className="text-xs text-slate-500">
            Single Undo Unit: The entire merge operation can be undone in 1 click.
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCommit}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Commit Merge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
