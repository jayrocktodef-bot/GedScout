/**
 * GED Scout - Main Application Component
 * 100% Client-Side GEDCOM File Doctor & Tree Editor
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { UploadView } from './components/UploadView';
import { AuditReportView } from './components/AuditReportView';
import { TreeEditorView } from './components/TreeEditorView';
import { MergeReviewView } from './components/MergeReviewView';
import { BatchNormalizationView } from './components/BatchNormalizationView';
import { ExportView } from './components/ExportView';
import { PersonDetailDrawer } from './components/PersonDetailDrawer';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { MergeModal } from './components/MergeModal';

import {
  ChangeLogEntry,
  Finding,
  GedcomDocument,
  Individual,
  IntegrityReport,
} from './types';
import { parseAndAuditGedcom } from './gedcom/parseWorker';
import { auditGedcomDocument } from './validation-engine';
import { TreeHistoryManager } from './editor/history';
import {
  analyzeDeletionImpact,
  DeletionExecutionOptions,
  DeletionImpactAnalysis,
  executeDeletion,
} from './editor/deletion';
import { executeMerge, MergePlan } from './editor/merge';
import { normalizeDateString } from './normalization/dateNormalizer';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [doc, setDoc] = useState<GedcomDocument | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // History Manager reference
  const historyRef = useRef<TreeHistoryManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

  // Modals & Drawers state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [mergePair, setMergePair] = useState<{ idA: string; idB: string } | null>(null);
  const [deleteAnalysis, setDeleteAnalysis] = useState<DeletionImpactAnalysis | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Synchronize history buttons
  const syncHistoryState = () => {
    if (historyRef.current) {
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
      setChangeLog(historyRef.current.getChangeLog());
    }
  };

  // Keyboard shortcut listener for Undo/Redo (Ctrl+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          handleRedo();
        } else {
          // Undo
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Load & Parse GEDCOM
  const handleLoadGedcom = async (content: string, name: string) => {
    setIsLoading(true);
    setLoadingStep('Parsing GEDCOM syntax tree in worker thread...');

    try {
      const result = await parseAndAuditGedcom(content, (step) => setLoadingStep(step));
      const parsedDoc = result.doc;
      const auditedReport = result.report;

      historyRef.current = new TreeHistoryManager(parsedDoc);
      setDoc(parsedDoc);
      setReport(auditedReport);
      setFileName(name);
      syncHistoryState();

      // Switch to Audit view so user immediately sees results
      setActiveTab('audit');
    } catch (err: any) {
      alert(`Error parsing GEDCOM: ${err.message || 'Malformed file'}`);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // 2. Undo & Redo Handlers
  const handleUndo = () => {
    if (!historyRef.current || !historyRef.current.canUndo()) return;
    historyRef.current.undo();
    const updatedDoc = historyRef.current.getDocument();
    setDoc(updatedDoc);
    setReport(auditGedcomDocument(updatedDoc));
    syncHistoryState();
  };

  const handleRedo = () => {
    if (!historyRef.current || !historyRef.current.canRedo()) return;
    historyRef.current.redo();
    const updatedDoc = historyRef.current.getDocument();
    setDoc(updatedDoc);
    setReport(auditGedcomDocument(updatedDoc));
    syncHistoryState();
  };

  // 3. Commit mutations through history manager
  const commitNewDocumentState = (newDoc: GedcomDocument, logEntry: ChangeLogEntry) => {
    if (!historyRef.current) return;
    historyRef.current.pushAction(newDoc, logEntry);
    setDoc(newDoc);
    setReport(auditGedcomDocument(newDoc));
    syncHistoryState();
  };

  // 4. Save Edited Individual
  const handleSavePerson = (updatedPerson: Individual) => {
    if (!doc) return;
    const newIndividuals = {
      ...doc.individuals,
      [updatedPerson.id]: updatedPerson,
    };
    const newDoc: GedcomDocument = {
      ...doc,
      individuals: newIndividuals,
    };

    const logEntry: ChangeLogEntry = {
      id: `edit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'edit',
      summary: `Updated record for ${updatedPerson.name} (${updatedPerson.id})`,
      details: [
        `Birth: ${updatedPerson.birth?.date || 'None'}`,
        `Death: ${updatedPerson.death?.date || 'None'}`,
        `Sex: ${updatedPerson.sex || 'None'}`,
      ],
      affectedRecordIds: [updatedPerson.id],
    };

    commitNewDocumentState(newDoc, logEntry);
  };

  // 5. Deletion flow (governed by Deletion Contract)
  const triggerDeleteRequest = (personIds: string[]) => {
    if (!doc) return;
    const analysis = analyzeDeletionImpact(doc, personIds);
    setDeleteAnalysis(analysis);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletion = (options: DeletionExecutionOptions) => {
    if (!doc) return;
    const { newDoc, logEntry } = executeDeletion(doc, options);
    commitNewDocumentState(newDoc, logEntry);
    if (selectedPersonId && options.targetPersonIds.includes(selectedPersonId)) {
      setSelectedPersonId(null);
    }
  };

  // 6. Merge flow (governed by Ancestry-style Merge Contract)
  const handleCommitMerge = (plan: MergePlan) => {
    if (!doc) return;
    const { newDoc, logEntry } = executeMerge(doc, plan);
    commitNewDocumentState(newDoc, logEntry);
    if (selectedPersonId === plan.retiredId) {
      setSelectedPersonId(plan.survivingId);
    }
  };

  // 7. Batch Date Normalization
  const handleApplyDateNormalization = (
    updates: Array<{ personId?: string; familyId?: string; factTag: string; newDate: string; eventId?: string; originalDate?: string }>,
    summary: string
  ) => {
    if (!doc) return;
    const newIndividuals = { ...doc.individuals };
    const newFamilies = { ...doc.families };
    const affectedIds: string[] = [];

    for (const u of updates) {
      if (u.personId && newIndividuals[u.personId]) {
        affectedIds.push(u.personId);
        const ind = { ...newIndividuals[u.personId] };
        if (u.factTag === 'BIRT' && ind.birth) {
          ind.birth = { ...ind.birth, date: u.newDate };
        } else if (u.factTag === 'DEAT' && ind.death) {
          ind.death = { ...ind.death, date: u.newDate };
        } else if (u.factTag === 'BURI' && ind.burial) {
          ind.burial = { ...ind.burial, date: u.newDate };
        } else {
          ind.events = ind.events.map((e) => {
            const matchesId = u.eventId && e.id === u.eventId;
            const matchesDateAndTag = e.tag === u.factTag && (!u.originalDate || e.date === u.originalDate);
            if (matchesId || matchesDateAndTag) {
              return { ...e, date: u.newDate };
            }
            return e;
          });
        }
        newIndividuals[u.personId] = ind;
      } else if (u.familyId && newFamilies[u.familyId]) {
        affectedIds.push(u.familyId);
        const fam = { ...newFamilies[u.familyId] };
        if (u.factTag === 'MARR' && fam.marriage) {
          fam.marriage = { ...fam.marriage, date: u.newDate };
        }
        newFamilies[u.familyId] = fam;
      }
    }

    const newDoc: GedcomDocument = {
      ...doc,
      individuals: newIndividuals,
      families: newFamilies,
    };

    const logEntry: ChangeLogEntry = {
      id: `norm_date_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'normalize-date',
      summary,
      details: [`Updated ${updates.length} date entries across tree`],
      affectedRecordIds: Array.from(new Set(affectedIds)),
    };

    commitNewDocumentState(newDoc, logEntry);
  };

  // 8. Batch Name Normalization
  const handleApplyNameNormalization = (
    updates: Array<{ personId: string; newGiven: string; newSurname: string; newFullName: string }>,
    summary: string
  ) => {
    if (!doc) return;
    const newIndividuals = { ...doc.individuals };
    const affectedIds: string[] = [];

    for (const u of updates) {
      if (newIndividuals[u.personId]) {
        affectedIds.push(u.personId);
        newIndividuals[u.personId] = {
          ...newIndividuals[u.personId],
          givenName: u.newGiven,
          surname: u.newSurname,
          name: u.newFullName,
        };
      }
    }

    const newDoc: GedcomDocument = {
      ...doc,
      individuals: newIndividuals,
    };

    const logEntry: ChangeLogEntry = {
      id: `norm_name_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'normalize-name',
      summary,
      details: [`Standardized names for ${updates.length} individuals`],
      affectedRecordIds: affectedIds,
    };

    commitNewDocumentState(newDoc, logEntry);
  };

  // 9. Quick Fix Action Dispatcher
  const handleQuickFix = (finding: Finding) => {
    if (finding.category === 'duplicates' && finding.personId && finding.secondaryPersonId) {
      setMergePair({ idA: finding.personId, idB: finding.secondaryPersonId });
    } else if (finding.ruleId === 'STRUCT_MALFORMED_DATE') {
      // Auto-normalize if suggestion exists
      if (finding.evidence?.suggestedNormalization && finding.personId) {
        const normDate = finding.evidence.suggestedNormalization;
        const tag = finding.id.includes('DEAT') ? 'DEAT' : 'BIRT';
        handleApplyDateNormalization(
          [{ personId: finding.personId, factTag: tag, newDate: normDate }],
          `Normalized date for ${finding.personName} to "${normDate}"`
        );
      } else {
        setSelectedPersonId(finding.personId || null);
      }
    } else if (finding.ruleId === 'STRUCT_UNLINKED_INDIVIDUAL' && finding.personId) {
      triggerDeleteRequest([finding.personId]);
    } else {
      setSelectedPersonId(finding.personId || null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fileName={fileName}
        individualCount={doc ? Object.keys(doc.individuals).length : 0}
        integrityScore={report ? report.score : null}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastAction={changeLog[0]}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'upload' && (
          <UploadView
            onLoadGedcom={handleLoadGedcom}
            isLoading={isLoading}
            loadingStep={loadingStep}
            loadedFileName={fileName}
            individualCount={doc ? Object.keys(doc.individuals).length : 0}
            familyCount={doc ? Object.keys(doc.families).length : 0}
          />
        )}

        {activeTab === 'audit' && report && doc && (
          <AuditReportView
            report={report}
            doc={doc}
            onQuickFix={handleQuickFix}
            onSelectPerson={(id) => setSelectedPersonId(id)}
            onOpenMerge={(idA, idB) => setMergePair({ idA, idB })}
          />
        )}

        {activeTab === 'editor' && doc && report && (
          <TreeEditorView
            doc={doc}
            findings={report.findings}
            onSelectPerson={(id) => setSelectedPersonId(id)}
            onRequestBatchDelete={(ids) => triggerDeleteRequest(ids)}
            onRequestSingleDelete={(id) => triggerDeleteRequest([id])}
          />
        )}

        {activeTab === 'merge' && doc && report && (
          <MergeReviewView
            doc={doc}
            report={report}
            onOpenMerge={(idA, idB) => setMergePair({ idA, idB })}
          />
        )}

        {activeTab === 'normalize' && doc && (
          <BatchNormalizationView
            doc={doc}
            onApplyDateNormalization={handleApplyDateNormalization}
            onApplyNameNormalization={handleApplyNameNormalization}
          />
        )}

        {activeTab === 'export' && doc && report && (
          <ExportView
            doc={doc}
            report={report}
            originalFileName={fileName || 'pedigree.ged'}
            changeLog={changeLog}
          />
        )}
      </main>

      {/* Person Detail Drawer */}
      {selectedPersonId && doc && report && (
        <PersonDetailDrawer
          personId={selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          doc={doc}
          findings={report.findings}
          onSavePerson={handleSavePerson}
          onRequestDelete={(id) => triggerDeleteRequest([id])}
          onNavigatePerson={(id) => setSelectedPersonId(id)}
        />
      )}

      {/* Ancestry-Style Merge Modal */}
      {mergePair && doc && (
        <MergeModal
          isOpen={true}
          onClose={() => setMergePair(null)}
          doc={doc}
          idA={mergePair.idA}
          idB={mergePair.idB}
          onCommitMerge={handleCommitMerge}
        />
      )}

      {/* Deletion Contract Modal */}
      {isDeleteModalOpen && deleteAnalysis && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteAnalysis(null);
          }}
          analysis={deleteAnalysis}
          onConfirm={handleConfirmDeletion}
        />
      )}
    </div>
  );
}
