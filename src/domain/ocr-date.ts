import type { DateType } from "./time.ts";

/** Result of reading a printed date from OCR text. The user must always confirm it. */
export interface OcrDate {
  date: string; // YYYY-MM-DD, or "" if none found
  type: DateType | null;
  detection: "success" | "uncertain" | "failed";
  raw: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, ogos: 8, ogo: 8,
  sep: 9, sept: 9, oct: 10, okt: 10, nov: 11, dec: 12, dis: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");
const year = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

function valid(y: number, m: number, d: number) {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : "";
}

/** Find candidate dates in a chunk of text (Malaysian day-first convention). */
export function findDates(text: string): string[] {
  const out: string[] = [];
  const t = text.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, "0");
  // 2027-01-12 / 2027.01.12 / 2027/01/12
  for (const m of t.matchAll(/\b(20\d{2})[./\-\s](\d{1,2})[./\-\s](\d{1,2})\b/g))
    out.push(valid(+m[1], +m[2], +m[3]));
  // 12/01/2027, 12.01.27, 12-01-27, 12 01 2027
  for (const m of t.matchAll(/\b(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2}|\d{4})\b/g))
    out.push(valid(year(m[3]), +m[2], +m[1]));
  // 12 JAN 2027 / 12JAN27 / 12-Jan-2027
  for (const m of t.matchAll(/\b(\d{1,2})\s*[./\-]?\s*([A-Za-z]{3,4})\s*[./\-]?\s*(\d{2}|\d{4})\b/g)) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) out.push(valid(year(m[3]), mo, +m[1]));
  }
  // Month-year only (-> last day of month), used only when no full date was found.
  const full = out.filter(Boolean);
  if (full.length) return [...new Set(full)];
  // JAN 2027
  for (const m of t.matchAll(/\b([A-Za-z]{3,4})\s*[./\-]?\s*(20\d{2})\b/g)) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo) out.push(valid(+m[2], mo, new Date(Date.UTC(+m[2], mo, 0)).getUTCDate()));
  }
  // 01/2027 (month-year only)
  for (const m of t.matchAll(/(?<![\d./\-])(\d{1,2})[./\-](20\d{2})\b/g)) {
    const y = +m[2], mo = +m[1];
    if (mo >= 1 && mo <= 12) out.push(valid(y, mo, new Date(Date.UTC(y, mo, 0)).getUTCDate()));
  }
  return [...new Set(out.filter(Boolean))];
}

const BB = /\b(best\s*before|best\s*by|bb|bbe|bbd|baik\s*sebelum|terbaik\s*sebelum)\b/i;
const UB = /\b(use\s*by|exp(iry|iration|\.)?|ex|luput|guna\s*sebelum|tarikh\s*luput)\b/i;

/** Parse OCR output into a suggested date and its type. */
export function parseOcrDate(text: string): OcrDate {
  const raw = text.trim();
  const lines = raw.split(/\n+/);
  // Prefer dates on (or right after) a labelled line.
  for (let i = 0; i < lines.length; i++) {
    const label = BB.test(lines[i]) ? "best-before" : UB.test(lines[i]) ? "use-by" : null;
    if (!label) continue;
    const dates = findDates(lines[i] + " " + (lines[i + 1] || ""));
    if (dates.length) return { date: dates[dates.length - 1], type: label, detection: "success", raw };
  }
  const dates = findDates(raw);
  if (!dates.length) return { date: "", type: null, detection: "failed", raw };
  // Unlabelled: the latest date is most likely the expiry (others are often MFG dates).
  const date = [...dates].sort().pop()!;
  return { date, type: null, detection: "uncertain", raw };
}
