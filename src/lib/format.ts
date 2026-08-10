// Formatting helpers: Indian rupee grouping, dates, amount-in-words.

export function inr(n: number): string {
  const v = isFinite(n) ? n : 0
  const neg = v < 0
  const [intPart, decPart] = Math.abs(v).toFixed(2).split('.')
  // Indian grouping: last 3 digits, then groups of 2
  let s = intPart
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3)
    const rest = intPart.slice(0, -3)
    s = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
  }
  return (neg ? '-' : '') + '₹' + s + '.' + decPart
}

export function num(n: number, digits = 0): string {
  return (isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function financialYear(iso: string, fyStartMonth = 4): string {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const y = d.getFullYear()
  const startYear = m >= fyStartMonth ? y : y - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount))
  const paise = Math.round((Math.abs(amount) - rupees) * 100)
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only'

  const parts: string[] = []
  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const hundred = Math.floor((rupees % 1000) / 100)
  const rest = rupees % 100

  if (crore) parts.push(twoDigits(crore) + ' Crore')
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand')
  if (hundred) parts.push(ONES[hundred] + ' Hundred')
  if (rest) parts.push((parts.length ? 'and ' : '') + twoDigits(rest))

  let words = parts.join(' ').trim() + ' Rupees'
  if (paise) words += ' and ' + twoDigits(paise) + ' Paise'
  return words + ' Only'
}
