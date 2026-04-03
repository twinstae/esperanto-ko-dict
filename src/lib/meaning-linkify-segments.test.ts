import { describe, expect, test } from "bun:test";
import type { DictBundle } from "./dict-types";
import {
	buildCanonicalHeadwordMap,
	buildEllipsisHeadwords,
	isHeadwordChar,
	linkifyMeaningToSegments,
	type LinkifyContext,
} from "./meaning-linkify";

const bundle: DictBundle = await Bun.file(
	new URL("../../public/data/eo-ko.json", import.meta.url),
).json();

const entries = bundle.entries;
const canonicalByNorm = buildCanonicalHeadwordMap(entries);
const ellipsisHeadwords = buildEllipsisHeadwords(entries);

function ctx(): LinkifyContext {
	return { canonicalByNorm, ellipsisHeadwords };
}

describe("isHeadwordChar", () => {
	test("accepts Latin and Esperanto letters and hyphen", () => {
		expect(isHeadwordChar("a")).toBe(true);
		expect(isHeadwordChar("ĥ")).toBe(true);
		expect(isHeadwordChar("-")).toBe(true);
	});

	test("rejects multi-code-unit string", () => {
		expect(isHeadwordChar("ab")).toBe(false);
	});

	test("rejects Korean", () => {
		expect(isHeadwordChar("가")).toBe(false);
	});
});

describe("linkifyMeaningToSegments", () => {
	test("kompendi-o gloss: links and text", () => {
		const gloss =
			"간추린 것, 요약, 개략, 적요, 대요, 개론. en ～o 요약하면. ☞ kateĥismo, resumo.";
		const segs = linkifyMeaningToSegments(gloss, ctx());
		const links = segs.filter((s) => s.kind === "link");
		expect(links.some((s) => s.kind === "link" && s.canonical === "kateĥ…")).toBe(true);
		expect(links.some((s) => s.kind === "link" && s.canonical === "resum-i")).toBe(true);
	});

	test("merges adjacent text into one segment", () => {
		const segs = linkifyMeaningToSegments("안녕", ctx());
		expect(segs).toEqual([{ kind: "text", text: "안녕" }]);
	});
});
