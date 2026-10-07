/* Line icons (24px grid, stroke = currentColor), from the prototype. */
export const ICONS: Record<string, string> = {
  check: '<polyline points="20 6 9 17 4 12"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  chev: '<polyline points="9 6 15 12 9 18"/>',
  chevDown: '<polyline points="6 9 12 15 18 9"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.6" cy="6" r="1.3"/><circle cx="3.6" cy="12" r="1.3"/><circle cx="3.6" cy="18" r="1.3"/>',
  rupee: '<path d="M6 3h12"/><path d="M6 8.5h12"/><path d="M15 3c0 3.6-2.6 5.5-6 5.5h-1l8 12.5"/>',
  building: '<rect x="3.5" y="7" width="9" height="14" rx="1.4"/><rect x="12.5" y="3" width="8" height="18" rx="1.4"/><line x1="6.4" y1="11" x2="9.6" y2="11"/><line x1="6.4" y1="15" x2="9.6" y2="15"/><line x1="15.4" y1="7.5" x2="17.6" y2="7.5"/><line x1="15.4" y1="11.5" x2="17.6" y2="11.5"/><line x1="15.4" y1="15.5" x2="17.6" y2="15.5"/>',
  code: '<polyline points="8.5 7 3.5 12 8.5 17"/><polyline points="15.5 7 20.5 12 15.5 17"/>',
  hourglass: '<path d="M6.5 3h11"/><path d="M6.5 21h11"/><path d="M7.5 3v3.2c0 2.3 4.5 3.9 4.5 5.8s-4.5 3.5-4.5 5.8V21"/><path d="M16.5 3v3.2c0 2.3-4.5 3.9-4.5 5.8s4.5 3.5 4.5 5.8V21"/>',
  userplus: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><line x1="19" y1="7" x2="19" y2="13"/><line x1="16" y1="10" x2="22" y2="10"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  chart: '<line x1="3" y1="21" x2="21" y2="21"/><rect x="5" y="11" width="4" height="8"/><rect x="11" y="6" width="4" height="13"/><rect x="17" y="14" width="4" height="5"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14 4c3 0 6 3 6 6 0 4-5 8-8 10-2-3-6-6-6-8 0-3 3-8 8-8z"/><circle cx="14" cy="10" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><path d="M16 5.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>',
  down: '<line x1="12" y1="4" x2="12" y2="17"/><polyline points="6 12 12 18 18 12"/>',
  up: '<line x1="12" y1="20" x2="12" y2="7"/><polyline points="6 12 12 6 18 12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.9 13.6a8 8 0 0 0 0-3.2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.8-1.6L14.4 2h-4l-.3 2.9a8 8 0 0 0-2.8 1.6l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 0 3.2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.8 1.6l.3 2.9h4l.3-2.9a8 8 0 0 0 2.8-1.6l2.4 1 2-3.4z"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="m8.5 9.5-3-6.5h5l2 4"/><path d="m15.5 9.5 3-6.5h-5l-2 4"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/>',
  alert: '<path d="M12 3 2 20h20z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17"/>',
  power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/><polyline points="12 7 12 12 15 14"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  sync: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/>'
};

/** Same icon as an HTML string — for the legacy report renderer and toasts. */
export function ico(name: string, cls = ''): string {
  return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
}
