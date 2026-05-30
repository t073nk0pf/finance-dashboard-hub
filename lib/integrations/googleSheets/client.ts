import { NotImplementedError } from "@/lib/analytics/model";
import type {
  GoogleSheetFetchOptions,
  GoogleSheetsClient,
  GoogleSheetsClientConfig,
} from "@/lib/integrations/googleSheets/types";
import type { RawImportRow } from "@/lib/imports/types";

export function createGoogleSheetsClient(_config: GoogleSheetsClientConfig): GoogleSheetsClient {
  return {
    async fetchGoogleSheetRows(options: GoogleSheetFetchOptions) {
      return fetchGoogleSheetRows(options);
    },
  };
}

export async function fetchGoogleSheetRows(_options: GoogleSheetFetchOptions): Promise<RawImportRow[]> {
  throw new NotImplementedError("Google Sheets import is not implemented yet");
}
