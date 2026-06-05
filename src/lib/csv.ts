type CsvValue = boolean | Date | null | number | string | undefined;

export function escapeCsvValue(value: CsvValue) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function toCsv(rows: CsvValue[][]) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
