/* Development build. `useMockApi: true` runs the whole portal on the in-browser
   mock (localStorage), so it works before the real APIs exist. Point the two
   base URLs at the real services and set `useMockApi: false` to switch over —
   see docs/API.md for every endpoint. */
export const environment = {
  production: false,
  useMockApi: true,
  /** Our portal's backend (registrations, drafts, config, audit). */
  portalApiBase: '/api/portal',
  /** The existing Hitbullseye admin panel (clients, batches, students, credentials). */
  panelApiBase: '/api/panel',
  /** Simulated network delay for the mock, in ms. */
  mockLatencyMs: 120,
  /** Shows the yellow "demo" helpers (prefilled forms, demo credentials). */
  demoMode: true
};
