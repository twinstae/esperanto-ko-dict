import { describe, expect, test } from "bun:test";
import type { DictEntry } from "./dict-types";
import {
	ellipsisHeadwordMatch,
	expandLemmaLookupKeys,
	expandMorphologicalVariants,
	meaningContainsQuery,
	searchByHeadwordKeys,
	searchDictionaryEntries,
	searchFallbackEntries,
} from "./dict-search";

describe("expandLemmaLookupKeys", () => {
	test("-a / -e adjective endings add stem-o and stem-i", () => {
		const keys = expandLemmaLookupKeys("bela");
		expect(keys).toContain("bela");
		expect(keys).toContain("bel-a");
		expect(keys).toContain("bel-o");
		expect(keys).toContain("bel-i");
	});

	test("plural -oj / -ojn and accusative -n prefer noun stem-o", () => {
		const keys = expandLemmaLookupKeys("spionoj");
		expect(keys).toContain("spion-o");
		expect(keys).toContain("spion-i");
	});

	test("compound -eble / -ebla / -ado strip before bare -o", () => {
		expect(expandLemmaLookupKeys("kompreneble")).toContain("kompren-i");
		expect(expandLemmaLookupKeys("parolado")).toContain("parol-i");
	});

	test("mal- prefix: inflection expands on stripped stem", () => {
		const v = expandMorphologicalVariants("malgranda");
		expect(v.has("granda")).toBe(true);
		const keys = expandLemmaLookupKeys("malgranda");
		expect(keys).toContain("grand-a");
	});

	test("mal- + hyphen keys (malnov-a) and plural -j (malnovaj)", () => {
		expect(expandLemmaLookupKeys("malnova")).toContain("malnov-a");
		expect(expandLemmaLookupKeys("malnovaj")).toContain("malnov-a");
		const keysJn = expandLemmaLookupKeys("malnovajn");
		expect(keysJn).toContain("malnov-a");
		expect(keysJn.indexOf("malnov-a")).toBeLessThan(keysJn.indexOf("nov-a"));
	});

	test("tense + iĝ / ig: proksimiĝis → proksim-a; plibonigi → bon-a", () => {
		expect(expandLemmaLookupKeys("proksimiĝis")).toContain("proksim-a");
		expect(expandLemmaLookupKeys("plibonigi")).toContain("bon-a");
	});

	test("accusative -n: belan → bel-a; long …en roots do not strip n", () => {
		expect(expandLemmaLookupKeys("belan")).toContain("bel-a");
		expect(expandLemmaLookupKeys("kompren")).toContain("kompren-i");
	});

	test("tien resolves to tie before ti-o", () => {
		const keys = expandLemmaLookupKeys("tien");
		expect(keys.indexOf("tie")).toBeLessThan(keys.indexOf("ti-o"));
	});
});

describe("searchByHeadwordKeys (morphology)", () => {
	function one(entries: DictEntry[], q: string): string | undefined {
		return searchByHeadwordKeys(entries, q)[0]?.word;
	}

	test("plural noun", () => {
		const entries: DictEntry[] = [{ word: "spion-o", broLevel: "G1", meaning: "" }];
		expect(one(entries, "spionoj")).toBe("spion-o");
	});

	test("-eble", () => {
		const entries: DictEntry[] = [{ word: "kompren-i", broLevel: "G1", meaning: "" }];
		expect(one(entries, "kompreneble")).toBe("kompren-i");
	});

	test("-ado", () => {
		const entries: DictEntry[] = [{ word: "parol-i", broLevel: "G1", meaning: "" }];
		expect(one(entries, "parolado")).toBe("parol-i");
	});

	test("-ado + accusative -n (paroladon)", () => {
		const entries: DictEntry[] = [{ word: "parol-i", broLevel: "G1", meaning: "" }];
		expect(one(entries, "paroladon")).toBe("parol-i");
	});

	test("mal- + adjective", () => {
		const entries: DictEntry[] = [{ word: "grand-a", broLevel: "G1", meaning: "" }];
		expect(one(entries, "malgranda")).toBe("grand-a");
	});

	test("mal- + adjective (diskreta)", () => {
		const entries: DictEntry[] = [{ word: "diskret-a", broLevel: "G1", meaning: "" }];
		expect(one(entries, "maldiskreta")).toBe("diskret-a");
	});

	test("iĝ + past", () => {
		const entries: DictEntry[] = [{ word: "proksim-a", broLevel: "G1", meaning: "" }];
		expect(one(entries, "proksimiĝis")).toBe("proksim-a");
	});

	test("pli- + ig", () => {
		const entries: DictEntry[] = [{ word: "bon-a", broLevel: "G1", meaning: "" }];
		expect(one(entries, "plibonigi")).toBe("bon-a");
	});

	test("accusative -n on adjective", () => {
		const entries: DictEntry[] = [{ word: "bel-a", broLevel: "G1", meaning: "" }];
		expect(one(entries, "belan")).toBe("bel-a");
	});

	test("tien → tie", () => {
		const entries: DictEntry[] = [{ word: "tie", broLevel: "G1", meaning: "" }];
		expect(one(entries, "tien")).toBe("tie");
	});

	test("bare verb stem", () => {
		const entries: DictEntry[] = [{ word: "kompren-i", broLevel: "G1", meaning: "" }];
		expect(one(entries, "kompren")).toBe("kompren-i");
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
