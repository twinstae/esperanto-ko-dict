import { describe, expect, test } from "bun:test";
import type { DictBundle } from "./dict-types";
import { expandLemmaLookupKeys, searchDictionaryEntries } from "./dict-search";

const bundle: DictBundle = await Bun.file(
	new URL("../../public/data/eo-ko.json", import.meta.url),
).json();

const entries = bundle.entries;

function expectHasWord(results: { word: string }[], word: string) {
	expect(results.some((e) => e.word === word)).toBe(true);
}

describe("expandLemmaLookupKeys (real data)", () => {
	test("katekolo expands to katekol-o before katekol-i", () => {
		const keys = expandLemmaLookupKeys("katekolo");
		expect(keys).toContain("katekolo");
		expect(keys).toContain("katekol-o");
		expect(keys).toContain("katekol-i");
	});

	test("hyphenated katekol-o stays exact only", () => {
		const keys = expandLemmaLookupKeys("katekol-o");
		expect(keys).toEqual(["katekol-o"]);
	});
});

describe("searchDictionaryEntries against eo-ko.json", () => {
	test("Kateĥismo — found in definition text (kompendi-o)", () => {
		const r = searchDictionaryEntries(entries, "Kateĥismo");
		expectHasWord(r, "kompendi-o");
	});

	test("Katehxismo — x-system, same gloss hit", () => {
		const r = searchDictionaryEntries(entries, "Katehxismo");
		expectHasWord(r, "kompendi-o");
	});

	test("kateĥismo — lowercase", () => {
		const r = searchDictionaryEntries(entries, "kateĥismo");
		expectHasWord(r, "kompendi-o");
	});

	test("amo — noun -o maps to am-i", () => {
		const r = searchDictionaryEntries(entries, "amo");
		expect(r.length).toBeGreaterThan(0);
		expectHasWord(r, "am-i");
	});

	test("ami — infinitive", () => {
		const r = searchDictionaryEntries(entries, "ami");
		expectHasWord(r, "am-i");
	});

	test("amas — present tense", () => {
		const r = searchDictionaryEntries(entries, "amas");
		expectHasWord(r, "am-i");
	});

	test("amis — past tense", () => {
		const r = searchDictionaryEntries(entries, "amis");
		expectHasWord(r, "am-i");
	});

	test("amos — future tense", () => {
		const r = searchDictionaryEntries(entries, "amos");
		expectHasWord(r, "am-i");
	});

	test("saluton — accusative -on", () => {
		const r = searchDictionaryEntries(entries, "saluton");
		expectHasWord(r, "salut-i");
	});

	test("katekol-o — hyphen headword", () => {
		const r = searchDictionaryEntries(entries, "katekol-o");
		expectHasWord(r, "katekol-o");
	});

	test("katekolo — insert hyphen -o lemma", () => {
		const r = searchDictionaryEntries(entries, "katekolo");
		expectHasWord(r, "katekol-o");
	});

	test("kateĥ… ellipsis headword matches Kateĥismo query", () => {
		const r = searchDictionaryEntries(entries, "Kateĥismo");
		expectHasWord(r, "kateĥ…");
	});

	test("spionoj → spion-o", () => {
		const r = searchDictionaryEntries(entries, "spionoj");
		expectHasWord(r, "spion-o");
	});

	test("kompreneble → kompren-i", () => {
		const r = searchDictionaryEntries(entries, "kompreneble");
		expectHasWord(r, "kompren-i");
	});

	test("parolado → parol-i", () => {
		const r = searchDictionaryEntries(entries, "parolado");
		expectHasWord(r, "parol-i");
	});

	test("paroladon → parol-i (-ado + accusative -n)", () => {
		const r = searchDictionaryEntries(entries, "paroladon");
		expectHasWord(r, "parol-i");
	});

	test("proksimiĝis → proksim-a", () => {
		const r = searchDictionaryEntries(entries, "proksimiĝis");
		expectHasWord(r, "proksim-a");
	});

	test("plibonigi → bon-a", () => {
		const r = searchDictionaryEntries(entries, "plibonigi");
		expectHasWord(r, "bon-a");
	});

	test("maldiskreta → diskret-a", () => {
		const r = searchDictionaryEntries(entries, "maldiskreta");
		expectHasWord(r, "diskret-a");
	});

	test("malgranda → grand-a", () => {
		const r = searchDictionaryEntries(entries, "malgranda");
		expectHasWord(r, "grand-a");
	});

	test("bela / belan → bel-a", () => {
		expectHasWord(searchDictionaryEntries(entries, "bela"), "bel-a");
		expectHasWord(searchDictionaryEntries(entries, "belan"), "bel-a");
	});

	test("tien → tie", () => {
		const r = searchDictionaryEntries(entries, "tien");
		expectHasWord(r, "tie");
	});

	test("kompren → kompren-i", () => {
		const r = searchDictionaryEntries(entries, "kompren");
		expectHasWord(r, "kompren-i");
	});

	test("malnova / malnovaj / Malnovajn → nov-a (mal- + plural/case)", () => {
		for (const q of ["malnova", "malnovaj", "Malnovajn"]) {
			const r = searchDictionaryEntries(entries, q);
			expectHasWord(r, "nov-a");
		}
	});
});
