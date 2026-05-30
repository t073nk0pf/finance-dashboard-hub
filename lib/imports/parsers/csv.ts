import type { RawImportRow } from "@/lib/imports/types";

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

export function parseCsvToRawRows(input: string, delimiter = ","): RawImportRow[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0], delimiter);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    return {
      rowNumber: index + 2,
      values: Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] ?? ""])),
    };
  });
}
