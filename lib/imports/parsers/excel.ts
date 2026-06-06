import { NotImplementedError } from "@/lib/analytics/model";
import type { RawImportRow } from "@/lib/imports/types";

export async function parseExcelToRawRows(_input: ArrayBuffer, _sheetName?: string): Promise<RawImportRow[]> {
  throw new NotImplementedError("Excel parsing requires an XLSX parser and is not implemented in Import Module v1");
}
