import { describe, expect, test } from "bun:test";
import * as XLSX from "xlsx";
import {
	buildDictBundle,
	EO_HAN_SHEET_NAME,
	parseEoHanFromBuffer,
	parseEoHanSheet,
	rowsToEntries,
} from "./xlsx-eo-han";

describe("rowsToEntries", () => {
	test("maps known columns and skips empty words", () => {
		const entries = rowsToEntries([
			{ 단어: "  saluton  ", "BRO 레벨": "G1", "단어 뜻": "안녕" },
			{ 단어: "", "BRO 레벨": "G1", "단어 뜻": "skip" },
		]);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toEqual({
			word: "saluton",
			broLevel: "G1",
			meaning: "안녕",
		});
	});
});

describe("parseEoHanFromBuffer", () => {
	test("reads 에-한 sheet from in-memory workbook", () => {
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet([
			["단어", "BRO 레벨", "단어 뜻"],
			["testvorto", "G2", "테스트"],
		]);
		XLSX.utils.book_append_sheet(wb, ws, EO_HAN_SHEET_NAME);
		const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
		const entries = parseEoHanFromBuffer(buf);
		expect(entries).toEqual([
			{ word: "testvorto", broLevel: "G2", meaning: "테스트" },
		]);
	});

	test("parseEoHanSheet throws when sheet is missing", () => {
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet([["a"]]);
		XLSX.utils.book_append_sheet(wb, ws, "other");
		expect(() => parseEoHanSheet(wb)).toThrow(/에-한/);
	});
});

describe("buildDictBundle", () => {
	test("returns version, generatedAt, entries", () => {
		const rows: import("./dict-types").DictEntry[] = [
			{ word: "a", broLevel: "G1", meaning: "b" },
		];
		const b = buildDictBundle(rows, "2", "2026-01-01T00:00:00.000Z");
		expect(b).toEqual({
			version: "2",
			generatedAt: "2026-01-01T00:00:00.000Z",
			entries: rows,
		});
	});
});
