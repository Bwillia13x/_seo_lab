// CSV parsing and generation utilities

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((ln) => {
    const cols = splitCSVLine(ln);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

function splitCSVLine(ln: string) {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < ln.length; i++) {
    const ch = ln[i];
    if (ch === '"') {
      if (inQ && ln[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^"|"$/g, "").trim());
}

export function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => String(v ?? "").replace(/"/g, '""');
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${esc(r[h])}"`).join(",")),
  ].join("\n");
}

export function fromCSV(text: string) {
  const [hdr, ...lines] = text.trim().split(/\r?\n/);
  if (!hdr) return [];
  const hs = hdr.split(",").map((h) => h.replace(/^"|"$/g, ""));
  return lines.map((ln) => {
    const cols = ln.match(/\"(?:[^\"]|\"\")*\"|[^,]+/g) || [];
    const vals = cols.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
    const o: Record<string, string> = {};
    hs.forEach((h, i) => (o[h] = vals[i] ?? ""));
    return o;
  });
}

export function parseCSVSimple(csvText: string): string[][] {
  const lines = csvText.trim().split("\n");
  return lines.map((line) => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
}

export function generateCSV(data: string[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    )
    .join("\n");
}
