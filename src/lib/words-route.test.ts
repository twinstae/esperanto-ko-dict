import { describe, expect, test } from "bun:test";
import { parseLemmaFromPath, wordsPageHref } from "./words-route";

describe("parseLemmaFromPath", () => {
	test("parses lemma after /words/", () => {
		expect(parseLemmaFromPath("/words/Kate%C4%A5ismo", "/")).toBe("Kateĥismo");
	});

	test("returns null for /words only", () => {
		expect(parseLemmaFromPath("/words", "/")).toBeNull();
		expect(parseLemmaFromPath("/words/", "/")).toBeNull();
	});

	test("respects base path", () => {
		expect(parseLemmaFromPath("/app/words/saluton", "/app/")).toBe("saluton");
		expect(parseLemmaFromPath("/words/saluton", "/app/")).toBeNull();
	});
});

describe("wordsPageHref + parseLemmaFromPath", () => {
	test("round-trip for encoded lemma", () => {
		const base = "/";
		const lemma = "Kaĵo";
		const href = wordsPageHref(lemma, base);
		const path = new URL(href, "http://localhost").pathname;
		expect(parseLemmaFromPath(path, base)).toBe(lemma);
	});

	test("invalid percent-encoding falls back to raw segment", () => {
		const raw = parseLemmaFromPath("/words/%E0%A4%A", "/");
		expect(raw).toBe("%E0%A4%A");
	});
});
