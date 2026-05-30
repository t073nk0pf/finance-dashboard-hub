import type { RawImportRow } from "@/lib/imports/types";

export type GoogleSheetsClientConfig = {
  spreadsheetId: string;
  credentialsRef?: string;
};

export type GoogleSheetFetchOptions = {
  sheetName?: string;
  range?: string;
};

export type GoogleSheetsClient = {
  fetchGoogleSheetRows(options: GoogleSheetFetchOptions): Promise<RawImportRow[]>;
};
