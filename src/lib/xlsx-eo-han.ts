import * as XLSX from "xlsx";
import type { DictBundle, DictEntry } from "./dict-types";
import { normalizeLemma } from "./normalize";

export const EO_HAN_SHEET_NAME = "에-한";

const COL_WORD = "단어";
const COL_BRO = "BRO 레벨";
const COL_MEANING = "단어 뜻";

export { normalizeLemma } from "./normalize";

export function rowsToEntries(rows: Record<string, unknown>[]): DictEntry[] {
	const entries: DictEntry[] = [];
	for (const row of rows) {
		const word = normalizeLemma(String(row[COL_WORD] ?? ""));
		const broLevel = String(row[COL_BRO] ?? "").trim();
		const meaning = String(row[COL_MEANING] ?? "").trim();
		if (!word) continue;
		entries.push({ word, broLevel, meaning });
	}
	return entries;
}

export function parseEoHanSheet(workbook: XLSX.WorkBook): DictEntry[] {
	const sheet = workbook.Sheets[EO_HAN_SHEET_NAME];
	if (!sheet) {
		const names = workbook.SheetNames.join(", ");
		throw new Error(`Sheet "${EO_HAN_SHEET_NAME}" not found. Available: ${names}`);
	}
	const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		raw: false,
		defval: "",
	});
	return rowsToEntries(rows);
}

export function parseEoHanFromBuffer(buf: ArrayBuffer | Uint8Array): DictEntry[] {
	const workbook = XLSX.read(buf, { type: "array" });
	return parseEoHanSheet(workbook);
}

export function buildDictBundle(
	entries: DictEntry[],
	version: string,
	generatedAt: string,
): DictBundle {
	return { version, generatedAt, entries };
}
