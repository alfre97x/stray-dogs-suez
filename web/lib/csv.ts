// CSV export helper. Prepends a UTF-8 BOM so Microsoft Excel opens the file
// with correct encoding — without it, Arabic dog names/zones render as mojibake.
// CSV opens natively in Excel, Google Sheets, and LibreOffice.

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\r\n"); // CRLF — Excel's preferred line ending
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  const BOM = "﻿";
  const blob = new Blob([BOM + toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
