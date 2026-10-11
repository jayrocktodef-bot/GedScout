/**
 * GED Scout - Upload & Hero View
 * Drag-and-drop, file picker, and one-click fictional demo loader.
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileCode2,
  Sparkles,
  Lock,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { DEMO_GEDCOM_STRING } from '../gedcom/demoTree';

interface UploadViewProps {
  onLoadGedcom: (content: string, fileName: string) => Promise<void>;
  isLoading: boolean;
  loadingStep: string;
  loadedFileName: string | null;
  individualCount: number;
  familyCount: number;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onLoadGedcom,
  isLoading,
  loadingStep,
  loadedFileName,
  individualCount,
  familyCount,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileError(null);
    if (!file.name.toLowerCase().endsWith('.ged') && !file.name.toLowerCase().endsWith('.gedcom')) {
      setFileError('Please select a valid GEDCOM file (.ged or .gedcom).');
      return;
    }

    try {
      const text = await file.text();
      await onLoadGedcom(text, file.name);
    } catch {
      setFileError('Unable to read this file. Please verify file permissions.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleLoadDemo = async () => {
    setFileError(null);
    await onLoadGedcom(DEMO_GEDCOM_STRING, 'vance_dynasty_benchmark.ged');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Client-Side GEDCOM File Doctor & Tree Editor
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Audit pedigree integrity, merge duplicates, normalize historical dates, and clean
          structural errors. Your family tree never leaves your browser.
        </p>
      </div>

      {/* Main Drag & Drop Hero Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all duration-200 backdrop-blur-sm ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
            : 'border-white/15 bg-[#0f1420]/80 hover:border-cyan-500/50 hover:bg-[#0f1420]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ged,.gedcom"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-semibold text-white">
              {isLoading
                ? loadingStep || 'Processing file...'
                : 'Drop your .ged file here, or click to browse'}
            </h3>
            <p className="text-xs text-slate-400">
              Compatible with GEDCOM 5.5 and 5.5.1 from Ancestry, FamilySearch, RootsMagic, Reunion,
              and Gramps.
            </p>
          </div>

          {!isLoading && (
            <div className="pt-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
              >
                Select GEDCOM File
              </button>
            </div>
          )}
        </div>
      </div>

      {fileError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Demo Tree Section */}
      <div className="rounded-xl border border-white/10 bg-[#0f1420]/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Benchmark Suite</span>
          </div>
          <h3 className="text-sm font-semibold text-white">
            Explore with a pre-planted fictional tree
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Loads the fictional Vance family tree featuring intentionally planted issues across
            every check: chronological impossibilities, age anomalies, duplicate candidates, and
            unlinked floating branches.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemo}
          disabled={isLoading}
          className="shrink-0 px-4 py-2.5 text-xs font-semibold text-slate-100 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <FileCode2 className="w-4 h-4 text-cyan-400" />
          <span>Load Demo File</span>
        </button>
      </div>

      {/* Currently loaded file summary card */}
      {loadedFileName && !isLoading && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{loadedFileName}</p>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                {individualCount} individuals · {familyCount} families active in memory
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-cyan-400">Ready for editing</span>
        </div>
      )}

      {/* Core Privacy & Architecture Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-white/10 bg-[#0f1420]/40 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-white">100% Client-Side Privacy</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Zero network transmission. All parsing, validation, and editing happens purely within
            browser memory.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-[#0f1420]/40 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-white">Live Working Copy</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your original uploaded file is never modified directly. Every action runs on a working
            copy with instant undo and redo.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-[#0f1420]/40 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-white">Audit & Repair</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unlike static linter tools, GED Scout provides real mutation tools: merge duplicates,
            delete people with graph safety, and batch normalize dates.
          </p>
        </div>
      </div>
    </div>
  );
};
