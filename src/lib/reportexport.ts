import * as XLSX from 'xlsx'

export interface ReportMeta {
  firmName: string
  address?: string
  gstin?: string
  fromDate: string
  toDate: string
}

// ---------- Excel ----------
export function reportToExcel(fileName: string, title: string, meta: ReportMeta, headers: string[], rows: (string | number)[][], totals?: (string | number)[]) {
  const aoa: (string | number)[][] = [
    [meta.firmName],
    [meta.address || ''],
    [meta.gstin ? `GSTIN: ${meta.gstin}` : ''],
    [title],
    [`Period: ${meta.fromDate} to ${meta.toDate}`],
    [],
    headers,
    ...rows,
  ]
  if (totals) aoa.push([], totals)
  const ws = XLSX.utils.aoa_to_sheet(aoa.filter((r) => r.length))
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28))
  XLSX.writeFile(wb, fileName)
}

// Build the workbook as a File (for Web Share), or trigger a download fallback.
export async function reportShare(fileName: string, title: string, meta: ReportMeta, headers: string[], rows: (string | number)[][], totals?: (string | number)[]) {
  const aoa: (string | number)[][] = [
    [meta.firmName], [meta.address || ''], [meta.gstin ? `GSTIN: ${meta.gstin}` : ''],
    [title], [`Period: ${meta.fromDate} to ${meta.toDate}`], [], headers, ...rows,
  ]
  if (totals) aoa.push([], totals)
  const ws = XLSX.utils.aoa_to_sheet(aoa.filter((r) => r.length))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28))
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const file = new File([out], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const nav = navigator as any
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: `${title} — ${meta.firmName}` })
      return
    } catch {
      /* user cancelled — fall through to download */
    }
  }
  // Fallback: download the file
  reportToExcel(fileName, title, meta, headers, rows, totals)
}

// ---------- PDF (print) ----------
export function reportToPDF(title: string, meta: ReportMeta, headers: string[], rows: (string | number)[][], totals?: (string | number)[], accent = '#ea580c') {
  const esc = (v: any) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const thead = `<tr>${headers.map((h, i) => `<th style="text-align:${i >= 3 ? 'right' : 'left'}">${esc(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${i >= 3 ? 'right' : 'left'}">${esc(c)}</td>`).join('')}</tr>`)
    .join('')
  const tfoot = totals
    ? `<tr class="total">${totals.map((c, i) => `<td style="text-align:${i >= 3 ? 'right' : 'left'}">${esc(c)}</td>`).join('')}</tr>`
    : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:24px;font-size:12px}
    h1{color:${accent};margin:0 0 2px;font-size:20px}
    .sub{color:#475569;margin:0}
    .title{margin:14px 0 2px;font-size:15px;font-weight:700}
    .period{color:#64748b;margin:0 0 10px;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:${accent}22;border:1px solid ${accent}55;padding:6px 8px;font-size:11px;text-transform:uppercase}
    td{border:1px solid ${accent}33;padding:5px 8px}
    tr.total td{font-weight:700;background:#f1f5f9;border-top:2px solid ${accent}}
    @media print{@page{size:A4 landscape;margin:10mm}}
  </style></head><body>
    <h1>${esc(meta.firmName)}</h1>
    <p class="sub">${esc(meta.address || '')}${meta.gstin ? ' · GSTIN: ' + esc(meta.gstin) : ''}</p>
    <p class="title">${esc(title)}</p>
    <p class="period">Period: ${esc(meta.fromDate)} to ${esc(meta.toDate)}</p>
    <table><thead>${thead}</thead><tbody>${tbody}${tfoot}</tbody></table>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('Please allow pop-ups for this site to generate the PDF, then try again.')
    return
  }
  w.document.write(html)
  w.document.close()
}
