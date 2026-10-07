/* =====================================================================
   The report engine and its renderer are loaded as plain scripts
   (angular.json "scripts"), unchanged from the prototype:
     HBA  src/legacy/hb-engine.js  — generated from hitbullseye-reports
     HBC  src/legacy/hb-charts.js  — SVG charts
     HBR  src/legacy/hb-report.js  — report views (HTML + bindings)
   This file gives them a typed handle and the few globals they call.
   ===================================================================== */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Hba = any;
export type Hbc = any;
export type Hbr = any;

export function HBA(): Hba { return (window as any).HBA; }
export function HBC(): Hbc { return (window as any).HBC; }
export function HBR(): Hbr { return (window as any).HBR; }

/** The legacy renderer calls these globals; the app provides them once at start-up. */
export function installLegacyGlobals(g: {
  ico: (name: string, cls?: string) => string;
  toast: (html: string, icon?: string, ms?: number) => void;
  hbx: { clearJourney(id: string): void; hasSimulatedJourney(id: string): boolean };
}): void {
  const w = window as any;
  w.ico = g.ico;
  w.hbeToast = g.toast;
  w.HBX = g.hbx;
}
