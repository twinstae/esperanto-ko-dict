import { describe, expect, test } from "bun:test";
import type { DictEntry } from "./dict-types";
import {
	ellipsisHeadwordMatch,
	expandLemmaLookupKeys,
	meaningContainsQuery,
	searchByHeadwordKeys,
	searchDictionaryEntries,
	searchFallbackEntries,
} from "./dict-search";

describe("expandLemmaLookupKeys", () => {
	test("-a / -e adjective endings add stem-o and stem-i", () => {
		const keys = expandLemmaLookupKeys("bela");
		expect(keys).toContain("bela");
		expect(keys).toContain("bel-o");
		expect(keys).toContain("bel-i");
	});
});

describe("ellipsisHeadwordMatch", () => {
	test("query extends base (query longer)", () => {
		expect(ellipsisHeadwordMatch("foo…", "foobar")).toBe(true);
	});

	test("query is shorter prefix of base", () => {
		expect(ellipsisHeadwordMatch("foobar…", "foo")).toBe(true);
	});

	test("no ellipsis in headword", () => {
		expect(ellipsisHeadwordMatch("salut-i", "sal")).toBe(false);
	});

	test("empty base after removing …", () => {
		expect(ellipsisHeadwordMatch("…", "x")).toBe(false);
	});
});

describe("meaningContainsQuery", () => {
	test("substring match case-insensitive", () => {
		expect(meaningContainsQuery("Hello KOREA", "korea")).toBe(true);
		expect(meaningContainsQuery("abc", "z")).toBe(false);
	});
});

describe("searchByHeadwordKeys", () => {
	const entries: DictEntry[] = [
		{ word: "am-i", broLevel: "G1", meaning: "x" },
		{ word: "am-i", broLevel: "G2", meaning: "y" },
	];

	test("returns first key batch that matches", () => {
		const r = searchByHeadwordKeys(entries, "amas");
		expect(r).toHaveLength(2);
		expect(r.every((e) => e.word === "am-i")).toBe(true);
	});

	test("empty when no key matches", () => {
		expect(searchByHeadwordKeys(entries, "zzzunknown")).toEqual([]);
	});
});

describe("searchFallbackEntries", () => {
	const entries: DictEntry[] = [
		{ word: "kateĥ…", broLevel: "GX", meaning: "→ katek…" },
		{ word: "kompendi-o", broLevel: "G1", meaning: "☞ kateĥismo" },
	];

	test("ellipsis match before meaning scan", () => {
		const r = searchFallbackEntries(entries, "kateĥismo");
		expect(r.some((e) => e.word === "kateĥ…")).toBe(true);
		expect(r.some((e) => e.word === "kompendi-o")).toBe(true);
	});

	test("dedupes by word+broLevel", () => {
		const dup: DictEntry[] = [
			{ word: "a", broLevel: "G1", meaning: "hit" },
			{ word: "a", broLevel: "G1", meaning: "hit" },
		];
		expect(searchFallbackEntries(dup, "hit")).toHaveLength(1);
	});
});

describe("searchDictionaryEntries", () => {
	test("empty query returns []", () => {
		expect(searchDictionaryEntries([], "   ")).toEqual([]);
	});

	test("headword hit skips fallback", () => {
		const entries: DictEntry[] = [{ word: "zoo-o", broLevel: "G1", meaning: "" }];
		const r = searchDictionaryEntries(entries, "zoo-o");
		expect(r).toEqual(entries);
	});
});
