/* =====================================================================
   A minimal PDF writer (no library): the objects and the xref table are
   written by hand, which is enough for a one-page invoice any reader opens.
   Ported unchanged from the prototype. The PDF says DEMO PROTOTYPE.
   ===================================================================== */
import { CampusConfig, Invoice } from './models';

type Op = { t: string; x: number; y: number; size?: number; bold?: boolean; grey?: number }
  | { rect: [number, number, number, number]; fill?: [number, number, number] }
  | { line: [number, number, number, number]; grey?: number };

function esc(t: unknown): string {
  return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdf(ops: Op[]): Blob {
  const c: string[] = [];
  ops.forEach(o => {
    if ('rect' in o) {
      const f = o.fill || [0.93, 0.95, 0.98];
      c.push(f[0].toFixed(3) + ' ' + f[1].toFixed(3) + ' ' + f[2].toFixed(3) + ' rg');
      c.push(o.rect.join(' ') + ' re f');
    } else if ('line' in o) {
      const g = o.grey == null ? 0.82 : o.grey;
      c.push(g.toFixed(3) + ' ' + g.toFixed(3) + ' ' + g.toFixed(3) + ' RG 0.8 w');
      c.push(o.line[0] + ' ' + o.line[1] + ' m ' + o.line[2] + ' ' + o.line[3] + ' l S');
    } else {
      const gr = o.grey == null ? 0.1 : o.grey;
      c.push('BT /' + (o.bold ? 'F2' : 'F1') + ' ' + (o.size || 10) + ' Tf');
      c.push(gr.toFixed(3) + ' ' + gr.toFixed(3) + ' ' + gr.toFixed(3) + ' rg');
      c.push(o.x + ' ' + o.y + ' Td (' + esc(o.t) + ') Tj ET');
    }
  });
  const stream = c.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((body, i) => { offsets.push(out.length); out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offsets.forEach(off => { out += ('0000000000' + off).slice(-10) + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

/* Indian digit grouping without the rupee glyph, which Helvetica has no room for */
function rs(n: number): string { return 'INR ' + Number(n || 0).toLocaleString('en-IN'); }

export function invoicePdf(supportEmail: string, c: CampusConfig, inv: Invoice): Blob {
  const com = c.commercial, con = com.contract;
  const spoc = c.profile.spocs.find(s => s.primary) || c.profile.spocs[0] || { name: '', email: '' };
  const gst = Math.round((inv.amount || 0) * 0.18), tot = (inv.amount || 0) + gst;
  const o: Op[] = [];
  let y: number;
  o.push({ rect: [0, 742, 595, 100], fill: [0.043, 0.082, 0.137] });
  o.push({ t: 'HITBULLSEYE', x: 44, y: 800, size: 17, bold: true, grey: 1 });
  o.push({ t: 'Campus Assessment Platform', x: 44, y: 783, size: 9, grey: 0.72 });
  o.push({ t: 'TAX INVOICE', x: 430, y: 800, size: 15, bold: true, grey: 1 });
  o.push({ t: inv.id || '', x: 430, y: 783, size: 9.5, grey: 0.72 });
  o.push({ t: 'DEMO PROTOTYPE - not a valid tax document', x: 44, y: 757, size: 8, grey: 0.6 });
  if (inv.status === 'Cancelled') o.push({ t: 'CANCELLED', x: 430, y: 757, size: 11, bold: true, grey: 0.85 });
  y = 706;
  o.push({ t: 'BILL TO', x: 44, y, size: 8.5, bold: true, grey: 0.45 });
  o.push({ t: 'INVOICE DETAILS', x: 330, y, size: 8.5, bold: true, grey: 0.45 });
  y -= 17;
  o.push({ t: com.clientName || c.name, x: 44, y, size: 11.5, bold: true });
  o.push({ t: 'Date of issue', x: 330, y, size: 9.5, grey: 0.42 }); o.push({ t: inv.invoiced || '-', x: 470, y, size: 9.5, bold: true });
  y -= 15;
  o.push({ t: c.campus || '', x: 44, y, size: 9.5, grey: 0.35 });
  o.push({ t: 'Payment due', x: 330, y, size: 9.5, grey: 0.42 }); o.push({ t: inv.due || '-', x: 470, y, size: 9.5, bold: true });
  y -= 15;
  o.push({ t: 'Attn: ' + (spoc.name || 'Placement Cell'), x: 44, y, size: 9.5, grey: 0.35 });
  o.push({ t: 'Contract', x: 330, y, size: 9.5, grey: 0.42 }); o.push({ t: con.id || '-', x: 470, y, size: 9.5, bold: true });
  y -= 15;
  o.push({ t: spoc.email || '', x: 44, y, size: 9.5, grey: 0.35 });
  o.push({ t: 'PO number', x: 330, y, size: 9.5, grey: 0.42 }); o.push({ t: con.po || '-', x: 470, y, size: 9.5, bold: true });
  y -= 15;
  o.push({ t: 'Status', x: 330, y, size: 9.5, grey: 0.42 }); o.push({ t: inv.status || '-', x: 470, y, size: 9.5, bold: true });
  y = 592;
  o.push({ rect: [44, y - 6, 507, 26], fill: [0.95, 0.96, 0.98] });
  o.push({ t: 'DESCRIPTION', x: 54, y: y + 2, size: 8.5, bold: true, grey: 0.4 });
  o.push({ t: 'LICENCES', x: 330, y: y + 2, size: 8.5, bold: true, grey: 0.4 });
  o.push({ t: 'RATE', x: 406, y: y + 2, size: 8.5, bold: true, grey: 0.4 });
  o.push({ t: 'AMOUNT', x: 482, y: y + 2, size: 8.5, bold: true, grey: 0.4 });
  y -= 34;
  o.push({ t: inv.item || 'Assessment licences', x: 54, y, size: 10.5, bold: true });
  o.push({ t: String(inv.licences || 0), x: 330, y, size: 10.5 });
  o.push({ t: rs(com.rate || 0), x: 406, y, size: 10.5 });
  o.push({ t: rs(inv.amount), x: 482, y, size: 10.5, bold: true });
  y -= 14;
  o.push({ t: (inv.tests || 1) + ' assessment(s) - ' + (c.shortName || c.name) + ' - ' + (con.start || '') + ' to ' + (con.end || ''), x: 54, y, size: 8.5, grey: 0.45 });
  y -= 12;
  o.push({ line: [44, y, 551, y] });
  y -= 24;
  o.push({ t: 'Subtotal', x: 406, y, size: 10, grey: 0.4 }); o.push({ t: rs(inv.amount), x: 482, y, size: 10 });
  y -= 17;
  o.push({ t: 'GST 18%', x: 406, y, size: 10, grey: 0.4 }); o.push({ t: rs(gst), x: 482, y, size: 10 });
  y -= 10;
  o.push({ line: [406, y, 551, y] });
  y -= 20;
  o.push({ t: 'Total payable', x: 406, y, size: 11.5, bold: true }); o.push({ t: rs(tot), x: 482, y, size: 11.5, bold: true });
  y -= 46;
  o.push({ t: 'NOTES', x: 44, y, size: 8.5, bold: true, grey: 0.45 });
  y -= 15;
  o.push({ t: 'Licences are valid for the contract period and cover one attempt per student', x: 44, y, size: 9, grey: 0.35 });
  y -= 13;
  o.push({ t: 'per assessment. Reports are available to the placement cell as soon as a', x: 44, y, size: 9, grey: 0.35 });
  y -= 13;
  o.push({ t: 'student submits.', x: 44, y, size: 9, grey: 0.35 });
  o.push({ line: [44, 96, 551, 96] });
  o.push({ t: 'Hitbullseye - Campus Assessment Platform', x: 44, y: 80, size: 8.5, grey: 0.45 });
  o.push({ t: supportEmail || '', x: 44, y: 68, size: 8.5, grey: 0.45 });
  o.push({ t: 'Generated on ' + new Date().toDateString(), x: 330, y: 80, size: 8.5, grey: 0.45 });
  return pdf(o);
}
