import { Injectable } from '@angular/core';

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any, row: any) => string;
}

@Injectable({ providedIn: 'root' })
export class ExportService {

  /**
   * Export rows to a CSV file and trigger download.
   * CSV opens in Excel, Google Sheets, etc.
   */
  exportCSV(filename: string, columns: ExportColumn[], rows: any[]): void {
    const header = columns.map(c => this.escapeCsv(c.label)).join(',');
    const body = rows.map(row =>
      columns.map(c => {
        const raw = c.formatter ? c.formatter(row[c.key], row) : row[c.key];
        return this.escapeCsv(raw);
      }).join(',')
    ).join('\n');

    const csv = '\uFEFF' + header + '\n' + body; // BOM for Excel UTF-8
    this.downloadBlob(csv, filename, 'text/csv;charset=utf-8');
  }

  /**
   * Export to JSON file (raw data backup).
   */
  exportJSON(filename: string, data: any): void {
    const json = JSON.stringify(data, null, 2);
    this.downloadBlob(json, filename, 'application/json');
  }

  private escapeCsv(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, newline, or quote — wrap in quotes and escape inner quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private downloadBlob(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
