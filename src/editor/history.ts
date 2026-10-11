/**
 * GED Scout - History & Undo/Redo Stack
 * Tracks all state transitions, atomic operations, and generates clean change logs.
 */

import { ChangeLogEntry, GedcomDocument } from '../types';

export interface HistorySnapshot {
  doc: GedcomDocument;
  logEntry: ChangeLogEntry;
}

export class TreeHistoryManager {
  private past: HistorySnapshot[] = [];
  private present: GedcomDocument;
  private future: HistorySnapshot[] = [];
  private changeLog: ChangeLogEntry[] = [];

  constructor(initialDoc: GedcomDocument) {
    this.present = initialDoc;
  }

  public getDocument(): GedcomDocument {
    return this.present;
  }

  public getChangeLog(): ChangeLogEntry[] {
    return [...this.changeLog];
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public pushAction(newDoc: GedcomDocument, logEntry: ChangeLogEntry): void {
    this.past.push({
      doc: this.present,
      logEntry,
    });
    this.present = newDoc;
    this.future = []; // Clear redo stack on new action
    this.changeLog.unshift(logEntry);
  }

  public undo(): ChangeLogEntry | null {
    if (!this.canUndo()) return null;
    const previous = this.past.pop()!;
    this.future.unshift({
      doc: this.present,
      logEntry: previous.logEntry,
    });
    this.present = previous.doc;
    return previous.logEntry;
  }

  public redo(): ChangeLogEntry | null {
    if (!this.canRedo()) return null;
    const next = this.future.shift()!;
    this.past.push({
      doc: this.present,
      logEntry: next.logEntry,
    });
    this.present = next.doc;
    return next.logEntry;
  }

  public reset(initialDoc: GedcomDocument): void {
    this.past = [];
    this.present = initialDoc;
    this.future = [];
    this.changeLog = [];
  }
}
