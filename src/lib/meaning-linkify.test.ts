import { describe, expect, test } from "bun:test";
import type { DictBundle } from "./dict-types";
import {
	buildCanonicalHeadwordMap,
	buildEllipsisHeadwords,
	matchHeadwordAt,
} from "./meaning-linkify";

const bundle: DictBundle = await Bun.file(
	new URL("../../public/data/eo-ko.json", import.meta.url),
).json();

const entries = bundle.entries;
const canonicalByNorm = buildCanonicalHeadwordMap(entries);
const ellipsisHeadwords = buildEllipsisHeadwords(entries);

describe("matchHeadwordAt (kompendi-o gloss)", () => {
	const gloss =
		"간추린 것, 요약, 개략, 적요, 대요, 개론. en ～o 요약하면. ☞ kateĥismo, resumo.";

	test("links kateĥismo to ellipsis headword kateĥ…", () => {
		const i = gloss.indexOf("kateĥismo");
		expect(i).toBeGreaterThanOrEqual(0);
		const m = matchHeadwordAt(gloss, i, canonicalByNorm, ellipsisHeadwords);
		expect(m).not.toBeNull();
		expect(m?.canonical).toBe("kateĥ…");
		expect(m?.length).toBe("kateĥismo".length);
	});

	test("links resumo to BRO lemma resum-i", () => {
		const i = gloss.indexOf("resumo");
		expect(i).toBeGreaterThanOrEqual(0);
		const m = matchHeadwordAt(gloss, i, canonicalByNorm, ellipsisHeadwords);
		expect(m).not.toBeNull();
		expect(m?.canonical).toBe("resum-i");
		expect(m?.length).toBe("resumo".length);
	});
});

describe("buildEllipsisHeadwords", () => {
	test("includes kateĥ…", () => {
		expect(ellipsisHeadwords).toContain("kateĥ…");
	});
});

describe("matchHeadwordAt — suffix gloss after ～", () => {
	test("does not link o/a after ～ (e.g. ～o, ～a)", () => {
		const glossO = "en ～o 요약";
		const atO = glossO.indexOf("～o") + 1;
		expect(matchHeadwordAt(glossO, atO, canonicalByNorm, ellipsisHeadwords)).toBeNull();

		const glossA = "bel～a 아름다운";
		const atA = glossA.indexOf("～a") + 1;
		expect(matchHeadwordAt(glossA, atA, canonicalByNorm, ellipsisHeadwords)).toBeNull();
	});

	test("does not link after Japanese wave dash 〜 (U+301C)", () => {
		const gloss = "en \u301Co 요약";
		const atO = gloss.indexOf("\u301Co") + 1;
		expect(matchHeadwordAt(gloss, atO, canonicalByNorm, ellipsisHeadwords)).toBeNull();
	});

	test("returns null when no headword matches", () => {
		expect(matchHeadwordAt("zzzxyz", 0, new Map(), [])).toBeNull();
	});

	test("returns null when index is past end", () => {
		expect(matchHeadwordAt("a", 2, canonicalByNorm, ellipsisHeadwords)).toBeNull();
	});
});
