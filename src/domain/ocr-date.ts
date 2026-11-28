import type { DateType } from "./time.ts";

/** Result of reading a printed date from OCR text. The user must always confirm it. */
export interface OcrDate {
  date: string; // YYYY-MM-DD, or "" if none found
  type: DateType | null;
  detection: "success" | "uncertain" | "failed";
  raw: string;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  mei: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  ogos: 8,
  ogo: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  dec: 12,
  dis: 12,
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
  for (const m of t.matchAll(
    /\b(\d{1,2})\s*[./\-]?\s*([A-Za-z]{3,4})\s*[./\-]?\s*(\d{2}|\d{4})\b/g,
  )) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) out.push(valid(year(m[3]), mo, +m[1]));
  }
  return [...new Set(out.filter(Boolean))];
}

const BB = /\b(best\s*before|best\s*by|bb|bbe|bbd|baik\s*sebelum|terbaik\s*sebelum)\b/i;
const UB = /\b(use\s*by|exp(iry|iration|\.)?|ex|luput|guna\s*sebelum|tarikh\s*luput)\b/i;

const MFG =
  /\b(mfg|mfd|manufactured|manufacturing|packed|production|dikeluarkan|dikilang)(?:\s+on)?\b/i;
const LABEL = new RegExp([BB.source, UB.source, MFG.source].join("|"), "gi");

/** Prefer an explicit label and never infer a missing day. */
export function parseOcrDate(text: string): OcrDate {
  const raw = text.trim();
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates: { date: string; type: DateType }[] = [];
  const unlabelled: string[] = [];
  let sawExpiry = false;
  for (const [index, line] of lines.entries()) {
    const labels = [...line.matchAll(LABEL)];
    const next = lines[index + 1];
    if (!labels.length) {
      if (![BB, UB, MFG].some((label) => label.test(lines[index - 1] || "")))
        unlabelled.push(...findDates(line));
      continue;
    }
    for (const [position, match] of labels.entries()) {
      if (MFG.test(match[0])) continue;
      sawExpiry = true;
      const type = BB.test(match[0]) ? "best-before" : "use-by";
      const nextLabel = labels[position + 1];
      const segment = line.slice(match.index + match[0].length, nextLabel?.index);
      const nearby = findDates(segment);
      const following =
        next && !nextLabel && ![BB, UB, MFG].some((label) => label.test(next))
          ? findDates(next)
          : [];
      const dates = nearby.length || /\d/.test(segment) ? nearby : following;
      for (const date of dates) candidates.push({ date, type });
    }
  }
  const first = candidates[0];
  if (first && candidates.every(({ date, type }) => date === first.date && type === first.type))
    return { ...first, detection: "success", raw };
  if (sawExpiry)
    return { date: "", type: null, detection: candidates.length ? "uncertain" : "failed", raw };
  const date = unlabelled.sort().at(-1) ?? "";
  return { date, type: null, detection: date ? "uncertain" : "failed", raw };
}
