export interface CsvRow {
  [key: string]: string | number | boolean | null | undefined;
}

export function generateCSV(rows: CsvRow[]): string {
  if (!rows || rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const line = headers
      .map((h) => {
        const value = row[h] ?? "";
        if (typeof value === "string" && /[",\n]/.test(value)) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");

    csvLines.push(line);
  }

  return csvLines.join("\n");
}

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);


  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();


  URL.revokeObjectURL(url);
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  const csv = generateCSV(rows);
  downloadCSV(filename, csv);
}
