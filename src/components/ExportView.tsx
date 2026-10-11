/**
 * GED Scout - Cleaned Export View
 * One-click browser download of cleaned GEDCOM 5.5.1 file with embedded audit log,
 * full human & machine readable change log viewer, and JSON/Markdown export.
 */

import React, { useState } from 'react';
import {
  Download,
  FileCheck,
  CheckCircle2,
  Copy,
  FileText,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { ChangeLogEntry, GedcomDocument, IntegrityReport } from '../types';
import { serializeGedcomDocument } from '../gedcom/serializer';

interface ExportViewProps {
  doc: GedcomDocument;
  report: IntegrityReport;
  originalFileName: string;
  changeLog: ChangeLogEntry[];
}

export const ExportView: React.FC<ExportViewProps> = ({
  doc,
  report,
  originalFileName,
  changeLog,
}) => {
  const [includeAuditNotes, setIncludeAuditNotes] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate plain English log summary
  const generateLogSummary = (): string => {
    if (changeLog.length === 0) {
      return 'No mutations recorded in this session. File exported with standard GEDCOM 5.5.1 formatting.';
    }
    return changeLog
      .map(
        (log, idx) =>
          `[${idx + 1}] ${log.timestamp} - ${log.summary}\n${log.details.map((d) => `    · ${d}`).join('\n')}`
      )
      .join('\n\n');
  };

  const handleDownloadGedcom = () => {
    const summary = generateLogSummary();
    const serialized = serializeGedcomDocument(doc, {
      includeAuditNote: includeAuditNotes,
      auditLogSummary: summary,
    });

    const blob = new Blob([serialized], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const baseName = originalFileName.replace(/\.(ged|gedcom)$/i, '');
    link.download = `${baseName}_scout_cleaned.ged`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadLogJson = () => {
    const jsonStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        originalFile: originalFileName,
        finalIntegrityScore: report.score,
        totalIndividuals: Object.keys(doc.individuals).length,
        totalFamilies: Object.keys(doc.families).length,
        changeLog,
      },
      null,
      2
    );

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${originalFileName.replace(/\.(ged|gedcom)$/i, '')}_change_log.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = () => {
    const text = generateLogSummary();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Cleaned GEDCOM Export</h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          Export your repaired family tree as standard GEDCOM 5.5.1 with repointed relationships,
          reconciled duplicates, and cleaned date phrases.
        </p>
      </div>

      {/* Main Export Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0f1420] to-[#0a0d14] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Ready for Export</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              {originalFileName.replace(/\.(ged|gedcom)$/i, '')}_scout_cleaned.ged
            </h3>
            <p className="text-xs text-slate-400">
              Validated against standard GEDCOM 5.5.1 lineage-linked format.
            </p>
          </div>

          <button
            onClick={handleDownloadGedcom}
            className="px-6 py-3 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Cleaned .ged</span>
          </button>
        </div>

        {/* Tree Health Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-black/40 border border-white/10 text-xs">
          <div>
            <span className="text-slate-500 block">Final Integrity Score</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {report.score.toFixed(1)} / 10
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Active Individuals</span>
            <span className="text-lg font-bold font-mono text-white">
              {Object.keys(doc.individuals).length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Active Families</span>
            <span className="text-lg font-bold font-mono text-white">
              {Object.keys(doc.families).length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Mutations Recorded</span>
            <span className="text-lg font-bold font-mono text-cyan-400">
              {changeLog.length} actions
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={includeAuditNotes}
              onChange={(e) => setIncludeAuditNotes(e.target.checked)}
              className="rounded border-slate-600 text-cyan-500 focus:ring-0"
            />
            <span>Embed audit change log directly in GEDCOM header NOTE block</span>
          </label>
        </div>
      </div>

      {/* Audit Change Log Section */}
      <div className="rounded-2xl border border-white/10 bg-[#0f1420]/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Session Audit Change Log ({changeLog.length} Actions)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Every delete, merge, date fix, and name standardization is documented in plain English.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleCopyLog}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Log'}</span>
            </button>

            <button
              onClick={handleDownloadLogJson}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Log JSON</span>
            </button>
          </div>
        </div>

        {changeLog.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-xs text-slate-500">
            No modifications made yet. All edits, merges, and normalizations will appear here.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {changeLog.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{log.summary}</span>
                  <span className="text-[11px] font-mono text-slate-500">{log.timestamp}</span>
                </div>

                <div className="space-y-1 text-slate-400 pl-2 border-l border-cyan-500/40 text-[11px]">
                  {log.details.map((d, i) => (
                    <p key={i}>{d}</p>
                  ))}
                </div>

                {log.affectedRecordIds.length > 0 && (
                  <div className="text-[10px] font-mono text-slate-500">
                    Affected records: {log.affectedRecordIds.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
